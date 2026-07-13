import * as path from 'path'
import * as vscode from 'vscode'
import { collectFiles } from './collectFiles'
import { zipProject } from './zipProject'
import { deployArchive } from './deployClient'
import { saveDeploymentMetadata, setLastDeployedUrl } from './deploymentState'

export type PerformDeploymentParams = {
  context: vscode.ExtensionContext
  folderPath: string
  entryFile: string
  token: string | null
  shareUrl?: string
  updateToken?: string
}

export async function performDeployment({
  context,
  folderPath,
  entryFile,
  token,
  shareUrl,
  updateToken,
}: PerformDeploymentParams) {
  const apiBaseUrl = getApiBaseUrl()
  const excludePatterns = getExcludePatterns()

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '正在部署到 HTML to Link',
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: '正在收集文件...' })
      const files = await collectFiles(folderPath, excludePatterns)

      progress.report({ message: '正在打包项目...' })
      const archive = await zipProject(folderPath, files)

      progress.report({ message: '正在上传内容...' })
      const result = await deployArchive({
        apiBaseUrl,
        archiveBuffer: archive.buffer,
        archiveFileName: archive.fileName,
        title: path.basename(folderPath),
        entryFile,
        token,
        shareUrl,
        updateToken,
      })

      progress.report({ message: '正在保存部署记录...' })
      await saveDeploymentMetadata(folderPath, {
        shareUrl: result.shareUrl,
        versionNo: result.versionNo,
        entryFile,
        lastDeployTime: new Date().toISOString(),
        projectPath: folderPath,
        updateToken: result.updateToken,
        temporary: result.temporary,
        expiresAt: result.expiresAt,
      })

      await setLastDeployedUrl(context, result.shareUrl)

      return result
    }
  )
}

function getApiBaseUrl() {
  return vscode.workspace
    .getConfiguration('htmlToLink')
    .get<string>('apiBaseUrl', 'https://htmlto.link')
}

function getExcludePatterns() {
  return vscode.workspace
    .getConfiguration('htmlToLink')
    .get<string[]>('excludePatterns', [
      'node_modules/**',
      '.git/**',
      '.next/**',
      'dist/cache/**',
      '.turbo/**',
    ])
}
