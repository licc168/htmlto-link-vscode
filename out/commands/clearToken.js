"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClearTokenCommand = createClearTokenCommand;
const HtmlToLinkPanel_1 = require("../panel/HtmlToLinkPanel");
function createClearTokenCommand(context) {
    return async () => {
        await HtmlToLinkPanel_1.HtmlToLinkPanel.requestClearToken(context);
    };
}
//# sourceMappingURL=clearToken.js.map