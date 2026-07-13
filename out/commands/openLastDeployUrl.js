"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenLastDeployUrlCommand = createOpenLastDeployUrlCommand;
const deploymentState_1 = require("../core/deploy/deploymentState");
const HtmlToLinkPanel_1 = require("../panel/HtmlToLinkPanel");
const openExternal_1 = require("../utils/openExternal");
function createOpenLastDeployUrlCommand(context) {
    return async () => {
        const lastUrl = (0, deploymentState_1.getLastDeployedUrl)(context);
        if (!lastUrl) {
            await HtmlToLinkPanel_1.HtmlToLinkPanel.showToastInPanel(context, 'warning', '当前还没有可打开的部署链接。');
            return;
        }
        await (0, openExternal_1.openExternalUrl)(lastUrl);
    };
}
//# sourceMappingURL=openLastDeployUrl.js.map