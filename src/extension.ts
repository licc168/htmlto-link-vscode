import * as vscode from 'vscode'
import { createOpenPanelCommand } from './commands/openPanel'
import { createDeployFolderCommand } from './commands/deployFolder'
import { createQuickPublishCommand } from './commands/quickPublish'
import { createSetTokenCommand } from './commands/setToken'
import { createClearTokenCommand } from './commands/clearToken'
import { createOpenLastDeployUrlCommand } from './commands/openLastDeployUrl'
import { HtmlToLinkSidebarViewProvider } from './panel/HtmlToLinkSidebarView'
import { sendActivationPing } from './telemetry'

export function activate(context: vscode.ExtensionContext) {
  console.log('[HtmlToLink] activate called')

  // 发送激活 ping（fire-and-forget，不阻塞启动）
  const apiBaseUrl = vscode.workspace
    .getConfiguration('htmlToLink')
    .get<string>('apiBaseUrl', 'https://htmlto.link')
  sendActivationPing({
    extName: 'htmlto-link-vscode',
    extensionId: 'licc.htmlto-link-vscode',
    apiBaseUrl,
  })

  // 每个注册独立 try-catch，一个失败不影响其他
  const safe = (label: string, fn: () => vscode.Disposable) => {
    try {
      context.subscriptions.push(fn())
    } catch (err) {
      console.error(`[HtmlToLink] Failed to register ${label}:`, err)
    }
  }

  safe('sidebarView', () =>
    vscode.window.registerWebviewViewProvider(
      HtmlToLinkSidebarViewProvider.viewType,
      new HtmlToLinkSidebarViewProvider(context)
    )
  )
  safe('openPanel', () =>
    vscode.commands.registerCommand('htmlToLink.openPanel', createOpenPanelCommand(context))
  )
  safe('deployFolder', () =>
    vscode.commands.registerCommand('htmlToLink.deployFolder', createDeployFolderCommand(context))
  )
  safe('quickPublish', () =>
    vscode.commands.registerCommand('htmlToLink.quickPublish', createQuickPublishCommand(context))
  )
  safe('setToken', () =>
    vscode.commands.registerCommand('htmlToLink.setToken', createSetTokenCommand(context))
  )
  safe('clearToken', () =>
    vscode.commands.registerCommand('htmlToLink.clearToken', createClearTokenCommand(context))
  )
  safe('openLastDeployUrl', () =>
    vscode.commands.registerCommand('htmlToLink.openLastDeployUrl', createOpenLastDeployUrlCommand(context))
  )

  console.log('[HtmlToLink] activate done')
}

export function deactivate() {}
