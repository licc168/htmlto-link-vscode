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
exports.createQuickPublishCommand = createQuickPublishCommand;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const tokenStore_1 = require("../core/config/tokenStore");
const deploymentState_1 = require("../core/deploy/deploymentState");
const detectEntryFile_1 = require("../core/deploy/detectEntryFile");
const performDeployment_1 = require("../core/deploy/performDeployment");
const i18n_1 = require("../panel/i18n");
const openExternal_1 = require("../utils/openExternal");
/**
 * 一键发布：不打开面板，直接部署当前 HTML / 项目，成功后弹链接。
 */
function createQuickPublishCommand(context) {
    return async (resourceUri) => {
        const locale = await (0, i18n_1.getPreferredUiLocale)(context);
        const copy = i18n_1.messages[locale].quickPublish;
        try {
            const target = await resolvePublishTarget(context, resourceUri);
            if (!target) {
                void vscode.window.showWarningMessage(copy.noTarget);
                return;
            }
            const savedToken = await (0, tokenStore_1.getSavedToken)(context);
            const token = savedToken || null;
            const tokenMode = token ? 'saved' : 'guest';
            const metadata = await (0, deploymentState_1.getDeploymentMetadata)(target.folderPath);
            const { shareUrl, updateToken } = resolveReuseParams(tokenMode, metadata);
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: copy.progressTitle,
                cancellable: false,
            }, async (progress) => {
                progress.report({ message: copy.progressCollecting });
                return (0, performDeployment_1.performDeployment)({
                    context,
                    folderPath: target.folderPath,
                    entryFile: target.entryFile,
                    token,
                    shareUrl,
                    updateToken,
                    onProgress: (step) => {
                        const map = {
                            collecting: copy.progressCollecting,
                            zipping: copy.progressZipping,
                            uploading: copy.progressUploading,
                            saving: copy.progressSaving,
                        };
                        progress.report({ message: map[step] || copy.progressTitle });
                    },
                    onRetry: (attempt, max) => {
                        progress.report({
                            message: format(copy.progressRetrying, { attempt, max }),
                        });
                    },
                });
            });
            await (0, deploymentState_1.setLastUsedFolder)(context, target.folderPath);
            const autoCopy = vscode.workspace
                .getConfiguration('htmlToLink')
                .get('autoCopyUrl', true);
            if (autoCopy) {
                await vscode.env.clipboard.writeText(result.shareUrl);
            }
            const successText = autoCopy
                ? format(copy.successCopied, { url: result.shareUrl })
                : format(copy.success, { url: result.shareUrl });
            const openLabel = copy.openLink;
            const copyLabel = copy.copyLink;
            const choice = await vscode.window.showInformationMessage(successText, openLabel, copyLabel);
            if (choice === openLabel) {
                await (0, openExternal_1.openExternalUrl)(result.shareUrl);
            }
            else if (choice === copyLabel) {
                await vscode.env.clipboard.writeText(result.shareUrl);
                void vscode.window.showInformationMessage(copy.copied);
            }
        }
        catch (error) {
            const message = error instanceof Error
                ? error.message
                : typeof error === 'string'
                    ? error
                    : copy.unknownError;
            void vscode.window.showErrorMessage(format(copy.failed, { message }));
        }
    };
}
async function resolvePublishTarget(context, resourceUri) {
    const uri = resourceUri ||
        vscode.window.activeTextEditor?.document.uri ||
        undefined;
    if (uri && uri.scheme === 'file') {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type & vscode.FileType.Directory) {
                return resolveFromFolder(uri.fsPath);
            }
            if (uri.fsPath.toLowerCase().endsWith('.html')) {
                return resolveFromHtmlFile(uri);
            }
            // 非 HTML 文件：发布其所在目录
            return resolveFromFolder(path.dirname(uri.fsPath));
        }
        catch {
            // 路径无效时继续走默认目录
        }
    }
    const folderPath = await (0, deploymentState_1.resolveDefaultFolderPath)(context);
    if (!folderPath) {
        return undefined;
    }
    return resolveFromFolder(folderPath);
}
async function resolveFromHtmlFile(uri) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder) {
        const folderPath = workspaceFolder.uri.fsPath;
        const entryFile = path
            .relative(folderPath, uri.fsPath)
            .replace(/\\/g, '/');
        return { folderPath, entryFile };
    }
    return {
        folderPath: path.dirname(uri.fsPath),
        entryFile: path.basename(uri.fsPath),
    };
}
async function resolveFromFolder(folderPath) {
    const candidates = await (0, detectEntryFile_1.listHtmlEntryCandidates)(folderPath);
    if (candidates.length === 0) {
        return undefined;
    }
    const preferred = (0, detectEntryFile_1.getDefaultEntryFile)();
    const entryFile = candidates.includes(preferred)
        ? preferred
        : candidates[0];
    return { folderPath, entryFile };
}
function resolveReuseParams(tokenMode, metadata) {
    if (!metadata?.shareUrl) {
        return { shareUrl: undefined, updateToken: undefined };
    }
    const isTemporary = metadata.temporary ?? isTemporaryShareUrl(metadata.shareUrl);
    if (tokenMode === 'guest') {
        if (isTemporary && metadata.updateToken) {
            return {
                shareUrl: metadata.shareUrl,
                updateToken: metadata.updateToken,
            };
        }
        return { shareUrl: undefined, updateToken: undefined };
    }
    // Token 模式：非临时部署可复用同一分享地址
    if (!isTemporary) {
        return { shareUrl: metadata.shareUrl, updateToken: undefined };
    }
    return { shareUrl: undefined, updateToken: undefined };
}
function isTemporaryShareUrl(shareUrl) {
    if (!shareUrl) {
        return false;
    }
    try {
        const url = new URL(shareUrl);
        return (url.pathname.includes('/t/') ||
            url.searchParams.get('temporary') === '1');
    }
    catch {
        return shareUrl.includes('/t/');
    }
}
function format(template, values) {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
//# sourceMappingURL=quickPublish.js.map