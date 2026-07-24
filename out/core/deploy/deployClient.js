"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployArchive = deployArchive;
const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 2000;
async function deployArchive(params) {
    const endpoint = `${stripTrailingSlash(params.apiBaseUrl)}/api/skill/deploy`;
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const formData = buildFormData(params);
        let response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: params.token
                    ? {
                        Authorization: `Bearer ${params.token}`,
                    }
                    : undefined,
                body: formData,
            });
        }
        catch (networkError) {
            lastError =
                networkError instanceof Error
                    ? networkError
                    : new Error(String(networkError));
            if (attempt === MAX_ATTEMPTS) {
                throw lastError;
            }
            params.onRetry?.(attempt, MAX_ATTEMPTS - 1);
            await sleep(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
            continue;
        }
        const rawText = await response.text();
        const data = parseJson(rawText);
        if (response.ok) {
            const shareUrl = data?.shareUrl || data?.share_url || data?.url;
            if (!shareUrl) {
                throw new Error('部署成功，但接口未返回分享链接。');
            }
            return {
                shareUrl,
                versionNo: data?.versionNo ?? data?.version_no,
                updateToken: data?.updateToken ?? data?.update_token,
                temporary: data?.temporary,
                expiresAt: data?.expiresAt ?? data?.expires_at,
            };
        }
        lastError = new Error(data?.error || data?.message || `部署接口请求失败：HTTP ${response.status}`);
        if (!isRetryable(response.status, lastError.message) ||
            attempt === MAX_ATTEMPTS) {
            throw lastError;
        }
        params.onRetry?.(attempt, MAX_ATTEMPTS - 1);
        await sleep(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
    }
    throw lastError ?? new Error('部署请求失败。');
}
function buildFormData(params) {
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(params.archiveBuffer)], { type: 'application/zip' }), params.archiveFileName);
    formData.append('entry_file', params.entryFile);
    formData.append('title', params.title);
    if (params.shareUrl) {
        formData.append('share_url', params.shareUrl);
    }
    if (params.updateToken) {
        formData.append('update_token', params.updateToken);
    }
    formData.append('channel', 'vscode');
    return formData;
}
function isRetryable(status, message) {
    if (status === 408 || status === 429 || status >= 500) {
        return true;
    }
    return /unavailable|timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|socket hang up|network|fetch failed/i.test(message);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function stripTrailingSlash(value) {
    return value.replace(/\/+$/, '');
}
function parseJson(input) {
    try {
        return JSON.parse(input);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=deployClient.js.map