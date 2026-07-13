import * as vscode from 'vscode'
import { getLastDeployedUrl } from '../core/deploy/deploymentState'
import { HtmlToLinkPanel } from '../panel/HtmlToLinkPanel'
import { openExternalUrl } from '../utils/openExternal'

export function createOpenLastDeployUrlCommand(context: vscode.ExtensionContext) {
  return async () => {
    const lastUrl = getLastDeployedUrl(context)

    if (!lastUrl) {
      await HtmlToLinkPanel.showToastInPanel(
        context,
        'warning',
        '当前还没有可打开的部署链接。'
      )
      return
    }

    await openExternalUrl(lastUrl)
  }
}
