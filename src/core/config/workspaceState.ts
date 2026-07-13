import * as vscode from 'vscode'

export function getWorkspaceSetting<T>(
  key: string,
  defaultValue: T
): T {
  return vscode.workspace.getConfiguration('htmlToLink').get<T>(key, defaultValue)
}
