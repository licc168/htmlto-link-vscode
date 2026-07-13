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
exports.collectFiles = collectFiles;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
async function collectFiles(folderPath, excludePatterns) {
    const files = [];
    await walk(folderPath, folderPath, excludePatterns, files);
    if (files.length === 0) {
        throw new Error('所选文件夹中没有可部署文件。');
    }
    return files;
}
async function walk(rootPath, currentPath, excludePatterns, results) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = toRelativePath(rootPath, fullPath);
        if (matchesExclude(relativePath, excludePatterns, entry.isDirectory())) {
            continue;
        }
        if (entry.isDirectory()) {
            await walk(rootPath, fullPath, excludePatterns, results);
            continue;
        }
        if (!entry.isFile()) {
            continue;
        }
        results.push({
            absolutePath: fullPath,
            relativePath,
        });
    }
}
function matchesExclude(relativePath, excludePatterns, isDirectory) {
    const normalized = relativePath.replace(/\\/g, '/');
    const withSlash = isDirectory ? `${normalized}/` : normalized;
    return excludePatterns.some((pattern) => {
        const cleaned = pattern.replace(/\\/g, '/');
        const prefix = cleaned.endsWith('/**') ? cleaned.slice(0, -3) : cleaned;
        return (normalized === prefix ||
            normalized.startsWith(`${prefix}/`) ||
            withSlash.startsWith(`${prefix}/`));
    });
}
function toRelativePath(rootPath, fullPath) {
    return path.relative(rootPath, fullPath).replace(/\\/g, '/');
}
//# sourceMappingURL=collectFiles.js.map