"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSetTokenCommand = createSetTokenCommand;
const HtmlToLinkPanel_1 = require("../panel/HtmlToLinkPanel");
function createSetTokenCommand(context) {
    return async () => {
        await HtmlToLinkPanel_1.HtmlToLinkPanel.openForTokenInput(context);
    };
}
//# sourceMappingURL=setToken.js.map