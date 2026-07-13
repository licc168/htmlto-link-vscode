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
exports.HtmlToLinkSidebarViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const tokenStore_1 = require("../core/config/tokenStore");
const deploymentState_1 = require("../core/deploy/deploymentState");
const i18n_1 = require("./i18n");
const sidebarStateEvents_1 = require("./sidebarStateEvents");
class HtmlToLinkSidebarViewProvider {
    context;
    static viewType = 'htmlToLink.sidebarView';
    view;
    locale = 'zh-CN';
    constructor(context) {
        this.context = context;
        this.context.subscriptions.push((0, sidebarStateEvents_1.onSidebarStateChanged)(() => {
            void this.syncLocaleAndPostState();
        }));
    }
    async resolveWebviewView(webviewView) {
        this.view = webviewView;
        this.locale = await (0, i18n_1.getPreferredUiLocale)(this.context);
        webviewView.webview.options = {
            enableScripts: true,
        };
        webviewView.webview.html = this.getHtml(webviewView.webview);
        webviewView.onDidDispose(() => {
            if (this.view === webviewView) {
                this.view = undefined;
            }
        });
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                void this.syncLocaleAndPostState();
            }
        });
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message?.type) {
                case 'ready':
                    await this.postState();
                    break;
                case 'setLocale':
                    if ((0, i18n_1.isUiLocale)(message.locale)) {
                        this.locale = message.locale;
                        await (0, i18n_1.setPreferredUiLocale)(this.context, message.locale);
                        (0, sidebarStateEvents_1.notifySidebarStateChanged)();
                    }
                    break;
                case 'openPanel':
                    await vscode.commands.executeCommand('htmlToLink.openPanel');
                    break;
                case 'openRecentFolder': {
                    const folderPath = (0, deploymentState_1.getLastUsedFolder)(this.context);
                    if (folderPath) {
                        await vscode.commands.executeCommand('htmlToLink.openPanel', vscode.Uri.file(folderPath));
                    }
                    break;
                }
                case 'deployFolder':
                    await vscode.commands.executeCommand('htmlToLink.deployFolder');
                    break;
                case 'setToken':
                    await vscode.commands.executeCommand('htmlToLink.setToken');
                    break;
                case 'openLastUrl':
                    if ((0, deploymentState_1.getLastDeployedUrl)(this.context)) {
                        await vscode.commands.executeCommand('htmlToLink.openLastDeployUrl');
                    }
                    break;
                default:
                    break;
            }
            await this.postState();
        });
    }
    async syncLocaleAndPostState() {
        this.locale = await (0, i18n_1.getPreferredUiLocale)(this.context);
        await this.postState();
    }
    async postState() {
        if (!this.view) {
            return;
        }
        const state = {
            uiLocale: this.locale,
            hasSavedToken: Boolean(await (0, tokenStore_1.getSavedToken)(this.context)),
            lastDeployUrl: (0, deploymentState_1.getLastDeployedUrl)(this.context),
            lastFolderPath: (0, deploymentState_1.getLastUsedFolder)(this.context),
        };
        await this.view.webview.postMessage({
            type: 'state',
            state,
        });
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
  <title>Quick Publish</title>
  <style>
    :root {
      color-scheme: light dark;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 16px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
    }
    .app {
      display: grid;
      gap: 14px;
    }
    .hero,
    .card {
      border-radius: 16px;
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.18));
      background: color-mix(in srgb, var(--vscode-editor-background) 78%, transparent);
      box-shadow: 0 10px 24px rgba(0,0,0,0.08);
    }
    .hero {
      padding: 16px;
      background:
        radial-gradient(circle at top right, color-mix(in srgb, var(--vscode-button-background) 24%, transparent), transparent 42%),
        linear-gradient(180deg, color-mix(in srgb, var(--vscode-editorWidget-background) 96%, transparent), color-mix(in srgb, var(--vscode-sideBar-background) 92%, transparent));
      display: grid;
      gap: 14px;
    }
    .hero-copy h1 {
      margin: 0 0 8px;
      font-size: 18px;
      line-height: 1.3;
    }
    .hero-copy p {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.7;
    }
    .locale-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .locale-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .locale-switch {
      display: inline-flex;
      gap: 6px;
      padding: 4px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--vscode-editor-background) 82%, transparent);
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.18));
    }
    .locale-switch button {
      width: auto;
      min-height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      background: transparent;
      border: 0;
      color: var(--vscode-descriptionForeground);
      font-weight: 700;
    }
    .locale-switch button.active {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      font-size: 12px;
      background: color-mix(in srgb, var(--vscode-badge-background) 84%, transparent);
      color: var(--vscode-badge-foreground);
    }
    .card {
      padding: 14px;
      display: grid;
      gap: 10px;
    }
    .card h2 {
      margin: 0;
      font-size: 13px;
    }
    .muted {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.6;
    }
    .url {
      border-radius: 12px;
      padding: 10px 12px;
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.18));
      background: color-mix(in srgb, var(--vscode-editor-background) 84%, transparent);
      font-size: 12px;
      line-height: 1.6;
      word-break: break-all;
    }
    .status {
      padding: 12px;
      border-radius: 12px;
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.18));
      background: color-mix(in srgb, var(--vscode-editor-background) 84%, transparent);
      display: grid;
      gap: 4px;
    }
    .status strong {
      font-size: 12px;
      line-height: 1.4;
    }
    button {
      width: 100%;
      min-height: 36px;
      padding: 0 12px;
      border: 0;
      border-radius: 12px;
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
    button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div class="app">
    <section class="hero">
      <div class="locale-row">
        <span id="localeLabel" class="locale-label"></span>
        <div class="locale-switch">
          <button id="localeZhBtn" type="button">中文</button>
          <button id="localeEnBtn" type="button">EN</button>
        </div>
      </div>
      <div class="hero-copy">
        <h1 id="headerTitle"></h1>
        <p id="headerDescription"></p>
      </div>
    </section>

    <section class="card">
      <div class="row">
        <span id="tokenBadge" class="badge"></span>
        <span id="fixedEntryBadge" class="badge"></span>
      </div>
      <div id="modeStatus" class="status">
        <strong id="modeStatusTitle"></strong>
        <div id="modeStatusDesc" class="muted"></div>
      </div>
      <button id="openPanelBtn" type="button"></button>
      <button id="deployFolderBtn" class="secondary" type="button"></button>
      <button id="setTokenBtn" class="ghost" type="button"></button>
    </section>

    <section class="card">
      <h2 id="recentFolderTitle"></h2>
      <div id="lastFolderEmpty" class="muted"></div>
      <div id="lastFolderValue" class="url" hidden></div>
      <button id="openRecentFolderBtn" class="secondary" type="button" disabled></button>
    </section>

    <section class="card">
      <h2 id="recentLinkTitle"></h2>
      <div id="lastUrlEmpty" class="muted"></div>
      <div id="lastUrlValue" class="url" hidden></div>
      <button id="openLastUrlBtn" class="ghost" type="button" disabled></button>
    </section>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const localizedMessages = ${localizedMessages};
    const state = {
      uiLocale: 'zh-CN',
      hasSavedToken: false,
      lastDeployUrl: '',
      lastFolderPath: ''
    };

    const localeLabel = document.getElementById('localeLabel');
    const localeZhBtn = document.getElementById('localeZhBtn');
    const localeEnBtn = document.getElementById('localeEnBtn');
    const headerTitle = document.getElementById('headerTitle');
    const headerDescription = document.getElementById('headerDescription');
    const tokenBadge = document.getElementById('tokenBadge');
    const fixedEntryBadge = document.getElementById('fixedEntryBadge');
    const modeStatusTitle = document.getElementById('modeStatusTitle');
    const modeStatusDesc = document.getElementById('modeStatusDesc');
    const openPanelBtn = document.getElementById('openPanelBtn');
    const deployFolderBtn = document.getElementById('deployFolderBtn');
    const setTokenBtn = document.getElementById('setTokenBtn');
    const recentFolderTitle = document.getElementById('recentFolderTitle');
    const lastFolderEmpty = document.getElementById('lastFolderEmpty');
    const lastFolderValue = document.getElementById('lastFolderValue');
    const openRecentFolderBtn = document.getElementById('openRecentFolderBtn');
    const recentLinkTitle = document.getElementById('recentLinkTitle');
    const lastUrlEmpty = document.getElementById('lastUrlEmpty');
    const lastUrlValue = document.getElementById('lastUrlValue');
    const openLastUrlBtn = document.getElementById('openLastUrlBtn');

    function getCopy() {
      return localizedMessages[state.uiLocale].sidebar;
    }

    function render() {
      const copy = getCopy();
      localeLabel.textContent = localizedMessages[state.uiLocale].panel.languageSwitcherLabel;
      localeZhBtn.classList.toggle('active', state.uiLocale === 'zh-CN');
      localeEnBtn.classList.toggle('active', state.uiLocale === 'en');
      headerTitle.textContent = copy.headerTitle;
      headerDescription.textContent = copy.headerDescription;
      tokenBadge.textContent = state.hasSavedToken ? copy.savedTokenBadge : copy.emptyTokenBadge;
      fixedEntryBadge.textContent = copy.fixedEntryBadge;
      modeStatusTitle.textContent = state.hasSavedToken ? copy.recommendedSavedTitle : copy.recommendedGuestTitle;
      modeStatusDesc.textContent = state.hasSavedToken ? copy.recommendedSavedDesc : copy.recommendedGuestDesc;
      openPanelBtn.textContent = copy.openPanel;
      deployFolderBtn.textContent = copy.deployFolder;
      setTokenBtn.textContent = copy.tokenSettings;
      recentFolderTitle.textContent = copy.recentFolderTitle;
      lastFolderEmpty.textContent = copy.recentFolderEmpty;
      openRecentFolderBtn.textContent = copy.continueFolder;
      recentLinkTitle.textContent = copy.recentLinkTitle;
      lastUrlEmpty.textContent = copy.recentLinkEmpty;
      openLastUrlBtn.textContent = copy.openRecentLink;

      if (state.lastFolderPath) {
        lastFolderEmpty.hidden = true;
        lastFolderValue.hidden = false;
        lastFolderValue.textContent = state.lastFolderPath;
        openRecentFolderBtn.disabled = false;
      } else {
        lastFolderEmpty.hidden = false;
        lastFolderValue.hidden = true;
        lastFolderValue.textContent = '';
        openRecentFolderBtn.disabled = true;
      }

      if (state.lastDeployUrl) {
        lastUrlEmpty.hidden = true;
        lastUrlValue.hidden = false;
        lastUrlValue.textContent = state.lastDeployUrl;
        openLastUrlBtn.disabled = false;
      } else {
        lastUrlEmpty.hidden = false;
        lastUrlValue.hidden = true;
        lastUrlValue.textContent = '';
        openLastUrlBtn.disabled = true;
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

    deployFolderBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'deployFolder' });
    });

    openRecentFolderBtn.addEventListener('click', () => {
      if (!openRecentFolderBtn.disabled) {
        vscode.postMessage({ type: 'openRecentFolder' });
      }
    });

    setTokenBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'setToken' });
    });

    openLastUrlBtn.addEventListener('click', () => {
      if (!openLastUrlBtn.disabled) {
        vscode.postMessage({ type: 'openLastUrl' });
      }
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'state' && message.state) {
        Object.assign(state, message.state);
        render();
      }
    });

    render();
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
    }
}
exports.HtmlToLinkSidebarViewProvider = HtmlToLinkSidebarViewProvider;
function getNonce() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let value = '';
    for (let index = 0; index < 32; index += 1) {
        value += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return value;
}
//# sourceMappingURL=HtmlToLinkSidebarView.js.map