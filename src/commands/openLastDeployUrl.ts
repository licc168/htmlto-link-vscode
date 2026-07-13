import * as vscode from 'vscode'
import { getLastDeployedUrl } from '../core/deploy/deploymentState'
import { HtmlToLinkPanel } from '../panel/HtmlToLinkPanel'
import { getPreferredUiLocale, messages } from '../panel/i18n'
import { openExternalUrl } from '../utils/openExternal'

export function createOpenLastDeployUrlCommand(context: vscode.ExtensionContext) {
  return async () => {
    const lastUrl = getLastDeployedUrl(context)

    if (!lastUrl) {
      const locale = await getPreferredUiLocale(context)
      await HtmlToLinkPanel.showToastInPanel(
        context,
        'warning',
        messages[locale].panel.toastNoLastLink
      )
      return
    }

    await openExternalUrl(lastUrl)
  }
}
