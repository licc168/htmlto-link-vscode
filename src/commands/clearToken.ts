import * as vscode from 'vscode'
import { HtmlToLinkPanel } from '../panel/HtmlToLinkPanel'

export function createClearTokenCommand(context: vscode.ExtensionContext) {
  return async () => {
    await HtmlToLinkPanel.requestClearToken(context)
  }
}
