import * as vscode from 'vscode'

export async function selectFolder(
  initialUri?: vscode.Uri
): Promise<string | undefined> {
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    title: '选择要部署到 HTML to Link 的文件夹',
    openLabel: '部署此文件夹',
    // 默认打开当前项目目录，减少手动导航
    defaultUri:
      initialUri ||
      vscode.workspace.workspaceFolders?.[0]?.uri,
  })

  return picked?.[0]?.fsPath
}
