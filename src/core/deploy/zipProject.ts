import * as fs from 'fs/promises'
import JSZip from 'jszip'
import type { DeployFile } from './collectFiles'

export async function zipProject(folderPath: string, files: DeployFile[]) {
  const zip = new JSZip()

  for (const file of files) {
    const content = await fs.readFile(file.absolutePath)
    zip.file(file.relativePath, content)
  }

  const folderName = folderPath.split(/[\\/]/).filter(Boolean).pop() || 'site'
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return {
    fileName: `${folderName}.zip`,
    buffer,
  }
}
