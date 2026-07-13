import * as vscode from 'vscode'

const TOKEN_KEY = 'htmlToLink.publishToken'

export async function getSavedToken(context: vscode.ExtensionContext) {
  const token = await context.secrets.get(TOKEN_KEY)
  return token?.trim() || undefined
}

export async function setSavedToken(
  context: vscode.ExtensionContext,
  token: string
) {
  await context.secrets.store(TOKEN_KEY, token)
}

export async function clearSavedToken(context: vscode.ExtensionContext) {
  await context.secrets.delete(TOKEN_KEY)
}
