import * as fs from 'fs/promises'
import * as path from 'path'
import * as vscode from 'vscode'

export async function listHtmlEntryCandidates(folderPath: string) {
  return findHtmlFiles(folderPath, folderPath, 2)
}

export function getDefaultEntryFile() {
  return vscode.workspace
    .getConfiguration('htmlToLink')
    .get<string>('defaultEntryFile', 'index.html')
}

async function findHtmlFiles(
  rootPath: string,
  currentPath: string,
  maxDepth: number,
  depth = 0
): Promise<string[]> {
  if (depth > maxDepth) {
    return []
  }

  const entries = await fs.readdir(currentPath, { withFileTypes: true })
  const results: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name)

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) {
        continue
      }

      results.push(
        ...(await findHtmlFiles(rootPath, fullPath, maxDepth, depth + 1))
      )
      continue
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      results.push(toRelativePath(rootPath, fullPath))
    }
  }

  return results
}

function shouldSkipDirectory(name: string) {
  return ['node_modules', '.git', '.next', '.turbo'].includes(name)
}

function toRelativePath(rootPath: string, fullPath: string) {
  return path.relative(rootPath, fullPath).replace(/\\/g, '/')
}
