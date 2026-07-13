import * as fs from 'fs/promises'
import * as path from 'path'
import * as vscode from 'vscode'

const LAST_DEPLOY_URL_KEY = 'htmlToLink.lastDeployUrl'
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

function getMetadataFilePath(folderPath: string) {
  return path.join(folderPath, DEPLOYMENT_META_FILE)
}
