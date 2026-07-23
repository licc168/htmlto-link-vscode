import * as vscode from 'vscode'
import { getSavedToken } from '../core/config/tokenStore'
import {
  getLastDeployedUrl,
  getLastUsedFolder,
} from '../core/deploy/deploymentState'
import {
  getPreferredUiLocale,
  isUiLocale,
  messages,
  setPreferredUiLocale,
  type UiLocale,
} from './i18n'
import {
  notifySidebarStateChanged,
  onSidebarStateChanged,
} from './sidebarStateEvents'

type SidebarState = {
  uiLocale: UiLocale
  hasSavedToken: boolean
  lastDeployUrl?: string
  lastFolderPath?: string
}

export class HtmlToLinkSidebarViewProvider
  implements vscode.WebviewViewProvider
{
  static readonly viewType = 'htmlToLink.sidebarView'

  private view?: vscode.WebviewView
  private locale: UiLocale = 'zh-CN'

  constructor(private readonly context: vscode.ExtensionContext) {
    this.context.subscriptions.push(
      onSidebarStateChanged(() => {
        void this.syncLocaleAndPostState()
      })
    )
  }

  async resolveWebviewView(webviewView: vscode.WebviewView) {
    console.log('[HtmlToLink] resolveWebviewView called')
    this.view = webviewView
    this.locale = await getPreferredUiLocale(this.context)
    console.log('[HtmlToLink] locale resolved:', this.locale)

    webviewView.webview.options = {
      enableScripts: true,
    }
    webviewView.webview.html = this.getHtml(webviewView.webview)
    console.log('[HtmlToLink] html set, length:', webviewView.webview.html.length)

    webviewView.onDidDispose(() => {
      if (this.view === webviewView) {
        this.view = undefined
      }
    })

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        void this.syncLocaleAndPostState()
      }
    })

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message?.type) {
        case 'ready':
          await this.postState()
          break
        case 'setLocale':
          if (isUiLocale(message.locale)) {
            this.locale = message.locale
            await setPreferredUiLocale(this.context, message.locale)
            notifySidebarStateChanged()
          }
          break
        case 'openPanel':
          await vscode.commands.executeCommand('htmlToLink.openPanel')
          break
        case 'openRecentFolder': {
          const folderPath = getLastUsedFolder(this.context)
          if (folderPath) {
            await vscode.commands.executeCommand(
              'htmlToLink.openPanel',
              vscode.Uri.file(folderPath)
            )
          }
          break
        }
        case 'deployFolder':
          await vscode.commands.executeCommand('htmlToLink.deployFolder')
          break
        case 'setToken':
          await vscode.commands.executeCommand('htmlToLink.setToken')
          break
        case 'openLastUrl':
          if (getLastDeployedUrl(this.context)) {
            await vscode.commands.executeCommand('htmlToLink.openLastDeployUrl')
          }
          break
        default:
          break
      }

      await this.postState()
    })
  }

  private async syncLocaleAndPostState() {
    this.locale = await getPreferredUiLocale(this.context)
    await this.postState()
  }

  private async postState() {
    if (!this.view) {
      return
    }

    const state: SidebarState = {
      uiLocale: this.locale,
      hasSavedToken: Boolean(await getSavedToken(this.context)),
      lastDeployUrl: getLastDeployedUrl(this.context),
      lastFolderPath: getLastUsedFolder(this.context),
    }

    await this.view.webview.postMessage({
      type: 'state',
      state,
    })
  }

  private getHtml(webview: vscode.Webview) {
    const nonce = getNonce()
    const localizedMessages = JSON.stringify(messages)

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quick Publish</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 12px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
    }
    .app {
      display: grid;
      gap: 12px;
    }
    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      font-size: 13px;
      font-weight: 700;
      color: var(--vscode-foreground);
    }
    .locale-switch {
      display: inline-flex;
      gap: 4px;
      padding: 3px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--vscode-editor-background) 82%, transparent);
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.18));
    }
    .locale-switch button {
      width: auto;
      min-height: 24px;
      padding: 0 8px;
      border-radius: 999px;
      background: transparent;
      border: 0;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .locale-switch button.active {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
    }
    .desc {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.6;
    }
    button.primary {
      width: 100%;
      min-height: 36px;
      padding: 0 12px;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
    }
    button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .recent {
      display: grid;
      gap: 6px;
    }
    .recent-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .recent-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.18));
      background: color-mix(in srgb, var(--vscode-editor-background) 84%, transparent);
      color: var(--vscode-textLink-foreground, var(--vscode-foreground));
      font-size: 12px;
      text-decoration: none;
      cursor: pointer;
      word-break: break-all;
    }
    .recent-link:hover {
      background: color-mix(in srgb, var(--vscode-editor-background) 60%, transparent);
    }
    .recent-link .icon {
      flex-shrink: 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="app">
    <div class="top-row">
      <span class="brand">HTML to Link</span>
      <div class="locale-switch">
        <button id="localeZhBtn" type="button">中文</button>
        <button id="localeEnBtn" type="button">EN</button>
      </div>
    </div>
    <p id="descText" class="desc"></p>
    <button id="openPanelBtn" class="primary" type="button"></button>
    <div id="recentSection" class="recent" hidden>
      <span id="recentLabel" class="recent-label"></span>
      <a id="recentLink" class="recent-link" href="#">
        <span class="icon">&#128279;</span>
        <span id="recentUrl"></span>
      </a>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const localizedMessages = ${localizedMessages};
    const state = {
      uiLocale: 'zh-CN',
      lastDeployUrl: ''
    };

    const localeZhBtn = document.getElementById('localeZhBtn');
    const localeEnBtn = document.getElementById('localeEnBtn');
    const descText = document.getElementById('descText');
    const openPanelBtn = document.getElementById('openPanelBtn');
    const recentSection = document.getElementById('recentSection');
    const recentLabel = document.getElementById('recentLabel');
    const recentLink = document.getElementById('recentLink');
    const recentUrl = document.getElementById('recentUrl');

    function getCopy() {
      return localizedMessages[state.uiLocale].sidebar;
    }

    function render() {
      const copy = getCopy();
      localeZhBtn.classList.toggle('active', state.uiLocale === 'zh-CN');
      localeEnBtn.classList.toggle('active', state.uiLocale === 'en');
      descText.textContent = copy.headerDescription;
      openPanelBtn.textContent = copy.openPanel;
      recentLabel.textContent = copy.recentLinkTitle;

      if (state.lastDeployUrl) {
        recentSection.hidden = false;
        recentUrl.textContent = state.lastDeployUrl;
      } else {
        recentSection.hidden = true;
      }
    }

    localeZhBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'setLocale', locale: 'zh-CN' });
    });
    localeEnBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'setLocale', locale: 'en' });
    });
    openPanelBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'openPanel' });
    });
    recentLink.addEventListener('click', (e) => {
      e.preventDefault();
      vscode.postMessage({ type: 'openLastUrl' });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'state' && msg.state) {
        Object.assign(state, msg.state);
        render();
      }
    });

    render();
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`
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
