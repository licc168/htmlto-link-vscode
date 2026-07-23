import * as vscode from 'vscode'
import { createOpenPanelCommand } from './commands/openPanel'
import { createDeployFolderCommand } from './commands/deployFolder'
import { createQuickPublishCommand } from './commands/quickPublish'
import { createSetTokenCommand } from './commands/setToken'
import { createClearTokenCommand } from './commands/clearToken'
import { createOpenLastDeployUrlCommand } from './commands/openLastDeployUrl'
import { HtmlToLinkSidebarViewProvider } from './panel/HtmlToLinkSidebarView'

export function activate(context: vscode.ExtensionContext) {
  console.log('[HtmlToLink] activate called')
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      HtmlToLinkSidebarViewProvider.viewType,
      new HtmlToLinkSidebarViewProvider(context)
    ),
    vscode.commands.registerCommand(
      'htmlToLink.openPanel',
      createOpenPanelCommand(context)
    ),
    vscode.commands.registerCommand(
      'htmlToLink.deployFolder',
      createDeployFolderCommand(context)
    ),
    vscode.commands.registerCommand(
      'htmlToLink.quickPublish',
      createQuickPublishCommand(context)
    ),
    vscode.commands.registerCommand(
      'htmlToLink.setToken',
      createSetTokenCommand(context)
    ),
    vscode.commands.registerCommand(
      'htmlToLink.clearToken',
      createClearTokenCommand(context)
    ),
    vscode.commands.registerCommand(
      'htmlToLink.openLastDeployUrl',
      createOpenLastDeployUrlCommand(context)
    )
  )
}

export function deactivate() {}
