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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const openPanel_1 = require("./commands/openPanel");
const deployFolder_1 = require("./commands/deployFolder");
const quickPublish_1 = require("./commands/quickPublish");
const setToken_1 = require("./commands/setToken");
const clearToken_1 = require("./commands/clearToken");
const openLastDeployUrl_1 = require("./commands/openLastDeployUrl");
const HtmlToLinkSidebarView_1 = require("./panel/HtmlToLinkSidebarView");
function activate(context) {
    console.log('[HtmlToLink] activate called');
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(HtmlToLinkSidebarView_1.HtmlToLinkSidebarViewProvider.viewType, new HtmlToLinkSidebarView_1.HtmlToLinkSidebarViewProvider(context)), vscode.commands.registerCommand('htmlToLink.openPanel', (0, openPanel_1.createOpenPanelCommand)(context)), vscode.commands.registerCommand('htmlToLink.deployFolder', (0, deployFolder_1.createDeployFolderCommand)(context)), vscode.commands.registerCommand('htmlToLink.quickPublish', (0, quickPublish_1.createQuickPublishCommand)(context)), vscode.commands.registerCommand('htmlToLink.setToken', (0, setToken_1.createSetTokenCommand)(context)), vscode.commands.registerCommand('htmlToLink.clearToken', (0, clearToken_1.createClearTokenCommand)(context)), vscode.commands.registerCommand('htmlToLink.openLastDeployUrl', (0, openLastDeployUrl_1.createOpenLastDeployUrlCommand)(context)));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map