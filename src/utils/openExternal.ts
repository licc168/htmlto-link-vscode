import * as vscode from 'vscode'

export async function openExternalUrl(url: string) {
  await vscode.env.openExternal(vscode.Uri.parse(url))
}
