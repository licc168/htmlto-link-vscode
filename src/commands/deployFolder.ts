import * as vscode from 'vscode'
import { HtmlToLinkPanel } from '../panel/HtmlToLinkPanel'

export function createDeployFolderCommand(context: vscode.ExtensionContext) {
  return async (resourceUri?: vscode.Uri) => {
    await HtmlToLinkPanel.createOrShow(context, resourceUri)
  }
}
