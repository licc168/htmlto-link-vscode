"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSavedToken = getSavedToken;
exports.setSavedToken = setSavedToken;
exports.clearSavedToken = clearSavedToken;
const TOKEN_KEY = 'htmlToLink.publishToken';
async function getSavedToken(context) {
    const token = await context.secrets.get(TOKEN_KEY);
    return token?.trim() || undefined;
}
async function setSavedToken(context, token) {
    await context.secrets.store(TOKEN_KEY, token);
}
async function clearSavedToken(context) {
    await context.secrets.delete(TOKEN_KEY);
}
//# sourceMappingURL=tokenStore.js.map