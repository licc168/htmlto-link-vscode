import * as vscode from 'vscode'
import { selectFolder } from '../commands/selectFolder'
import {
  clearSavedToken,
  getSavedToken,
  setSavedToken,
} from '../core/config/tokenStore'
import {
  getDefaultEntryFile,
  listHtmlEntryCandidates,
} from '../core/deploy/detectEntryFile'
import {
  getDeploymentMetadata,
  getLastDeployedUrl,
} from '../core/deploy/deploymentState'
import { performDeployment } from '../core/deploy/performDeployment'
import { copyToClipboard } from '../utils/notifications'
import { openExternalUrl } from '../utils/openExternal'

type PanelState = {
  folderPath?: string
  entryFile: string
  entryCandidates: string[]
  hasSavedToken: boolean
  tokenMode: 'saved' | 'custom' | 'guest'
  previousShareUrl?: string
  previousUpdateToken?: string
  previousIsTemporary?: boolean
  previousExpiresAt?: string | null
  canReuseExistingShareUrl: boolean
  lastResultUrl?: string
  lastDeployUrl?: string
}

type DeployPayload = {
  folderPath?: string
  entryFile?: string
  tokenMode?: 'saved' | 'custom' | 'guest'
  customToken?: string
  saveToken?: boolean
  useExistingShareUrl?: boolean
}

type ToastIntent = 'info' | 'success' | 'warning' | 'error'

type PendingWebviewMessage =
  | {
      type: 'state'
      state: PanelState
    }
  | {
      type: 'toast'
      intent: ToastIntent
      text: string
    }
  | {
      type: 'setTokenMode'
      tokenMode: 'saved' | 'custom' | 'guest'
      focus?: boolean
    }
  | {
      type: 'confirmClearToken'
    }

export class HtmlToLinkPanel {
  private static currentPanel: HtmlToLinkPanel | undefined

  private readonly panel: vscode.WebviewPanel
  private readonly context: vscode.ExtensionContext
  private isReady = false
  private readonly pendingMessages: PendingWebviewMessage[] = []
  private state: PanelState = {
    entryFile: getDefaultEntryFile(),
    entryCandidates: [],
    hasSavedToken: false,
    tokenMode: 'guest',
    canReuseExistingShareUrl: false,
  }

  static async createOrShow(
    context: vscode.ExtensionContext,
    resourceUri?: vscode.Uri
  ) {
    const column = vscode.window.activeTextEditor?.viewColumn

    if (HtmlToLinkPanel.currentPanel) {
      HtmlToLinkPanel.currentPanel.panel.reveal(column)

      if (resourceUri?.fsPath) {
        await HtmlToLinkPanel.currentPanel.loadFolder(resourceUri.fsPath)
      } else {
        await HtmlToLinkPanel.currentPanel.refreshState()
      }

      return HtmlToLinkPanel.currentPanel
    }

    const panel = vscode.window.createWebviewPanel(
      'htmlToLink.panel',
      'HTML to Link',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    )

    HtmlToLinkPanel.currentPanel = new HtmlToLinkPanel(
      context,
      panel,
      resourceUri?.fsPath
    )

    return HtmlToLinkPanel.currentPanel
  }

  static async openForTokenInput(context: vscode.ExtensionContext) {
    const panel = await HtmlToLinkPanel.createOrShow(context)
    panel.setTokenMode('custom', true)
    panel.showToast('info', '请在面板中输入 Token，可直接保存到本地。')
    return panel
  }

  static async requestClearToken(context: vscode.ExtensionContext) {
    const panel = await HtmlToLinkPanel.createOrShow(context)
    panel.requestClearTokenConfirm()
    return panel
  }

  static async showToastInPanel(
    context: vscode.ExtensionContext,
    intent: ToastIntent,
    text: string
  ) {
    const panel = await HtmlToLinkPanel.createOrShow(context)
    panel.showToast(intent, text)
    return panel
  }

  private constructor(
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
    initialFolderPath?: string
  ) {
    this.context = context
    this.panel = panel
    this.panel.webview.html = this.getHtml(this.panel.webview)

    this.panel.onDidDispose(() => {
      HtmlToLinkPanel.currentPanel = undefined
    })

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'ready':
          this.isReady = true
          await this.refreshState()
          if (initialFolderPath) {
            await this.loadFolder(initialFolderPath)
          }
          this.flushPendingMessages()
          break
        case 'chooseFolder':
          await this.handleChooseFolder()
          break
        case 'deploy':
          await this.handleDeploy(message.payload as DeployPayload)
          break
        case 'copyUrl':
          if (typeof message.url === 'string' && message.url) {
            await copyToClipboard(message.url)
            this.showToast('success', '链接已复制。')
          }
          break
        case 'openUrl':
          if (typeof message.url === 'string' && message.url) {
            await openExternalUrl(message.url)
          }
          break
        case 'clearToken':
          this.requestClearTokenConfirm()
          break
        case 'clearTokenConfirmed':
          await clearSavedToken(this.context)
          await this.refreshState()
          this.showToast('success', '已清除保存的 Token。')
          break
        default:
          break
      }
    })
  }

  private async handleChooseFolder() {
    const picked = await selectFolder(
      this.state.folderPath ? vscode.Uri.file(this.state.folderPath) : undefined
    )

    if (!picked) {
      return
    }

    await this.loadFolder(picked)
  }

  private async refreshState() {
    const savedToken = await getSavedToken(this.context)

    this.state.hasSavedToken = Boolean(savedToken)
    this.state.lastDeployUrl = getLastDeployedUrl(this.context)

    if (this.state.hasSavedToken && this.state.tokenMode === 'guest') {
      this.state.tokenMode = 'saved'
    }

    if (!this.state.hasSavedToken && this.state.tokenMode === 'saved') {
      this.state.tokenMode = 'guest'
    }

    this.state.canReuseExistingShareUrl = this.canReuseExistingDeployment(
      this.state.tokenMode
    )

    this.postState()
  }

  private async loadFolder(folderPath: string) {
    const defaultEntry = getDefaultEntryFile()
    const candidates = sortEntryCandidates(
      Array.from(new Set((await listHtmlEntryCandidates(folderPath)).filter(Boolean)))
    )

    const metadata = await getDeploymentMetadata(folderPath)
    const preferredEntry =
      (metadata?.entryFile && candidates.includes(metadata.entryFile)
        ? metadata.entryFile
        : undefined) ||
      (candidates.includes(defaultEntry) ? defaultEntry : undefined) ||
      candidates[0] ||
      defaultEntry

    this.state.folderPath = folderPath
    this.state.entryCandidates = candidates
    this.state.entryFile = preferredEntry
    this.state.previousShareUrl = metadata?.shareUrl
    this.state.previousUpdateToken = metadata?.updateToken
    this.state.previousIsTemporary =
      metadata?.temporary ?? isTemporaryShareUrl(metadata?.shareUrl)
    this.state.previousExpiresAt = metadata?.expiresAt
    this.state.lastResultUrl = metadata?.shareUrl || this.state.lastResultUrl

    await this.refreshState()
  }

  private async handleDeploy(payload: DeployPayload) {
    try {
      const folderPath = payload.folderPath?.trim() || this.state.folderPath

      if (!folderPath) {
        throw new Error('请先选择要部署的文件夹。')
      }

      const entryFile = payload.entryFile?.trim() || this.state.entryFile

      if (!entryFile) {
        throw new Error('请填写入口文件。')
      }

      const tokenMode = payload.tokenMode || this.state.tokenMode
      let token: string | null = null

      if (tokenMode === 'saved') {
        token = (await getSavedToken(this.context)) || null
        if (!token) {
          throw new Error('当前没有已保存的 Token，请改为输入 Token 或游客部署。')
        }
      }

      if (tokenMode === 'custom') {
        const customToken = payload.customToken?.trim()

        if (!customToken) {
          throw new Error('请输入 Token。')
        }

        token = customToken

        if (payload.saveToken) {
          await setSavedToken(this.context, customToken)
        }
      }

      const canReuseExistingShareUrl = this.canReuseExistingDeployment(tokenMode)
      const shareUrl =
        payload.useExistingShareUrl && canReuseExistingShareUrl
          ? this.state.previousShareUrl
          : undefined
      const updateToken =
        tokenMode === 'guest' && shareUrl ? this.state.previousUpdateToken : undefined

      if (payload.useExistingShareUrl && this.state.previousShareUrl && !shareUrl) {
        this.showToast(
          'warning',
          '当前历史部署记录不满足更新条件，本次将创建一个新的链接。'
        )
      }

      const result = await performDeployment({
        context: this.context,
        folderPath,
        entryFile,
        token,
        shareUrl,
        updateToken,
      })

      if (getAutoCopyUrl()) {
        await copyToClipboard(result.shareUrl)
      }

      this.state.folderPath = folderPath
      this.state.entryFile = entryFile
      this.state.previousShareUrl = result.shareUrl
      this.state.previousUpdateToken = result.updateToken
      this.state.previousIsTemporary = result.temporary
      this.state.previousExpiresAt = result.expiresAt
      this.state.lastResultUrl = result.shareUrl

      await this.refreshState()

      this.showToast(
        'success',
        getAutoCopyUrl()
          ? `部署成功，链接已复制：${result.shareUrl}`
          : `部署成功：${result.shareUrl}`
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : '未知错误'
      this.showToast('error', `部署失败：${message}`)
    }
  }

  private postState() {
    this.postMessage({
      type: 'state',
      state: this.state,
    })
  }

  private setTokenMode(tokenMode: 'saved' | 'custom' | 'guest', focus = false) {
    this.state.tokenMode = tokenMode
    this.postState()
    this.postMessage({
      type: 'setTokenMode',
      tokenMode,
      focus,
    })
  }

  private requestClearTokenConfirm() {
    this.postMessage({
      type: 'confirmClearToken',
    })
  }

  private showToast(intent: ToastIntent, text: string) {
    this.postMessage({
      type: 'toast',
      intent,
      text,
    })
  }

  private postMessage(message: PendingWebviewMessage) {
    if (!this.isReady) {
      this.pendingMessages.push(message)
      return
    }

    this.panel.webview.postMessage(message)
  }

  private flushPendingMessages() {
    if (!this.isReady || this.pendingMessages.length === 0) {
      return
    }

    for (const message of this.pendingMessages.splice(0)) {
      this.panel.webview.postMessage(message)
    }
  }

  private canReuseExistingDeployment(tokenMode: 'saved' | 'custom' | 'guest') {
    if (!this.state.previousShareUrl) {
      return false
    }

    const previousIsTemporary =
      this.state.previousIsTemporary ??
      isTemporaryShareUrl(this.state.previousShareUrl)

    if (tokenMode === 'guest') {
      return Boolean(
        previousIsTemporary && this.state.previousUpdateToken
      )
    }

    return !previousIsTemporary
  }

  private getHtml(webview: vscode.Webview) {
    const nonce = getNonce()

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HTML to Link</title>
  <style>
    :root {
      color-scheme: light dark;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .app {
      max-width: 920px;
      margin: 0 auto;
      padding: 24px;
      display: grid;
      gap: 16px;
    }
    .hero {
      padding: 20px 22px;
      border-radius: 18px;
      background:
        radial-gradient(circle at top right, color-mix(in srgb, var(--vscode-button-background) 22%, transparent) 0, transparent 34%),
        linear-gradient(135deg, color-mix(in srgb, var(--vscode-editorWidget-background) 88%, transparent), color-mix(in srgb, var(--vscode-sideBar-background) 84%, transparent));
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.2));
      box-shadow: 0 12px 32px rgba(0,0,0,0.12);
    }
    .hero h1 {
      margin: 0 0 8px;
      font-size: 26px;
      line-height: 1.2;
    }
    .hero p {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      line-height: 1.6;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 16px;
    }
    .card {
      border-radius: 18px;
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.18));
      background: color-mix(in srgb, var(--vscode-sideBar-background) 76%, transparent);
      padding: 18px;
      box-shadow: 0 10px 24px rgba(0,0,0,0.08);
    }
    .card h2 {
      margin: 0 0 14px;
      font-size: 15px;
    }
    .muted {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.6;
    }
    .stack {
      display: grid;
      gap: 12px;
    }
    .row {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .row.wrap {
      flex-wrap: wrap;
    }
    label {
      display: grid;
      gap: 6px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    input[type="text"],
    input[type="password"],
    select {
      width: 100%;
      border: 1px solid var(--vscode-input-border, transparent);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 12px;
      min-height: 38px;
      padding: 0 12px;
      outline: none;
    }
    input[type="text"]:focus,
    input[type="password"]:focus,
    select:focus {
      border-color: var(--vscode-focusBorder);
    }
    button {
      border: 0;
      border-radius: 12px;
      min-height: 38px;
      padding: 0 14px;
      cursor: pointer;
      font-weight: 600;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
    }
    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    button.ghost {
      color: var(--vscode-foreground);
      background: transparent;
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.18));
    }
    button:hover {
      opacity: 0.96;
    }
    .grow {
      flex: 1;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      font-size: 12px;
      background: color-mix(in srgb, var(--vscode-badge-background) 82%, transparent);
      color: var(--vscode-badge-foreground);
    }
    .mode-grid {
      display: grid;
      gap: 10px;
    }
    .mode-option {
      display: grid;
      gap: 4px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.18));
      background: color-mix(in srgb, var(--vscode-editor-background) 82%, transparent);
      cursor: pointer;
    }
    .mode-option.active {
      border-color: var(--vscode-focusBorder);
      background: color-mix(in srgb, var(--vscode-button-background) 14%, var(--vscode-editor-background));
    }
    .mode-option strong {
      font-size: 13px;
    }
    .mode-option span {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.5;
    }
    .note {
      border-radius: 14px;
      padding: 12px 14px;
      font-size: 12px;
      line-height: 1.6;
      border: 1px solid color-mix(in srgb, var(--vscode-charts-yellow) 35%, transparent);
      background: color-mix(in srgb, var(--vscode-charts-yellow) 10%, transparent);
    }
    .note.info {
      border-color: color-mix(in srgb, var(--vscode-charts-blue) 35%, transparent);
      background: color-mix(in srgb, var(--vscode-charts-blue) 10%, transparent);
    }
    .checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    .checkbox input {
      margin: 0;
    }
    .inline-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      min-height: 34px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--vscode-charts-blue) 26%, var(--vscode-widget-border, rgba(127,127,127,0.18)));
      background: color-mix(in srgb, var(--vscode-charts-blue) 10%, transparent);
      color: var(--vscode-foreground);
    }
    .inline-action strong {
      font-size: 12px;
    }
    .step-list {
      margin: 0;
      padding: 0 20px 16px 20px;
      list-style: none;
      display: grid;
      gap: 10px;
    }
    .step-list li {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 12px;
      align-items: start;
    }
    .step-index {
      width: 28px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: color-mix(in srgb, var(--vscode-charts-blue) 18%, transparent);
      color: var(--vscode-foreground);
      font-size: 12px;
      font-weight: 700;
      border: 1px solid color-mix(in srgb, var(--vscode-charts-blue) 26%, transparent);
    }
    .step-copy {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    .step-copy strong {
      font-size: 13px;
      line-height: 1.4;
    }
    .step-copy span {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.6;
      word-break: break-word;
    }
    .result-link {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 10px 12px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--vscode-editor-background) 80%, transparent);
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.18));
      font-size: 12px;
    }
    .toast-viewport {
      position: fixed;
      top: 18px;
      right: 18px;
      width: min(360px, calc(100vw - 36px));
      display: grid;
      gap: 10px;
      z-index: 30;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      display: grid;
      gap: 6px;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.2));
      background: color-mix(in srgb, var(--vscode-notifications-background, var(--vscode-editorWidget-background)) 94%, transparent);
      box-shadow: 0 16px 40px rgba(0,0,0,0.28);
      transform: translateY(-6px);
      opacity: 0;
      transition: opacity 160ms ease, transform 160ms ease;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .toast-title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
    }
    .toast-text {
      font-size: 12px;
      line-height: 1.6;
      color: var(--vscode-descriptionForeground);
      word-break: break-word;
    }
    .toast.info {
      border-color: color-mix(in srgb, var(--vscode-charts-blue) 32%, transparent);
    }
    .toast.success {
      border-color: color-mix(in srgb, var(--vscode-testing-iconPassed) 36%, transparent);
    }
    .toast.warning {
      border-color: color-mix(in srgb, var(--vscode-charts-yellow) 36%, transparent);
    }
    .toast.error {
      border-color: color-mix(in srgb, var(--vscode-errorForeground) 32%, transparent);
    }
    .overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: color-mix(in srgb, var(--vscode-editor-background) 48%, rgba(0,0,0,0.5));
      backdrop-filter: blur(10px);
      z-index: 20;
    }
    .modal {
      width: min(440px, 100%);
      border-radius: 20px;
      border: 1px solid color-mix(in srgb, var(--vscode-charts-yellow) 24%, var(--vscode-widget-border, rgba(127,127,127,0.22)));
      background:
        radial-gradient(circle at top right, color-mix(in srgb, var(--vscode-charts-yellow) 16%, transparent), transparent 42%),
        linear-gradient(180deg, color-mix(in srgb, var(--vscode-editorWidget-background) 96%, transparent), color-mix(in srgb, var(--vscode-sideBar-background) 90%, transparent));
      box-shadow: 0 24px 60px rgba(0,0,0,0.34);
      overflow: hidden;
    }
    .modal.danger {
      border-color: color-mix(in srgb, var(--vscode-errorForeground) 22%, var(--vscode-widget-border, rgba(127,127,127,0.22)));
      background:
        radial-gradient(circle at top right, color-mix(in srgb, var(--vscode-errorForeground) 14%, transparent), transparent 42%),
        linear-gradient(180deg, color-mix(in srgb, var(--vscode-editorWidget-background) 96%, transparent), color-mix(in srgb, var(--vscode-sideBar-background) 90%, transparent));
    }
    .modal-head {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 20px 20px 14px;
    }
    .modal-icon {
      width: 42px;
      height: 42px;
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      font-size: 20px;
      background: color-mix(in srgb, var(--vscode-charts-yellow) 18%, transparent);
      color: var(--vscode-editorWarning-foreground, var(--vscode-charts-yellow));
      border: 1px solid color-mix(in srgb, var(--vscode-charts-yellow) 28%, transparent);
    }
    .modal-copy {
      display: grid;
      gap: 6px;
      min-width: 0;
    }
    .modal-title {
      font-size: 17px;
      font-weight: 700;
      line-height: 1.35;
    }
    .modal-text {
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      line-height: 1.7;
    }
    .modal-list {
      margin: 0;
      padding: 0 20px 16px 20px;
      list-style: none;
      display: grid;
      gap: 8px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }
    .modal-list li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .modal-list li::before {
      content: '•';
      color: var(--vscode-charts-yellow);
      line-height: 1.3;
    }
    .modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding: 16px 20px 20px;
      border-top: 1px solid color-mix(in srgb, var(--vscode-widget-border, rgba(127,127,127,0.18)) 80%, transparent);
      background: color-mix(in srgb, var(--vscode-editor-background) 24%, transparent);
    }
    .modal-actions button {
      min-width: 108px;
    }
    .button-warning {
      color: var(--vscode-button-foreground);
      background:
        linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-charts-yellow) 72%, var(--vscode-button-background)),
          var(--vscode-button-background)
        );
    }
    .button-danger {
      color: var(--vscode-button-foreground);
      background:
        linear-gradient(135deg,
          color-mix(in srgb, var(--vscode-errorForeground) 68%, var(--vscode-button-background)),
          var(--vscode-button-background)
        );
    }
    .hidden {
      display: none !important;
    }
    .footer {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      padding-bottom: 4px;
    }
    @media (max-width: 900px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .app {
        padding: 16px;
      }
    }
  </style>
</head>
<body>
  <div id="toastViewport" class="toast-viewport"></div>
  <div class="app">
    <section class="hero">
      <h1>HTML to Link</h1>
      <p>把本地静态 HTML 项目发布成可访问链接。支持游客 24 小时临时部署，也支持使用 Token 进行长期可管理部署。</p>
    </section>

    <div class="grid">
      <section class="card stack">
        <div class="row wrap" style="justify-content: space-between;">
          <h2>项目目录</h2>
          <span id="savedTokenBadge" class="badge">未保存 Token</span>
        </div>
        <label>
          选择要部署的文件夹
          <div class="row">
            <input id="folderPath" class="grow" type="text" placeholder="请选择本地静态站点目录" />
            <button id="chooseFolderBtn" type="button">选择文件夹</button>
          </div>
        </label>
        <label>
          入口文件
          <select id="entryFileSelect" class="hidden"></select>
          <input id="entryFile" type="text" placeholder="例如：index.html" />
          <div id="entryFileHint" class="muted">选择文件夹后，自动列出可部署的 HTML 文件。</div>
        </label>
        <div id="previousShareBlock" class="note info hidden"></div>
      </section>

      <section class="card stack">
        <h2>部署身份</h2>
        <div id="savedMode" class="mode-grid hidden">
          <button class="mode-option" data-mode="saved" type="button">
            <strong>使用已保存 Token</strong>
            <span>适合长期保留链接和后续更新版本</span>
          </button>
        </div>
        <div class="mode-grid">
          <button class="mode-option" data-mode="custom" type="button">
            <strong>输入新 Token</strong>
            <span>使用注册账号部署，可选择保存到本地</span>
          </button>
          <button class="mode-option" data-mode="guest" type="button">
            <strong>游客部署</strong>
            <span>无需登录，但生成的链接仅保留 24 小时</span>
          </button>
        </div>
        <div id="customTokenBlock" class="stack hidden">
          <label>
            Token
            <input id="customToken" type="password" placeholder="请输入 HTML to Link Token" />
          </label>
          <button id="howToGetTokenBtn" class="inline-action" type="button">
            <strong>获取 Token</strong>
          </button>
          <div class="muted">
            没有 Token 也可以先游客部署；如果需要长期保存链接，点击上方按钮查看获取方式。
          </div>
          <label class="checkbox">
            <input id="saveToken" type="checkbox" checked />
            <span>保存 Token，后续部署可直接复用</span>
          </label>
        </div>
        <div id="guestNote" class="note hidden">
          当前为游客部署模式，发布成功后链接仅保留 24 小时。若需要长期保存和版本更新，建议使用 Token。
        </div>
        <div class="row wrap">
          <button id="deployBtn" class="grow" type="button">开始部署</button>
          <button id="clearTokenBtn" class="secondary" type="button">清除已保存 Token</button>
        </div>
      </section>
    </div>

    <section class="card stack">
      <h2>部署选项</h2>
      <label class="checkbox">
        <input id="useExistingShareUrl" type="checkbox" />
        <span>如果检测到已有部署记录，则在原链接上创建新版本</span>
      </label>
      <div id="deployHint" class="muted">选择文件夹后，插件会自动尝试识别入口文件。</div>
    </section>

    <section class="card stack">
      <div class="row wrap" style="justify-content: space-between;">
        <h2>部署结果</h2>
        <button id="openLastUrlBtn" class="ghost hidden" type="button">打开最近链接</button>
      </div>
      <div id="resultEmpty" class="muted">部署完成后，这里会显示分享链接。</div>
      <div id="resultBlock" class="hidden stack">
        <div id="resultUrl" class="result-link"></div>
        <div class="row wrap">
          <button id="copyUrlBtn" type="button">复制链接</button>
          <button id="openUrlBtn" class="secondary" type="button">打开链接</button>
        </div>
      </div>
    </section>

    <div class="footer">支持 VS Code、Cursor、Trae 等基于 VS Code 扩展生态的编辑器。</div>
  </div>

  <div id="confirmOverlay" class="overlay hidden" aria-hidden="true">
    <div id="confirmDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
      <div class="modal-head">
        <div id="confirmIcon" class="modal-icon">!</div>
        <div class="modal-copy">
          <div id="confirmTitle" class="modal-title">确认游客部署</div>
          <div id="confirmText" class="modal-text">当前将以游客身份发布，适合快速试用，但链接只会保留 24 小时。</div>
        </div>
      </div>
      <ul id="confirmList" class="modal-list"></ul>
      <div class="modal-actions">
        <button id="confirmCancelBtn" class="ghost" type="button">取消</button>
        <button id="confirmActionBtn" class="button-warning" type="button">继续</button>
      </div>
    </div>
  </div>

  <div id="tokenHelpOverlay" class="overlay hidden" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="tokenHelpTitle">
      <div class="modal-head">
        <div class="modal-icon">?</div>
        <div class="modal-copy">
          <div id="tokenHelpTitle" class="modal-title">如何获取 Token</div>
          <div class="modal-text">
            使用 Token 部署后，链接可长期保留，也方便后续继续更新版本。
          </div>
        </div>
      </div>
      <ol class="step-list">
        <li>
          <span class="step-index">1</span>
          <div class="step-copy">
            <strong>先注册账号</strong>
            <span>打开 https://htmlto.link/ ，先完成注册或登录。</span>
          </div>
        </li>
        <li>
          <span class="step-index">2</span>
          <div class="step-copy">
            <strong>进入设置页</strong>
            <span>登录后访问 https://htmlto.link/settings 。</span>
          </div>
        </li>
        <li>
          <span class="step-index">3</span>
          <div class="step-copy">
            <strong>复制 Token 回来粘贴</strong>
            <span>在设置页找到 API Token，复制后回到插件输入即可。</span>
          </div>
        </li>
      </ol>
      <div class="modal-actions">
        <button id="tokenHelpCloseBtn" class="ghost" type="button">我知道了</button>
        <button id="openHomeBtn" class="secondary" type="button">打开首页注册</button>
        <button id="openSettingsBtn" type="button">打开设置页</button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = {
      folderPath: '',
      entryFile: '',
      entryCandidates: [],
      hasSavedToken: false,
      tokenMode: 'guest',
      previousShareUrl: '',
      previousUpdateToken: '',
      previousIsTemporary: false,
      previousExpiresAt: '',
      lastResultUrl: '',
      lastDeployUrl: '',
      canReuseExistingShareUrl: false,
      saveToken: true,
      useExistingShareUrl: true,
      customToken: ''
    };

    const folderPathInput = document.getElementById('folderPath');
    const entryFileInput = document.getElementById('entryFile');
    const entryFileSelect = document.getElementById('entryFileSelect');
    const entryFileHint = document.getElementById('entryFileHint');
    const savedTokenBadge = document.getElementById('savedTokenBadge');
    const savedMode = document.getElementById('savedMode');
    const customTokenBlock = document.getElementById('customTokenBlock');
    const customTokenInput = document.getElementById('customToken');
    const howToGetTokenBtn = document.getElementById('howToGetTokenBtn');
    const saveTokenCheckbox = document.getElementById('saveToken');
    const guestNote = document.getElementById('guestNote');
    const previousShareBlock = document.getElementById('previousShareBlock');
    const useExistingShareUrl = document.getElementById('useExistingShareUrl');
    const resultEmpty = document.getElementById('resultEmpty');
    const resultBlock = document.getElementById('resultBlock');
    const resultUrl = document.getElementById('resultUrl');
    const openLastUrlBtn = document.getElementById('openLastUrlBtn');
    const deployHint = document.getElementById('deployHint');
    const toastViewport = document.getElementById('toastViewport');
    const confirmOverlay = document.getElementById('confirmOverlay');
    const confirmDialog = document.getElementById('confirmDialog');
    const confirmIcon = document.getElementById('confirmIcon');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmText = document.getElementById('confirmText');
    const confirmList = document.getElementById('confirmList');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmActionBtn = document.getElementById('confirmActionBtn');
    const tokenHelpOverlay = document.getElementById('tokenHelpOverlay');
    const tokenHelpCloseBtn = document.getElementById('tokenHelpCloseBtn');
    const openHomeBtn = document.getElementById('openHomeBtn');
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    let confirmAction = null;

    function render() {
      const canReuseExistingShareUrl = getCanReuseExistingShareUrl();
      folderPathInput.value = state.folderPath || '';
      customTokenInput.value = state.customToken || '';
      saveTokenCheckbox.checked = Boolean(state.saveToken);
      useExistingShareUrl.checked = Boolean(state.useExistingShareUrl && state.previousShareUrl);
      useExistingShareUrl.disabled = !canReuseExistingShareUrl;

      savedTokenBadge.textContent = state.hasSavedToken ? '已保存 Token' : '未保存 Token';
      savedMode.classList.toggle('hidden', !state.hasSavedToken);
      customTokenBlock.classList.toggle('hidden', state.tokenMode !== 'custom');
      guestNote.classList.toggle('hidden', state.tokenMode !== 'guest');

      entryFileSelect.innerHTML = '';
      (state.entryCandidates || []).forEach((item) => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        option.selected = item === state.entryFile;
        entryFileSelect.appendChild(option);
      });

      const hasEntryCandidates = (state.entryCandidates || []).length > 0;
      entryFileSelect.classList.toggle('hidden', !hasEntryCandidates);
      entryFileInput.classList.toggle('hidden', hasEntryCandidates);
      entryFileInput.value = state.entryFile || '';

      if (hasEntryCandidates) {
        entryFileHint.textContent =
          '已识别 ' + state.entryCandidates.length + ' 个 HTML 文件，请选择部署入口。';
      } else {
        entryFileHint.textContent =
          '未自动识别到 HTML 文件，请手动输入相对于文件夹的入口文件路径。';
      }

      document.querySelectorAll('[data-mode]').forEach((button) => {
        const active = button.getAttribute('data-mode') === state.tokenMode;
        button.classList.toggle('active', active);
      });

      if (state.previousShareUrl) {
        previousShareBlock.classList.remove('hidden');
        if (canReuseExistingShareUrl) {
          previousShareBlock.textContent = '已检测到历史部署记录，可继续更新：' + state.previousShareUrl;
        } else if (state.previousIsTemporary) {
          previousShareBlock.textContent = '检测到旧的游客部署记录，但缺少 updateToken 或链接已不适合继续更新，本次将默认创建新链接：' + state.previousShareUrl;
        } else {
          previousShareBlock.textContent = '检测到历史部署记录，但当前身份不能直接更新这个链接：' + state.previousShareUrl;
        }
      } else {
        previousShareBlock.classList.add('hidden');
        previousShareBlock.textContent = '';
      }

      if (state.lastResultUrl) {
        resultEmpty.classList.add('hidden');
        resultBlock.classList.remove('hidden');
        resultUrl.textContent = state.lastResultUrl;
      } else {
        resultEmpty.classList.remove('hidden');
        resultBlock.classList.add('hidden');
      }

      if (state.lastDeployUrl) {
        openLastUrlBtn.classList.remove('hidden');
      } else {
        openLastUrlBtn.classList.add('hidden');
      }

      if (state.folderPath) {
        deployHint.textContent = '当前目录：' + state.folderPath;
      } else {
        deployHint.textContent = '选择文件夹后，插件会自动尝试识别入口文件。';
      }

      if (!canReuseExistingShareUrl && state.useExistingShareUrl) {
        state.useExistingShareUrl = false;
        useExistingShareUrl.checked = false;
      }
    }

    function getCanReuseExistingShareUrl() {
      if (!state.previousShareUrl) {
        return false;
      }

      if (state.tokenMode === 'guest') {
        return Boolean(state.previousIsTemporary && state.previousUpdateToken);
      }

      return !state.previousIsTemporary;
    }

    function showToast(intent, text) {
      const titleMap = {
        info: '提示',
        success: '已完成',
        warning: '请注意',
        error: '发生错误'
      };

      const toast = document.createElement('div');
      toast.className = 'toast ' + intent;
      toast.innerHTML =
        '<div class="toast-title">' + (titleMap[intent] || '提示') + '</div>' +
        '<div class="toast-text"></div>';
      toast.querySelector('.toast-text').textContent = text;
      toastViewport.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.add('show');
      });

      const removeToast = () => {
        toast.classList.remove('show');
        window.setTimeout(() => {
          toast.remove();
        }, 180);
      };

      window.setTimeout(removeToast, 3200);
      toast.addEventListener('click', removeToast);
    }

    function setConfirmVisible(visible) {
      confirmOverlay.classList.toggle('hidden', !visible);
      confirmOverlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    function setTokenHelpVisible(visible) {
      tokenHelpOverlay.classList.toggle('hidden', !visible);
      tokenHelpOverlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    function openGuestConfirm() {
      confirmAction = 'guestDeploy';
      confirmDialog.classList.remove('danger');
      confirmIcon.textContent = '!';
      confirmTitle.textContent = '确认游客部署';
      confirmText.textContent = '当前将以游客身份发布，适合快速试用，但链接只会保留 24 小时。';
      confirmList.innerHTML = '';
      [
        '部署成功后会立即返回 URL，可直接复制和打开。',
        '游客链接到期后会失效，不能长期保留版本记录。',
        '如果需要长期管理和重复更新，建议改用 Token 部署。'
      ].forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        confirmList.appendChild(li);
      });
      confirmCancelBtn.textContent = '先去填 Token';
      confirmActionBtn.textContent = '继续游客部署';
      confirmActionBtn.classList.remove('button-danger');
      confirmActionBtn.classList.add('button-warning');
      setConfirmVisible(true);
    }

    function openClearTokenConfirm() {
      confirmAction = 'clearToken';
      confirmDialog.classList.add('danger');
      confirmIcon.textContent = '×';
      confirmTitle.textContent = '确认清除 Token';
      confirmText.textContent = '这会删除当前编辑器里保存的 HTML to Link Token，之后将不能直接复用登录身份部署。';
      confirmList.innerHTML = '';
      [
        '清除后不会影响已经生成的链接。',
        '后续仍可重新输入 Token 并再次保存。',
        '如果你只是想临时试用，可以直接切换到游客部署。'
      ].forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        confirmList.appendChild(li);
      });
      confirmCancelBtn.textContent = '取消';
      confirmActionBtn.textContent = '确认清除';
      confirmActionBtn.classList.remove('button-warning');
      confirmActionBtn.classList.add('button-danger');
      setConfirmVisible(true);
    }

    function submitDeploy() {
      vscode.postMessage({
        type: 'deploy',
        payload: {
          folderPath: state.folderPath,
          entryFile: state.entryFile,
          tokenMode: state.tokenMode,
          customToken: state.customToken,
          saveToken: state.saveToken,
          useExistingShareUrl: state.useExistingShareUrl
        }
      });
    }

    document.getElementById('chooseFolderBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'chooseFolder' });
    });

    document.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        state.tokenMode = button.getAttribute('data-mode');
        render();
      });
    });

    folderPathInput.addEventListener('input', (event) => {
      state.folderPath = event.target.value;
    });

    entryFileInput.addEventListener('input', (event) => {
      state.entryFile = event.target.value;
    });

    entryFileSelect.addEventListener('change', (event) => {
      state.entryFile = event.target.value;
    });

    customTokenInput.addEventListener('input', (event) => {
      state.customToken = event.target.value;
    });

    howToGetTokenBtn.addEventListener('click', () => {
      setTokenHelpVisible(true);
    });

    saveTokenCheckbox.addEventListener('change', (event) => {
      state.saveToken = event.target.checked;
    });

    useExistingShareUrl.addEventListener('change', (event) => {
      state.useExistingShareUrl = event.target.checked;
    });

    document.getElementById('deployBtn').addEventListener('click', () => {
      if (state.tokenMode === 'guest') {
        openGuestConfirm();
        return;
      }

      submitDeploy();
    });

    confirmCancelBtn.addEventListener('click', () => {
      setConfirmVisible(false);
    });

    confirmActionBtn.addEventListener('click', () => {
      const action = confirmAction;
      setConfirmVisible(false);

      if (action === 'guestDeploy') {
        submitDeploy();
        return;
      }

      if (action === 'clearToken') {
        vscode.postMessage({ type: 'clearTokenConfirmed' });
      }
    });

    confirmOverlay.addEventListener('click', (event) => {
      if (event.target === confirmOverlay) {
        setConfirmVisible(false);
      }
    });

    tokenHelpCloseBtn.addEventListener('click', () => {
      setTokenHelpVisible(false);
    });

    openHomeBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'openUrl', url: 'https://htmlto.link/' });
    });

    openSettingsBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'openUrl', url: 'https://htmlto.link/settings' });
    });

    tokenHelpOverlay.addEventListener('click', (event) => {
      if (event.target === tokenHelpOverlay) {
        setTokenHelpVisible(false);
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (!confirmOverlay.classList.contains('hidden')) {
          setConfirmVisible(false);
          return;
        }

        if (!tokenHelpOverlay.classList.contains('hidden')) {
          setTokenHelpVisible(false);
        }
      }
    });

    document.getElementById('clearTokenBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'clearToken' });
    });

    document.getElementById('copyUrlBtn').addEventListener('click', () => {
      const url = state.lastResultUrl || state.lastDeployUrl;
      if (url) {
        vscode.postMessage({ type: 'copyUrl', url });
      }
    });

    document.getElementById('openUrlBtn').addEventListener('click', () => {
      const url = state.lastResultUrl || state.lastDeployUrl;
      if (url) {
        vscode.postMessage({ type: 'openUrl', url });
      }
    });

    openLastUrlBtn.addEventListener('click', () => {
      const url = state.lastDeployUrl || state.lastResultUrl;
      if (url) {
        vscode.postMessage({ type: 'openUrl', url });
      }
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'state' && message.state) {
        Object.assign(state, message.state);
        render();
        return;
      }

      if (message.type === 'toast' && message.text) {
        showToast(message.intent || 'info', message.text);
        return;
      }

      if (message.type === 'setTokenMode' && message.tokenMode) {
        state.tokenMode = message.tokenMode;
        render();
        if (message.focus) {
          window.setTimeout(() => {
            customTokenInput.focus();
            customTokenInput.select();
          }, 30);
        }
        return;
      }

      if (message.type === 'confirmClearToken') {
        openClearTokenConfirm();
      }
    });

    render();
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`
  }
}

function getAutoCopyUrl() {
  return vscode.workspace
    .getConfiguration('htmlToLink')
    .get<boolean>('autoCopyUrl', true)
}

function sortEntryCandidates(candidates: string[]) {
  return [...candidates].sort((left, right) => {
    const leftDepth = left.split('/').length
    const rightDepth = right.split('/').length

    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth
    }

    return left.localeCompare(right, 'zh-CN')
  })
}

function isTemporaryShareUrl(shareUrl?: string) {
  if (!shareUrl) {
    return false
  }

  try {
    const url = new URL(shareUrl)
    return /^\/temp_[^/]+\/?$/.test(url.pathname)
  } catch {
    return /\/temp_[^/]+\/?$/.test(shareUrl)
  }
}

function getNonce() {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let value = ''

  for (let index = 0; index < 32; index += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return value
}
