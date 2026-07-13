import * as vscode from 'vscode'
import { createOpenPanelCommand } from './commands/openPanel'
import { createDeployFolderCommand } from './commands/deployFolder'
import { createSetTokenCommand } from './commands/setToken'
import { createClearTokenCommand } from './commands/clearToken'
import { createOpenLastDeployUrlCommand } from './commands/openLastDeployUrl'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'htmlToLink.openPanel',
      createOpenPanelCommand(context)
    ),
    vscode.commands.registerCommand(
      'htmlToLink.deployFolder',
      createDeployFolderCommand(context)
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
