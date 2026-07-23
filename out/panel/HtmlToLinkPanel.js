"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtmlToLinkPanel = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const selectFolder_1 = require("../commands/selectFolder");
const tokenStore_1 = require("../core/config/tokenStore");
const detectEntryFile_1 = require("../core/deploy/detectEntryFile");
const deploymentState_1 = require("../core/deploy/deploymentState");
const performDeployment_1 = require("../core/deploy/performDeployment");
const notifications_1 = require("../utils/notifications");
const openExternal_1 = require("../utils/openExternal");
const i18n_1 = require("./i18n");
const sidebarStateEvents_1 = require("./sidebarStateEvents");
class HtmlToLinkPanel {
    static currentPanel;
    panel;
    context;
    locale;
    isReady = false;
    pendingMessages = [];
    state;
    static async createOrShow(context, resourceUri) {
        const locale = await (0, i18n_1.getPreferredUiLocale)(context);
        const column = vscode.window.activeTextEditor?.viewColumn;
        // 右键指定路径优先；否则自动识别工作区根目录 / 上次使用目录
        const initialFolderPath = resourceUri
            ? await resolveFolderFromUri(resourceUri)
            : await (0, deploymentState_1.resolveDefaultFolderPath)(context);
        if (HtmlToLinkPanel.currentPanel) {
            await HtmlToLinkPanel.currentPanel.applyLocale(locale);
            HtmlToLinkPanel.currentPanel.panel.reveal(column);
            if (resourceUri && initialFolderPath) {
                // 从资源管理器显式打开时，始终切换到指定目录
                await HtmlToLinkPanel.currentPanel.loadFolder(initialFolderPath);
            }
            else if (!HtmlToLinkPanel.currentPanel.state.folderPath &&
                initialFolderPath) {
                // 面板已打开但尚未选择目录时，自动填入默认根目录
                await HtmlToLinkPanel.currentPanel.loadFolder(initialFolderPath);
            }
            else {
                await HtmlToLinkPanel.currentPanel.refreshState();
            }
            return HtmlToLinkPanel.currentPanel;
        }
        const panel = vscode.window.createWebviewPanel('htmlToLink.panel', i18n_1.messages[locale].panel.panelTitle, column ?? vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        HtmlToLinkPanel.currentPanel = new HtmlToLinkPanel(context, panel, locale, initialFolderPath);
        return HtmlToLinkPanel.currentPanel;
    }
    static async openForTokenInput(context) {
        const panel = await HtmlToLinkPanel.createOrShow(context);
        panel.setTokenMode('custom', true);
        panel.showToast('info', panel.copy.toastPromptEnterToken);
        return panel;
    }
    static async requestClearToken(context) {
        const panel = await HtmlToLinkPanel.createOrShow(context);
        panel.requestClearTokenConfirm();
        return panel;
    }
    static async showToastInPanel(context, intent, text) {
        const panel = await HtmlToLinkPanel.createOrShow(context);
        panel.showToast(intent, text);
        return panel;
    }
    constructor(context, panel, locale, initialFolderPath) {
        this.context = context;
        this.panel = panel;
        this.locale = locale;
        this.state = {
            uiLocale: locale,
            entryFile: (0, detectEntryFile_1.getDefaultEntryFile)(),
            entryCandidates: [],
            hasSavedToken: false,
            tokenMode: 'guest',
            canReuseExistingShareUrl: false,
        };
        this.panel.webview.html = this.getHtml(this.panel.webview);
        this.context.subscriptions.push((0, sidebarStateEvents_1.onSidebarStateChanged)(() => {
            void this.syncLocaleFromPreference();
        }));
        this.panel.onDidDispose(() => {
            HtmlToLinkPanel.currentPanel = undefined;
        });
        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'ready':
                    this.isReady = true;
                    await this.refreshState();
                    if (initialFolderPath) {
                        await this.loadFolder(initialFolderPath);
                    }
                    this.flushPendingMessages();
                    break;
                case 'setLocale':
                    if ((0, i18n_1.isUiLocale)(message.locale)) {
                        await this.applyLocale(message.locale, true);
                    }
                    break;
                case 'chooseFolder':
                    await this.handleChooseFolder();
                    break;
                case 'deploy':
                    await this.handleDeploy(message.payload);
                    break;
                case 'copyUrl':
                    if (typeof message.url === 'string' && message.url) {
                        await (0, notifications_1.copyToClipboard)(message.url);
                        this.showToast('success', this.copy.toastCopied);
                    }
                    break;
                case 'openUrl':
                    if (typeof message.url === 'string' && message.url) {
                        await (0, openExternal_1.openExternalUrl)(message.url);
                    }
                    break;
                case 'clearToken':
                    this.requestClearTokenConfirm();
                    break;
                case 'clearTokenConfirmed':
                    await (0, tokenStore_1.clearSavedToken)(this.context);
                    await this.refreshState();
                    this.showToast('success', this.copy.toastClearedToken);
                    break;
                default:
                    break;
            }
        });
    }
    get copy() {
        return i18n_1.messages[this.locale].panel;
    }
    async syncLocaleFromPreference() {
        const preferredLocale = await (0, i18n_1.getPreferredUiLocale)(this.context);
        if (preferredLocale !== this.locale) {
            this.locale = preferredLocale;
            this.panel.title = this.copy.panelTitle;
            this.state.uiLocale = this.locale;
            this.postState();
        }
    }
    async applyLocale(locale, persist = false) {
        this.locale = locale;
        this.panel.title = this.copy.panelTitle;
        this.state.uiLocale = locale;
        if (persist) {
            await (0, i18n_1.setPreferredUiLocale)(this.context, locale);
            (0, sidebarStateEvents_1.notifySidebarStateChanged)();
        }
        await this.refreshState();
    }
    async handleChooseFolder() {
        const defaultPath = this.state.folderPath ||
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const picked = await (0, selectFolder_1.selectFolder)(defaultPath ? vscode.Uri.file(defaultPath) : undefined);
        if (!picked) {
            return;
        }
        await this.loadFolder(picked);
    }
    async refreshState() {
        const savedToken = await (0, tokenStore_1.getSavedToken)(this.context);
        this.state.uiLocale = this.locale;
        this.state.hasSavedToken = Boolean(savedToken);
        this.state.lastDeployUrl = (0, deploymentState_1.getLastDeployedUrl)(this.context);
        if (this.state.hasSavedToken && this.state.tokenMode === 'guest') {
            this.state.tokenMode = 'saved';
        }
        if (!this.state.hasSavedToken && this.state.tokenMode === 'saved') {
            this.state.tokenMode = 'guest';
        }
        this.state.canReuseExistingShareUrl = this.canReuseExistingDeployment(this.state.tokenMode);
        this.postState();
        (0, sidebarStateEvents_1.notifySidebarStateChanged)();
    }
    async loadFolder(folderPath) {
        const defaultEntry = (0, detectEntryFile_1.getDefaultEntryFile)();
        const candidates = sortEntryCandidates(Array.from(new Set((await (0, detectEntryFile_1.listHtmlEntryCandidates)(folderPath)).filter(Boolean))));
        const metadata = await (0, deploymentState_1.getDeploymentMetadata)(folderPath);
        const preferredEntry = (metadata?.entryFile && candidates.includes(metadata.entryFile)
            ? metadata.entryFile
            : undefined) ||
            (candidates.includes(defaultEntry) ? defaultEntry : undefined) ||
            candidates[0] ||
            defaultEntry;
        this.state.folderPath = folderPath;
        this.state.entryCandidates = candidates;
        this.state.entryFile = preferredEntry;
        this.state.previousShareUrl = metadata?.shareUrl;
        this.state.previousUpdateToken = metadata?.updateToken;
        this.state.previousIsTemporary =
            metadata?.temporary ?? isTemporaryShareUrl(metadata?.shareUrl);
        this.state.previousExpiresAt = metadata?.expiresAt;
        this.state.lastResultUrl = metadata?.shareUrl || this.state.lastResultUrl;
        await (0, deploymentState_1.setLastUsedFolder)(this.context, folderPath);
        await this.refreshState();
    }
    async handleDeploy(payload) {
        try {
            const folderPath = payload.folderPath?.trim() || this.state.folderPath;
            if (!folderPath) {
                throw new Error(this.copy.errorChooseFolder);
            }
            const entryFile = payload.entryFile?.trim() || this.state.entryFile;
            if (!entryFile) {
                throw new Error(this.copy.errorEntryRequired);
            }
            const tokenMode = payload.tokenMode || this.state.tokenMode;
            let token = null;
            if (tokenMode === 'saved') {
                token = (await (0, tokenStore_1.getSavedToken)(this.context)) || null;
                if (!token) {
                    throw new Error(this.copy.errorSavedTokenMissing);
                }
            }
            if (tokenMode === 'custom') {
                const customToken = payload.customToken?.trim();
                if (!customToken) {
                    throw new Error(this.copy.errorCustomTokenRequired);
                }
                token = customToken;
                if (payload.saveToken) {
                    await (0, tokenStore_1.setSavedToken)(this.context, customToken);
                }
            }
            const canReuseExistingShareUrl = this.canReuseExistingDeployment(tokenMode);
            const shareUrl = payload.useExistingShareUrl && canReuseExistingShareUrl
                ? this.state.previousShareUrl
                : undefined;
            const updateToken = tokenMode === 'guest' && shareUrl ? this.state.previousUpdateToken : undefined;
            if (payload.useExistingShareUrl && this.state.previousShareUrl && !shareUrl) {
                this.showToast('warning', this.copy.toastReuseUnavailable);
            }
            const progressKeyMap = {
                collecting: 'deployProgressCollecting',
                zipping: 'deployProgressZipping',
                uploading: 'deployProgressUploading',
                saving: 'deployProgressSaving',
            };
            this.postMessage({ type: 'deployStart', label: this.copy.deploying });
            const result = await (0, performDeployment_1.performDeployment)({
                context: this.context,
                folderPath,
                entryFile,
                token,
                shareUrl,
                updateToken,
                onProgress: (step) => {
                    const key = progressKeyMap[step];
                    const label = key ? String(this.copy[key]) : this.copy.deploying;
                    this.postMessage({ type: 'deployProgress', label });
                },
                onRetry: (attempt, max) => {
                    this.postMessage({
                        type: 'deployProgress',
                        label: (0, i18n_1.formatMessage)(this.copy.deployProgressRetrying, {
                            attempt,
                            max,
                        }),
                    });
                },
            });
            if (getAutoCopyUrl()) {
                await (0, notifications_1.copyToClipboard)(result.shareUrl);
            }
            await (0, deploymentState_1.setLastUsedFolder)(this.context, folderPath);
            this.state.folderPath = folderPath;
            this.state.entryFile = entryFile;
            this.state.previousShareUrl = result.shareUrl;
            this.state.previousUpdateToken = result.updateToken;
            this.state.previousIsTemporary = result.temporary;
            this.state.previousExpiresAt = result.expiresAt;
            this.state.lastResultUrl = result.shareUrl;
            await this.refreshState();
            this.showToast('success', (0, i18n_1.formatMessage)(getAutoCopyUrl()
                ? this.copy.toastDeploySuccessCopied
                : this.copy.toastDeploySuccess, { url: result.shareUrl }));
        }
        catch (error) {
            const message = error instanceof Error
                ? error.message
                : typeof error === 'string'
                    ? error
                    : this.copy.unknownError;
            this.showToast('error', (0, i18n_1.formatMessage)(this.copy.errorDeployFailed, { message }));
        }
        finally {
            this.postMessage({ type: 'deployEnd', label: this.copy.deploy });
        }
    }
    postState() {
        this.postMessage({
            type: 'state',
            state: this.state,
        });
    }
    setTokenMode(tokenMode, focus = false) {
        this.state.tokenMode = tokenMode;
        this.postState();
        this.postMessage({
            type: 'setTokenMode',
            tokenMode,
            focus,
        });
    }
    requestClearTokenConfirm() {
        this.postMessage({
            type: 'confirmClearToken',
        });
    }
    showToast(intent, text) {
        this.postMessage({
            type: 'toast',
            intent,
            text,
        });
    }
    postMessage(message) {
        if (!this.isReady) {
            this.pendingMessages.push(message);
            return;
        }
        this.panel.webview.postMessage(message);
    }
    flushPendingMessages() {
        if (!this.isReady || this.pendingMessages.length === 0) {
            return;
        }
        for (const message of this.pendingMessages.splice(0)) {
            this.panel.webview.postMessage(message);
        }
    }
    canReuseExistingDeployment(tokenMode) {
        if (!this.state.previousShareUrl) {
            return false;
        }
        const previousIsTemporary = this.state.previousIsTemporary ??
            isTemporaryShareUrl(this.state.previousShareUrl);
        if (tokenMode === 'guest') {
            return Boolean(previousIsTemporary && this.state.previousUpdateToken);
        }
        return !previousIsTemporary;
    }
    getHtml(webview) {
        const nonce = getNonce();
        const localizedMessages = JSON.stringify(i18n_1.messages);
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.copy.panelTitle}</title>
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
      display: grid;
      gap: 16px;
    }
    .hero-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .hero-copy h1 {
      margin: 0 0 8px;
      font-size: 26px;
      line-height: 1.2;
    }
    .hero-copy p {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      line-height: 1.6;
    }
    .locale-box {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 6px;
      border-radius: 999px;
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.18));
      background: color-mix(in srgb, var(--vscode-editor-background) 76%, transparent);
    }
    .locale-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      padding-left: 8px;
    }
    .locale-switch {
      display: inline-flex;
      gap: 6px;
    }
    .locale-switch button {
      min-height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      background: transparent;
      color: var(--vscode-descriptionForeground);
    }
    .locale-switch button.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
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
    .field {
      display: grid;
      gap: 6px;
    }
    .field-label {
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
    .deploying {
      opacity: 0.75;
      cursor: not-allowed;
      pointer-events: none;
      position: relative;
      padding-left: 32px;
    }
    .deploying::before {
      content: '';
      position: absolute;
      left: 12px;
      top: 50%;
      width: 14px;
      height: 14px;
      margin-top: -7px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
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
      color: var(--vscode-foreground);
      cursor: pointer;
    }
    .mode-option.active {
      border-color: var(--vscode-focusBorder);
      background: color-mix(in srgb, var(--vscode-button-background) 14%, var(--vscode-editor-background));
    }
    .mode-option strong {
      font-size: 13px;
      color: var(--vscode-foreground);
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
      .hero-top {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  </style>
</head>
<body>
  <div id="toastViewport" class="toast-viewport"></div>
  <div class="app">
    <section class="hero">
      <div class="hero-top">
        <div class="hero-copy">
          <h1 id="heroTitle"></h1>
          <p id="heroDescription"></p>
        </div>
        <div class="locale-box">
          <span id="localeLabel" class="locale-label"></span>
          <div class="locale-switch">
            <button id="localeZhBtn" type="button">中文</button>
            <button id="localeEnBtn" type="button">EN</button>
          </div>
        </div>
      </div>
    </section>

    <div class="grid">
      <section class="card stack">
        <div class="row wrap" style="justify-content: space-between;">
          <h2 id="folderSectionTitle"></h2>
          <span id="savedTokenBadge" class="badge"></span>
        </div>
        <div class="field">
          <div id="folderLabel" class="field-label"></div>
          <div class="row">
            <input id="folderPath" class="grow" type="text" />
            <button id="chooseFolderBtn" type="button"></button>
          </div>
        </div>
        <div class="field">
          <div id="entryFileLabel" class="field-label"></div>
          <select id="entryFileSelect" class="hidden"></select>
          <input id="entryFile" type="text" />
          <div id="entryFileHint" class="muted"></div>
        </div>
        <div id="previousShareBlock" class="note info hidden"></div>
      </section>

      <section class="card stack">
        <h2 id="identitySectionTitle"></h2>
        <div id="savedMode" class="mode-grid hidden">
          <button class="mode-option" data-mode="saved" type="button">
            <strong id="savedModeTitle"></strong>
            <span id="savedModeDesc"></span>
          </button>
        </div>
        <div class="mode-grid">
          <button class="mode-option" data-mode="custom" type="button">
            <strong id="customModeTitle"></strong>
            <span id="customModeDesc"></span>
          </button>
          <button class="mode-option" data-mode="guest" type="button">
            <strong id="guestModeTitle"></strong>
            <span id="guestModeDesc"></span>
          </button>
        </div>
        <div id="customTokenBlock" class="stack hidden">
          <div class="field">
            <div id="tokenLabel" class="field-label"></div>
            <input id="customToken" type="password" />
          </div>
          <button id="howToGetTokenBtn" class="inline-action" type="button">
            <strong id="howToGetTokenText"></strong>
          </button>
          <div id="customTokenHint" class="muted"></div>
          <label class="checkbox">
            <input id="saveToken" type="checkbox" checked />
            <span id="saveTokenLabel"></span>
          </label>
        </div>
        <div id="guestNote" class="note hidden"></div>
        <div class="row wrap">
          <button id="deployBtn" class="grow" type="button"></button>
          <button id="clearTokenBtn" class="secondary" type="button"></button>
        </div>
      </section>
    </div>

    <section class="card stack">
      <h2 id="deployOptionsTitle"></h2>
      <label class="checkbox">
        <input id="useExistingShareUrl" type="checkbox" />
        <span id="reuseExistingShareUrlLabel"></span>
      </label>
      <div id="deployHint" class="muted"></div>
    </section>

    <section class="card stack">
      <div class="row wrap" style="justify-content: space-between;">
        <h2 id="resultSectionTitle"></h2>
        <button id="openLastUrlBtn" class="ghost hidden" type="button"></button>
      </div>
      <div id="resultEmpty" class="muted"></div>
      <div id="resultBlock" class="hidden stack">
        <div id="resultUrl" class="result-link"></div>
        <div class="row wrap">
          <button id="copyUrlBtn" type="button"></button>
          <button id="openUrlBtn" class="secondary" type="button"></button>
        </div>
      </div>
    </section>

    <div id="footerText" class="footer"></div>
  </div>

  <div id="confirmOverlay" class="overlay hidden" aria-hidden="true">
    <div id="confirmDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
      <div class="modal-head">
        <div id="confirmIcon" class="modal-icon">!</div>
        <div class="modal-copy">
          <div id="confirmTitle" class="modal-title"></div>
          <div id="confirmText" class="modal-text"></div>
        </div>
      </div>
      <ul id="confirmList" class="modal-list"></ul>
      <div class="modal-actions">
        <button id="confirmCancelBtn" class="ghost" type="button"></button>
        <button id="confirmActionBtn" class="button-warning" type="button"></button>
      </div>
    </div>
  </div>

  <div id="tokenHelpOverlay" class="overlay hidden" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="tokenHelpTitle">
      <div class="modal-head">
        <div class="modal-icon">?</div>
        <div class="modal-copy">
          <div id="tokenHelpTitle" class="modal-title"></div>
          <div id="tokenHelpText" class="modal-text"></div>
        </div>
      </div>
      <ol id="tokenHelpList" class="step-list"></ol>
      <div class="modal-actions">
        <button id="tokenHelpCloseBtn" class="ghost" type="button"></button>
        <button id="openHomeBtn" class="secondary" type="button"></button>
        <button id="openSettingsBtn" type="button"></button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const localizedMessages = ${localizedMessages};
    const state = {
      uiLocale: 'zh-CN',
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
      customToken: '',
      isDeploying: false,
      deployLabel: ''
    };

    const heroTitle = document.getElementById('heroTitle');
    const heroDescription = document.getElementById('heroDescription');
    const localeLabel = document.getElementById('localeLabel');
    const localeZhBtn = document.getElementById('localeZhBtn');
    const localeEnBtn = document.getElementById('localeEnBtn');
    const folderSectionTitle = document.getElementById('folderSectionTitle');
    const savedTokenBadge = document.getElementById('savedTokenBadge');
    const folderLabel = document.getElementById('folderLabel');
    const folderPathInput = document.getElementById('folderPath');
    const chooseFolderBtn = document.getElementById('chooseFolderBtn');
    const entryFileLabel = document.getElementById('entryFileLabel');
    const entryFileInput = document.getElementById('entryFile');
    const entryFileSelect = document.getElementById('entryFileSelect');
    const entryFileHint = document.getElementById('entryFileHint');
    const previousShareBlock = document.getElementById('previousShareBlock');
    const identitySectionTitle = document.getElementById('identitySectionTitle');
    const savedMode = document.getElementById('savedMode');
    const customTokenBlock = document.getElementById('customTokenBlock');
    const customTokenInput = document.getElementById('customToken');
    const howToGetTokenBtn = document.getElementById('howToGetTokenBtn');
    const howToGetTokenText = document.getElementById('howToGetTokenText');
    const saveTokenCheckbox = document.getElementById('saveToken');
    const saveTokenLabel = document.getElementById('saveTokenLabel');
    const guestNote = document.getElementById('guestNote');
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
    const tokenHelpTitle = document.getElementById('tokenHelpTitle');
    const tokenHelpText = document.getElementById('tokenHelpText');
    const tokenHelpList = document.getElementById('tokenHelpList');
    const tokenHelpCloseBtn = document.getElementById('tokenHelpCloseBtn');
    const openHomeBtn = document.getElementById('openHomeBtn');
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const deployBtn = document.getElementById('deployBtn');
    const clearTokenBtn = document.getElementById('clearTokenBtn');
    const deployOptionsTitle = document.getElementById('deployOptionsTitle');
    const reuseExistingShareUrlLabel = document.getElementById('reuseExistingShareUrlLabel');
    const resultSectionTitle = document.getElementById('resultSectionTitle');
    const copyUrlBtn = document.getElementById('copyUrlBtn');
    const openUrlBtn = document.getElementById('openUrlBtn');
    const footerText = document.getElementById('footerText');
    const savedModeTitle = document.getElementById('savedModeTitle');
    const savedModeDesc = document.getElementById('savedModeDesc');
    const customModeTitle = document.getElementById('customModeTitle');
    const customModeDesc = document.getElementById('customModeDesc');
    const guestModeTitle = document.getElementById('guestModeTitle');
    const guestModeDesc = document.getElementById('guestModeDesc');
    const tokenLabel = document.getElementById('tokenLabel');
    const customTokenHint = document.getElementById('customTokenHint');
    let confirmAction = null;

    function copy() {
      return localizedMessages[state.uiLocale].panel;
    }

    function format(template, values) {
      return Object.entries(values).reduce((result, [key, value]) => {
        return result.replace(new RegExp('\\\\{' + key + '\\\\}', 'g'), String(value));
      }, template);
    }

    function renderModeOptions(currentCopy) {
      savedModeTitle.textContent = currentCopy.savedModeTitle;
      savedModeDesc.textContent = currentCopy.savedModeDesc;
      customModeTitle.textContent = currentCopy.customModeTitle;
      customModeDesc.textContent = currentCopy.customModeDesc;
      guestModeTitle.textContent = currentCopy.guestModeTitle;
      guestModeDesc.textContent = currentCopy.guestModeDesc;
    }

    function renderTokenHelp(currentCopy) {
      tokenHelpTitle.textContent = currentCopy.tokenHelpTitle;
      tokenHelpText.textContent = currentCopy.tokenHelpText;
      tokenHelpList.innerHTML = '';
      currentCopy.tokenHelpSteps.forEach((step, index) => {
        const li = document.createElement('li');
        li.innerHTML =
          '<span class="step-index">' + (index + 1) + '</span>' +
          '<div class="step-copy">' +
          '<strong></strong>' +
          '<span></span>' +
          '</div>';
        li.querySelector('strong').textContent = step.title;
        li.querySelector('span:last-child').textContent = step.text;
        tokenHelpList.appendChild(li);
      });
      tokenHelpCloseBtn.textContent = currentCopy.tokenHelpClose;
      openHomeBtn.textContent = currentCopy.tokenHelpOpenHome;
      openSettingsBtn.textContent = currentCopy.tokenHelpOpenSettings;
    }

    function render() {
      const currentCopy = copy();
      document.documentElement.lang = state.uiLocale === 'zh-CN' ? 'zh-CN' : 'en';

      heroTitle.textContent = currentCopy.heroTitle;
      heroDescription.textContent = currentCopy.heroDescription;
      localeLabel.textContent = currentCopy.languageSwitcherLabel;
      localeZhBtn.classList.toggle('active', state.uiLocale === 'zh-CN');
      localeEnBtn.classList.toggle('active', state.uiLocale === 'en');

      folderSectionTitle.textContent = currentCopy.folderSectionTitle;
      savedTokenBadge.textContent = state.hasSavedToken ? currentCopy.savedTokenBadge : currentCopy.emptyTokenBadge;
      folderLabel.textContent = currentCopy.folderLabel;
      folderPathInput.placeholder = currentCopy.folderPlaceholder;
      chooseFolderBtn.textContent = currentCopy.chooseFolder;
      entryFileLabel.textContent = currentCopy.entryFileLabel;
      entryFileInput.placeholder = currentCopy.entryFilePlaceholder;
      identitySectionTitle.textContent = currentCopy.identitySectionTitle;
      tokenLabel.textContent = currentCopy.tokenLabel;
      customTokenInput.placeholder = currentCopy.tokenPlaceholder;
      howToGetTokenText.textContent = currentCopy.howToGetToken;
      customTokenHint.textContent = currentCopy.customTokenHint;
      saveTokenLabel.textContent = currentCopy.saveTokenLabel;
      guestNote.textContent = currentCopy.guestNote;
      if (state.isDeploying) {
        deployBtn.textContent = state.deployLabel || currentCopy.deploying;
        deployBtn.classList.add('deploying');
        deployBtn.disabled = true;
      } else {
        deployBtn.textContent = currentCopy.deploy;
        deployBtn.classList.remove('deploying');
        deployBtn.disabled = false;
      }
      clearTokenBtn.textContent = currentCopy.clearSavedToken;
      deployOptionsTitle.textContent = currentCopy.deployOptionsTitle;
      reuseExistingShareUrlLabel.textContent = currentCopy.reuseExistingDeployment;
      resultSectionTitle.textContent = currentCopy.resultSectionTitle;
      openLastUrlBtn.textContent = currentCopy.openLastLink;
      resultEmpty.textContent = currentCopy.resultEmpty;
      copyUrlBtn.textContent = currentCopy.copyLink;
      openUrlBtn.textContent = currentCopy.openLink;
      footerText.textContent = currentCopy.footer;

      renderModeOptions(currentCopy);
      renderTokenHelp(currentCopy);

      const canReuseExistingShareUrl = getCanReuseExistingShareUrl();
      folderPathInput.value = state.folderPath || '';
      customTokenInput.value = state.customToken || '';
      saveTokenCheckbox.checked = Boolean(state.saveToken);
      useExistingShareUrl.checked = Boolean(state.useExistingShareUrl && state.previousShareUrl);
      useExistingShareUrl.disabled = !canReuseExistingShareUrl;

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
        entryFileHint.textContent = format(currentCopy.entryCandidatesHint, {
          count: state.entryCandidates.length,
        });
      } else {
        entryFileHint.textContent = currentCopy.entryManualHint;
      }

      document.querySelectorAll('[data-mode]').forEach((button) => {
        const active = button.getAttribute('data-mode') === state.tokenMode;
        button.classList.toggle('active', active);
      });

      if (state.previousShareUrl) {
        previousShareBlock.classList.remove('hidden');
        if (canReuseExistingShareUrl) {
          previousShareBlock.textContent = format(currentCopy.previousShareReusable, {
            url: state.previousShareUrl,
          });
        } else if (state.previousIsTemporary) {
          previousShareBlock.textContent = format(currentCopy.previousShareGuestUnavailable, {
            url: state.previousShareUrl,
          });
        } else {
          previousShareBlock.textContent = format(currentCopy.previousShareIdentityUnavailable, {
            url: state.previousShareUrl,
          });
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
        deployHint.textContent = format(currentCopy.currentFolderHint, {
          folderPath: state.folderPath,
        });
      } else {
        deployHint.textContent = currentCopy.deployHintWithoutFolder;
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
      const currentCopy = copy();
      const titleMap = {
        info: currentCopy.toastTitleInfo,
        success: currentCopy.toastTitleSuccess,
        warning: currentCopy.toastTitleWarning,
        error: currentCopy.toastTitleError
      };

      const toast = document.createElement('div');
      toast.className = 'toast ' + intent;
      toast.innerHTML =
        '<div class="toast-title">' + (titleMap[intent] || currentCopy.toastTitleInfo) + '</div>' +
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

    function fillConfirmList(items) {
      confirmList.innerHTML = '';
      items.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        confirmList.appendChild(li);
      });
    }

    function openGuestConfirm() {
      const currentCopy = copy();
      confirmAction = 'guestDeploy';
      confirmDialog.classList.remove('danger');
      confirmIcon.textContent = '!';
      confirmTitle.textContent = currentCopy.guestConfirmTitle;
      confirmText.textContent = currentCopy.guestConfirmText;
      fillConfirmList(currentCopy.guestConfirmList);
      confirmCancelBtn.textContent = currentCopy.guestConfirmCancel;
      confirmActionBtn.textContent = currentCopy.guestConfirmAction;
      confirmActionBtn.classList.remove('button-danger');
      confirmActionBtn.classList.add('button-warning');
      setConfirmVisible(true);
    }

    function openClearTokenConfirm() {
      const currentCopy = copy();
      confirmAction = 'clearToken';
      confirmDialog.classList.add('danger');
      confirmIcon.textContent = '×';
      confirmTitle.textContent = currentCopy.clearTokenTitle;
      confirmText.textContent = currentCopy.clearTokenText;
      fillConfirmList(currentCopy.clearTokenList);
      confirmCancelBtn.textContent = currentCopy.clearTokenCancel;
      confirmActionBtn.textContent = currentCopy.clearTokenAction;
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

    localeZhBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'setLocale', locale: 'zh-CN' });
    });

    localeEnBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'setLocale', locale: 'en' });
    });

    chooseFolderBtn.addEventListener('click', () => {
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

    deployBtn.addEventListener('click', () => {
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

    clearTokenBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'clearToken' });
    });

    copyUrlBtn.addEventListener('click', () => {
      const url = state.lastResultUrl || state.lastDeployUrl;
      if (url) {
        vscode.postMessage({ type: 'copyUrl', url });
      }
    });

    openUrlBtn.addEventListener('click', () => {
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

      if (message.type === 'deployStart') {
        state.isDeploying = true;
        state.deployLabel = message.label || '';
        render();
        return;
      }

      if (message.type === 'deployProgress') {
        state.deployLabel = message.label || '';
        render();
        return;
      }

      if (message.type === 'deployEnd') {
        state.isDeploying = false;
        state.deployLabel = '';
        render();
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
</html>`;
    }
}
exports.HtmlToLinkPanel = HtmlToLinkPanel;
async function resolveFolderFromUri(resourceUri) {
    try {
        const stat = await vscode.workspace.fs.stat(resourceUri);
        if (stat.type & vscode.FileType.Directory) {
            return resourceUri.fsPath;
        }
        return path.dirname(resourceUri.fsPath);
    }
    catch {
        // 路径可能已不存在，尽量回退到父目录
        return path.dirname(resourceUri.fsPath);
    }
}
function getAutoCopyUrl() {
    return vscode.workspace
        .getConfiguration('htmlToLink')
        .get('autoCopyUrl', true);
}
function sortEntryCandidates(candidates) {
    return [...candidates].sort((left, right) => {
        const leftDepth = left.split('/').length;
        const rightDepth = right.split('/').length;
        if (leftDepth !== rightDepth) {
            return leftDepth - rightDepth;
        }
        return left.localeCompare(right, 'zh-CN');
    });
}
function isTemporaryShareUrl(shareUrl) {
    if (!shareUrl) {
        return false;
    }
    try {
        const url = new URL(shareUrl);
        return /^\/temp_[^/]+\/?$/.test(url.pathname);
    }
    catch {
        return /\/temp_[^/]+\/?$/.test(shareUrl);
    }
}
function getNonce() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let value = '';
    for (let index = 0; index < 32; index += 1) {
        value += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return value;
}
//# sourceMappingURL=HtmlToLinkPanel.js.map