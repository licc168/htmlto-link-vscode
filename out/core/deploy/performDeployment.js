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
exports.performDeployment = performDeployment;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const collectFiles_1 = require("./collectFiles");
const zipProject_1 = require("./zipProject");
const deployClient_1 = require("./deployClient");
const deploymentState_1 = require("./deploymentState");
async function performDeployment({ context, folderPath, entryFile, token, shareUrl, updateToken, }) {
    const apiBaseUrl = getApiBaseUrl();
    const excludePatterns = getExcludePatterns();
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '正在部署到 HTML to Link',
        cancellable: false,
    }, async (progress) => {
        progress.report({ message: '正在收集文件...' });
        const files = await (0, collectFiles_1.collectFiles)(folderPath, excludePatterns);
        progress.report({ message: '正在打包项目...' });
        const archive = await (0, zipProject_1.zipProject)(folderPath, files);
        progress.report({ message: '正在上传内容...' });
        const result = await (0, deployClient_1.deployArchive)({
            apiBaseUrl,
            archiveBuffer: archive.buffer,
            archiveFileName: archive.fileName,
            title: path.basename(folderPath),
            entryFile,
            token,
            shareUrl,
            updateToken,
        });
        progress.report({ message: '正在保存部署记录...' });
        await (0, deploymentState_1.saveDeploymentMetadata)(folderPath, {
            shareUrl: result.shareUrl,
            versionNo: result.versionNo,
            entryFile,
            lastDeployTime: new Date().toISOString(),
            projectPath: folderPath,
            updateToken: result.updateToken,
            temporary: result.temporary,
            expiresAt: result.expiresAt,
        });
        await (0, deploymentState_1.setLastDeployedUrl)(context, result.shareUrl);
        return result;
    });
}
function getApiBaseUrl() {
    return vscode.workspace
        .getConfiguration('htmlToLink')
        .get('apiBaseUrl', 'https://htmlto.link');
}
function getExcludePatterns() {
    return vscode.workspace
        .getConfiguration('htmlToLink')
        .get('excludePatterns', [
        'node_modules/**',
        '.git/**',
        '.next/**',
        'dist/cache/**',
        '.turbo/**',
    ]);
}
//# sourceMappingURL=performDeployment.js.map