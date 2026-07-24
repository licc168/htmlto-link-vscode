type DeployArchiveParams = {
  apiBaseUrl: string
  archiveBuffer: Buffer
  archiveFileName: string
  title: string
  entryFile: string
  token: string | null
  shareUrl?: string
  updateToken?: string
  onRetry?: (attempt: number, maxAttempts: number) => void
}

type DeployApiResponse = {
  shareUrl?: string
  share_url?: string
  url?: string
  versionNo?: number
  version_no?: number
  updateToken?: string
  update_token?: string
  temporary?: boolean
  expiresAt?: string | null
  expires_at?: string | null
  message?: string
  error?: string
}

const MAX_ATTEMPTS = 3
const BASE_RETRY_DELAY_MS = 2000

export async function deployArchive(
  params: DeployArchiveParams
): Promise<{
  shareUrl: string
  versionNo?: number
  updateToken?: string
  temporary?: boolean
  expiresAt?: string | null
}> {
  const endpoint = `${stripTrailingSlash(params.apiBaseUrl)}/api/skill/deploy`
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const formData = buildFormData(params)

    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: params.token
          ? {
              Authorization: `Bearer ${params.token}`,
            }
          : undefined,
        body: formData,
      })
    } catch (networkError) {
      lastError =
        networkError instanceof Error
          ? networkError
          : new Error(String(networkError))
      if (attempt === MAX_ATTEMPTS) {
        throw lastError
      }
      params.onRetry?.(attempt, MAX_ATTEMPTS - 1)
      await sleep(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1))
      continue
    }

    const rawText = await response.text()
    const data = parseJson<DeployApiResponse>(rawText)

    if (response.ok) {
      const shareUrl = data?.shareUrl || data?.share_url || data?.url

      if (!shareUrl) {
        throw new Error('部署成功，但接口未返回分享链接。')
      }

      return {
        shareUrl,
        versionNo: data?.versionNo ?? data?.version_no,
        updateToken: data?.updateToken ?? data?.update_token,
        temporary: data?.temporary,
        expiresAt: data?.expiresAt ?? data?.expires_at,
      }
    }

    lastError = new Error(
      data?.error || data?.message || `部署接口请求失败：HTTP ${response.status}`
    )

    if (
      !isRetryable(response.status, lastError.message) ||
      attempt === MAX_ATTEMPTS
    ) {
      throw lastError
    }

    params.onRetry?.(attempt, MAX_ATTEMPTS - 1)
    await sleep(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1))
  }

  throw lastError ?? new Error('部署请求失败。')
}

function buildFormData(params: DeployArchiveParams) {
  const formData = new FormData()

  formData.append(
    'file',
    new Blob([new Uint8Array(params.archiveBuffer)], { type: 'application/zip' }),
    params.archiveFileName
  )
  formData.append('entry_file', params.entryFile)
  formData.append('title', params.title)

  if (params.shareUrl) {
    formData.append('share_url', params.shareUrl)
  }

  if (params.updateToken) {
    formData.append('update_token', params.updateToken)
  }

  formData.append('channel', 'vscode')

  return formData
}

function isRetryable(status: number, message: string) {
  if (status === 408 || status === 429 || status >= 500) {
    return true
  }
  return /unavailable|timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|socket hang up|network|fetch failed/i.test(
    message
  )
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function parseJson<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T
  } catch {
    return null
  }
}
