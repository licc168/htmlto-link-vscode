import * as vscode from 'vscode'
import { HtmlToLinkPanel } from '../panel/HtmlToLinkPanel'

export function createSetTokenCommand(context: vscode.ExtensionContext) {
  return async () => {
    await HtmlToLinkPanel.openForTokenInput(context)
  }
}
