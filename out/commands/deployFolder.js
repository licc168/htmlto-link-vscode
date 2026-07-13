"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeployFolderCommand = createDeployFolderCommand;
const HtmlToLinkPanel_1 = require("../panel/HtmlToLinkPanel");
function createDeployFolderCommand(context) {
    return async (resourceUri) => {
        await HtmlToLinkPanel_1.HtmlToLinkPanel.createOrShow(context, resourceUri);
    };
}
//# sourceMappingURL=deployFolder.js.map