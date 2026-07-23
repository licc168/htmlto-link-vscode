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
  onProgress?: (message: string) => void
  onRetry?: (attempt: number, maxAttempts: number) => void
}

export async function performDeployment({
  context,
  folderPath,
  entryFile,
  token,
  shareUrl,
  updateToken,
  onProgress,
  onRetry,
}: PerformDeploymentParams) {
  const apiBaseUrl = getApiBaseUrl()
  const excludePatterns = getExcludePatterns()

  onProgress?.('collecting')
  const files = await collectFiles(folderPath, excludePatterns)

  onProgress?.('zipping')
  const archive = await zipProject(folderPath, files)

  onProgress?.('uploading')
  const result = await deployArchive({
    apiBaseUrl,
    archiveBuffer: archive.buffer,
    archiveFileName: archive.fileName,
    title: path.basename(folderPath),
    entryFile,
    token,
    shareUrl,
    updateToken,
    onRetry,
  })

  onProgress?.('saving')
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
