import * as fs from 'fs/promises'
import * as path from 'path'

export type DeployFile = {
  absolutePath: string
  relativePath: string
}

export async function collectFiles(
  folderPath: string,
  excludePatterns: string[]
): Promise<DeployFile[]> {
  const files: DeployFile[] = []
  await walk(folderPath, folderPath, excludePatterns, files)

  if (files.length === 0) {
    throw new Error('所选文件夹中没有可部署文件。')
  }

  return files
}

async function walk(
  rootPath: string,
  currentPath: string,
  excludePatterns: string[],
  results: DeployFile[]
) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name)
    const relativePath = toRelativePath(rootPath, fullPath)

    if (matchesExclude(relativePath, excludePatterns, entry.isDirectory())) {
      continue
    }

    if (entry.isDirectory()) {
      await walk(rootPath, fullPath, excludePatterns, results)
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    results.push({
      absolutePath: fullPath,
      relativePath,
    })
  }
}

function matchesExclude(
  relativePath: string,
  excludePatterns: string[],
  isDirectory: boolean
) {
  const normalized = relativePath.replace(/\\/g, '/')
  const withSlash = isDirectory ? `${normalized}/` : normalized

  return excludePatterns.some((pattern) => {
    const cleaned = pattern.replace(/\\/g, '/')
    const prefix = cleaned.endsWith('/**') ? cleaned.slice(0, -3) : cleaned

    return (
      normalized === prefix ||
      normalized.startsWith(`${prefix}/`) ||
      withSlash.startsWith(`${prefix}/`)
    )
  })
}

function toRelativePath(rootPath: string, fullPath: string) {
  return path.relative(rootPath, fullPath).replace(/\\/g, '/')
}
