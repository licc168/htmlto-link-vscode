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
const sidebarStateEvents_1 = require("./sidebarStateEvents");
class HtmlToLinkSidebarViewProvider {
    context;
    static viewType = 'htmlToLink.sidebarView';
    view;
    constructor(context) {
        this.context = context;
        this.context.subscriptions.push((0, sidebarStateEvents_1.onSidebarStateChanged)(() => {
            void this.postState();
        }));
    }
    resolveWebviewView(webviewView) {
        this.view = webviewView;
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
                void this.postState();
            }
        });
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message?.type) {
                case 'ready':
                    await this.postState();
                    break;
                case 'openPanel':
                    await vscode.commands.executeCommand('htmlToLink.openPanel');
                    break;
                case 'openRecentFolder':
                    if ((0, deploymentState_1.getLastUsedFolder)(this.context)) {
                        await vscode.commands.executeCommand('htmlToLink.openPanel', vscode.Uri.file((0, deploymentState_1.getLastUsedFolder)(this.context)));
                    }
                    break;
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
    async postState() {
        if (!this.view) {
            return;
        }
        const state = {
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
        return `<!DOCTYPE html>
<html lang="zh-CN">
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
    }
    .hero h1 {
      margin: 0 0 8px;
      font-size: 18px;
      line-height: 1.3;
    }
    .hero p {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.7;
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
      <h1>静态网站一键发布</h1>
      <p>左侧固定入口。适合随时打开完整发布面板、选择文件夹、配置 Token，以及快速回到最近发布链接。</p>
    </section>

    <section class="card">
      <div class="row">
        <span id="tokenBadge" class="badge">未保存 Token</span>
        <span class="badge">固定入口</span>
      </div>
      <div id="modeStatus" class="status">
        <strong>当前推荐：游客快速发布</strong>
        <div class="muted">未检测到已保存 Token，适合临时分享。需要长期更新链接时可先配置 Token。</div>
      </div>
      <button id="openPanelBtn" type="button">打开完整发布面板</button>
      <button id="deployFolderBtn" class="secondary" type="button">选择文件夹并发布</button>
      <button id="setTokenBtn" class="ghost" type="button">打开 Token 设置</button>
    </section>

    <section class="card">
      <h2>最近项目目录</h2>
      <div id="lastFolderEmpty" class="muted">还没有最近使用目录。你可以先选择一个静态站点文件夹。</div>
      <div id="lastFolderValue" class="url" hidden></div>
      <button id="openRecentFolderBtn" class="secondary" type="button" disabled>继续发布这个目录</button>
    </section>

    <section class="card">
      <h2>最近发布链接</h2>
      <div id="lastUrlEmpty" class="muted">还没有最近发布记录。完成一次部署后，这里会提供快速打开入口。</div>
      <div id="lastUrlValue" class="url" hidden></div>
      <button id="openLastUrlBtn" class="ghost" type="button" disabled>打开最近链接</button>
    </section>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = {
      hasSavedToken: false,
      lastDeployUrl: '',
      lastFolderPath: ''
    };

    const tokenBadge = document.getElementById('tokenBadge');
    const modeStatus = document.getElementById('modeStatus');
    const lastFolderEmpty = document.getElementById('lastFolderEmpty');
    const lastFolderValue = document.getElementById('lastFolderValue');
    const openRecentFolderBtn = document.getElementById('openRecentFolderBtn');
    const lastUrlEmpty = document.getElementById('lastUrlEmpty');
    const lastUrlValue = document.getElementById('lastUrlValue');
    const openLastUrlBtn = document.getElementById('openLastUrlBtn');

    function render() {
      tokenBadge.textContent = state.hasSavedToken ? '已保存 Token' : '未保存 Token';
      modeStatus.innerHTML = state.hasSavedToken
        ? '<strong>当前推荐：使用已保存 Token 发布</strong><div class="muted">适合长期保留链接，后续可继续在原链接上更新版本。</div>'
        : '<strong>当前推荐：游客快速发布</strong><div class="muted">未检测到已保存 Token，适合临时分享。需要长期更新链接时可先配置 Token。</div>';

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

    document.getElementById('openPanelBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openPanel' });
    });

    document.getElementById('deployFolderBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'deployFolder' });
    });

    openRecentFolderBtn.addEventListener('click', () => {
      if (!openRecentFolderBtn.disabled) {
        vscode.postMessage({ type: 'openRecentFolder' });
      }
    });

    document.getElementById('setTokenBtn').addEventListener('click', () => {
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