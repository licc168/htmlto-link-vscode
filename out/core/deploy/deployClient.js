"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployArchive = deployArchive;
async function deployArchive(params) {
    const endpoint = `${stripTrailingSlash(params.apiBaseUrl)}/api/skill/deploy`;
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
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: params.token
            ? {
                Authorization: `Bearer ${params.token}`,
            }
            : undefined,
        body: formData,
    });
    const rawText = await response.text();
    const data = parseJson(rawText);
    if (!response.ok) {
        throw new Error(data?.error || data?.message || `部署接口请求失败：HTTP ${response.status}`);
    }
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