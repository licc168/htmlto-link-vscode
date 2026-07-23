import * as path from 'path'
import * as vscode from 'vscode'
import { getSavedToken } from '../core/config/tokenStore'
import {
  getDeploymentMetadata,
  resolveDefaultFolderPath,
  setLastUsedFolder,
} from '../core/deploy/deploymentState'
import {
  getDefaultEntryFile,
  listHtmlEntryCandidates,
} from '../core/deploy/detectEntryFile'
import { performDeployment } from '../core/deploy/performDeployment'
import { getPreferredUiLocale, messages } from '../panel/i18n'
import { openExternalUrl } from '../utils/openExternal'

type PublishTarget = {
  folderPath: string
  entryFile: string
}

/**
 * 一键发布：不打开面板，直接部署当前 HTML / 项目，成功后弹链接。
 */
export function createQuickPublishCommand(context: vscode.ExtensionContext) {
  return async (resourceUri?: vscode.Uri) => {
    const locale = await getPreferredUiLocale(context)
    const copy = messages[locale].quickPublish

    try {
      const target = await resolvePublishTarget(context, resourceUri)
      if (!target) {
        void vscode.window.showWarningMessage(copy.noTarget)
        return
      }

      const savedToken = await getSavedToken(context)
      const token = savedToken || null
      const tokenMode: 'saved' | 'guest' = token ? 'saved' : 'guest'

      const metadata = await getDeploymentMetadata(target.folderPath)
      const { shareUrl, updateToken } = resolveReuseParams(
        tokenMode,
        metadata
      )

      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: copy.progressTitle,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: copy.progressCollecting })

          return performDeployment({
            context,
            folderPath: target.folderPath,
            entryFile: target.entryFile,
            token,
            shareUrl,
            updateToken,
            onProgress: (step) => {
              const map: Record<string, string> = {
                collecting: copy.progressCollecting,
                zipping: copy.progressZipping,
                uploading: copy.progressUploading,
                saving: copy.progressSaving,
              }
              progress.report({ message: map[step] || copy.progressTitle })
            },
            onRetry: (attempt, max) => {
              progress.report({
                message: format(copy.progressRetrying, { attempt, max }),
              })
            },
          })
        }
      )

      await setLastUsedFolder(context, target.folderPath)

      const autoCopy = vscode.workspace
        .getConfiguration('htmlToLink')
        .get<boolean>('autoCopyUrl', true)

      if (autoCopy) {
        await vscode.env.clipboard.writeText(result.shareUrl)
      }

      const successText = autoCopy
        ? format(copy.successCopied, { url: result.shareUrl })
        : format(copy.success, { url: result.shareUrl })

      const openLabel = copy.openLink
      const copyLabel = copy.copyLink
      const choice = await vscode.window.showInformationMessage(
        successText,
        openLabel,
        copyLabel
      )

      if (choice === openLabel) {
        await openExternalUrl(result.shareUrl)
      } else if (choice === copyLabel) {
        await vscode.env.clipboard.writeText(result.shareUrl)
        void vscode.window.showInformationMessage(copy.copied)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : copy.unknownError

      void vscode.window.showErrorMessage(
        format(copy.failed, { message })
      )
    }
  }
}

async function resolvePublishTarget(
  context: vscode.ExtensionContext,
  resourceUri?: vscode.Uri
): Promise<PublishTarget | undefined> {
  const uri =
    resourceUri ||
    vscode.window.activeTextEditor?.document.uri ||
    undefined

  if (uri && uri.scheme === 'file') {
    try {
      const stat = await vscode.workspace.fs.stat(uri)

      if (stat.type & vscode.FileType.Directory) {
        return resolveFromFolder(uri.fsPath)
      }

      if (uri.fsPath.toLowerCase().endsWith('.html')) {
        return resolveFromHtmlFile(uri)
      }

      // 非 HTML 文件：发布其所在目录
      return resolveFromFolder(path.dirname(uri.fsPath))
    } catch {
      // 路径无效时继续走默认目录
    }
  }

  const folderPath = await resolveDefaultFolderPath(context)
  if (!folderPath) {
    return undefined
  }

  return resolveFromFolder(folderPath)
}

async function resolveFromHtmlFile(uri: vscode.Uri): Promise<PublishTarget> {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)

  if (workspaceFolder) {
    const folderPath = workspaceFolder.uri.fsPath
    const entryFile = path
      .relative(folderPath, uri.fsPath)
      .replace(/\\/g, '/')

    return { folderPath, entryFile }
  }

  return {
    folderPath: path.dirname(uri.fsPath),
    entryFile: path.basename(uri.fsPath),
  }
}

async function resolveFromFolder(
  folderPath: string
): Promise<PublishTarget | undefined> {
  const candidates = await listHtmlEntryCandidates(folderPath)
  if (candidates.length === 0) {
    return undefined
  }

  const preferred = getDefaultEntryFile()
  const entryFile = candidates.includes(preferred)
    ? preferred
    : candidates[0]

  return { folderPath, entryFile }
}

function resolveReuseParams(
  tokenMode: 'saved' | 'guest',
  metadata?: {
    shareUrl?: string
    updateToken?: string
    temporary?: boolean
  }
) {
  if (!metadata?.shareUrl) {
    return { shareUrl: undefined, updateToken: undefined }
  }

  const isTemporary =
    metadata.temporary ?? isTemporaryShareUrl(metadata.shareUrl)

  if (tokenMode === 'guest') {
    if (isTemporary && metadata.updateToken) {
      return {
        shareUrl: metadata.shareUrl,
        updateToken: metadata.updateToken,
      }
    }
    return { shareUrl: undefined, updateToken: undefined }
  }

  // Token 模式：非临时部署可复用同一分享地址
  if (!isTemporary) {
    return { shareUrl: metadata.shareUrl, updateToken: undefined }
  }

  return { shareUrl: undefined, updateToken: undefined }
}

function isTemporaryShareUrl(shareUrl?: string) {
  if (!shareUrl) {
    return false
  }

  try {
    const url = new URL(shareUrl)
    return (
      url.pathname.includes('/t/') ||
      url.searchParams.get('temporary') === '1'
    )
  } catch {
    return shareUrl.includes('/t/')
  }
}

function format(
  template: string,
  values: Record<string, string | number>
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? `{${key}}`)
  )
}
