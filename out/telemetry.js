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
exports.sendActivationPing = sendActivationPing;
const vscode = __importStar(require("vscode"));
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const PING_ENDPOINT = '/api/telemetry/ping';
/**
 * 生成匿名机器标识（不可逆哈希，保护隐私）
 */
function getAnonymousId() {
    const raw = [
        os.hostname(),
        os.userInfo().username,
        vscode.env.machineId,
    ].join('|');
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}
/**
 * 发送一次激活 ping（fire-and-forget，不阻塞插件启动）
 */
function sendActivationPing(config) {
    const url = `${config.apiBaseUrl}${PING_ENDPOINT}`;
    const body = JSON.stringify({
        id: getAnonymousId(),
        ext: config.extName,
        extVersion: vscode.extensions.getExtension(config.extensionId)?.packageJSON?.version ?? 'unknown',
        vscodeVersion: vscode.version,
        platform: process.platform,
        arch: process.arch,
        ts: Date.now(),
    });
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(3000),
    }).catch(() => {
        // 静默忽略所有错误，绝不影响用户体验
    });
}
//# sourceMappingURL=telemetry.js.map