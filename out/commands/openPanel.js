"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenPanelCommand = createOpenPanelCommand;
const HtmlToLinkPanel_1 = require("../panel/HtmlToLinkPanel");
function createOpenPanelCommand(context) {
    return async (resourceUri) => {
        await HtmlToLinkPanel_1.HtmlToLinkPanel.createOrShow(context, resourceUri);
    };
}
//# sourceMappingURL=openPanel.js.map