import * as fs from 'fs/promises'
import * as path from 'path'
import * as vscode from 'vscode'

const LAST_DEPLOY_URL_KEY = 'htmlToLink.lastDeployUrl'
const LAST_FOLDER_PATH_KEY = 'htmlToLink.lastFolderPath'
const DEPLOYMENT_META_FILE = '.htmltolink.json'

export type DeploymentMetadata = {
  shareUrl: string
  versionNo?: number
  entryFile: string
  lastDeployTime: string
  projectPath: string
  updateToken?: string
  temporary?: boolean
  expiresAt?: string | null
}

export async function getDeploymentMetadata(folderPath: string) {
  const filePath = getMetadataFilePath(folderPath)

  try {
    const content = await fs.readFile(filePath, 'utf8')
    return JSON.parse(content) as DeploymentMetadata
  } catch {
    return undefined
  }
}

export async function saveDeploymentMetadata(
  folderPath: string,
  metadata: DeploymentMetadata
) {
  const filePath = getMetadataFilePath(folderPath)
  await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf8')
}

export async function setLastDeployedUrl(
  context: vscode.ExtensionContext,
  url: string
) {
  await context.globalState.update(LAST_DEPLOY_URL_KEY, url)
}

export function getLastDeployedUrl(context: vscode.ExtensionContext) {
  return context.globalState.get<string>(LAST_DEPLOY_URL_KEY)
}

export async function setLastUsedFolder(
  context: vscode.ExtensionContext,
  folderPath: string
) {
  await context.globalState.update(LAST_FOLDER_PATH_KEY, folderPath)
}

export function getLastUsedFolder(context: vscode.ExtensionContext) {
  return context.globalState.get<string>(LAST_FOLDER_PATH_KEY)
}

/**
 * 自动解析默认项目目录：
 * 1. 上次使用的目录（若仍存在，且位于当前工作区内）
 * 2. 当前工作区根目录
 * 3. 上次使用的目录（无工作区时的回退）
 */
export async function resolveDefaultFolderPath(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  const lastFolder = getLastUsedFolder(context)

  if (workspaceRoot) {
    if (
      lastFolder &&
      isPathInsideOrEqual(lastFolder, workspaceRoot) &&
      (await pathExists(lastFolder))
    ) {
      return lastFolder
    }

    if (await pathExists(workspaceRoot)) {
      return workspaceRoot
    }
  }

  if (lastFolder && (await pathExists(lastFolder))) {
    return lastFolder
  }

  return undefined
}

function isPathInsideOrEqual(child: string, parent: string) {
  const normalizedChild = path.resolve(child)
  const normalizedParent = path.resolve(parent)

  if (normalizedChild === normalizedParent) {
    return true
  }

  const relative = path.relative(normalizedParent, normalizedChild)
  return (
    relative !== '' &&
    !relative.startsWith('..') &&
    !path.isAbsolute(relative)
  )
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

function getMetadataFilePath(folderPath: string) {
  return path.join(folderPath, DEPLOYMENT_META_FILE)
}
