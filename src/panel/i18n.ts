import * as vscode from 'vscode'

export type UiLocale = 'zh-CN' | 'en'

const UI_LOCALE_KEY = 'htmlToLink.uiLocale'

type PanelMessages = {
  panelTitle: string
  heroTitle: string
  heroDescription: string
  languageSwitcherLabel: string
  folderSectionTitle: string
  savedTokenBadge: string
  emptyTokenBadge: string
  folderLabel: string
  folderPlaceholder: string
  chooseFolder: string
  entryFileLabel: string
  entryFilePlaceholder: string
  entryCandidatesHint: string
  entryManualHint: string
  previousShareReusable: string
  previousShareGuestUnavailable: string
  previousShareIdentityUnavailable: string
  identitySectionTitle: string
  savedModeTitle: string
  savedModeDesc: string
  customModeTitle: string
  customModeDesc: string
  guestModeTitle: string
  guestModeDesc: string
  tokenLabel: string
  tokenPlaceholder: string
  howToGetToken: string
  customTokenHint: string
  saveTokenLabel: string
  guestNote: string
  deploy: string
  deploying: string
  deployProgressCollecting: string
  deployProgressZipping: string
  deployProgressUploading: string
  deployProgressSaving: string
  deployProgressRetrying: string
  clearSavedToken: string
  deployOptionsTitle: string
  reuseExistingDeployment: string
  currentFolderHint: string
  deployHintWithoutFolder: string
  resultSectionTitle: string
  openLastLink: string
  resultEmpty: string
  copyLink: string
  openLink: string
  footer: string
  guestConfirmTitle: string
  guestConfirmText: string
  guestConfirmList: string[]
  guestConfirmCancel: string
  guestConfirmAction: string
  clearTokenTitle: string
  clearTokenText: string
  clearTokenList: string[]
  clearTokenCancel: string
  clearTokenAction: string
  tokenHelpTitle: string
  tokenHelpText: string
  tokenHelpSteps: {
    title: string
    text: string
  }[]
  tokenHelpClose: string
  tokenHelpOpenHome: string
  tokenHelpOpenSettings: string
  toastTitleInfo: string
  toastTitleSuccess: string
  toastTitleWarning: string
  toastTitleError: string
  toastPromptEnterToken: string
  toastCopied: string
  toastClearedToken: string
  toastNoLastLink: string
  toastReuseUnavailable: string
  toastDeploySuccessCopied: string
  toastDeploySuccess: string
  errorChooseFolder: string
  errorEntryRequired: string
  errorSavedTokenMissing: string
  errorCustomTokenRequired: string
  errorDeployFailed: string
  unknownError: string
}

type SidebarMessages = {
  headerTitle: string
  headerDescription: string
  fixedEntryBadge: string
  savedTokenBadge: string
  emptyTokenBadge: string
  recommendedSavedTitle: string
  recommendedSavedDesc: string
  recommendedGuestTitle: string
  recommendedGuestDesc: string
  openPanel: string
  deployFolder: string
  tokenSettings: string
  recentFolderTitle: string
  recentFolderEmpty: string
  continueFolder: string
  recentLinkTitle: string
  recentLinkEmpty: string
  openRecentLink: string
}

type QuickPublishMessages = {
  progressTitle: string
  progressCollecting: string
  progressZipping: string
  progressUploading: string
  progressSaving: string
  progressRetrying: string
  noTarget: string
  success: string
  successCopied: string
  openLink: string
  copyLink: string
  copied: string
  failed: string
  unknownError: string
}

type Messages = {
  panel: PanelMessages
  sidebar: SidebarMessages
  quickPublish: QuickPublishMessages
}

export const messages: Record<UiLocale, Messages> = {
  'zh-CN': {
    panel: {
      panelTitle: '静态网站一键发布',
      heroTitle: '静态网站一键发布',
      heroDescription:
        '把本地静态 HTML 项目发布成可访问链接。支持游客 24 小时临时部署，也支持使用 Token 进行长期可管理部署。',
      languageSwitcherLabel: '界面语言',
      folderSectionTitle: '项目目录',
      savedTokenBadge: '已保存 Token',
      emptyTokenBadge: '未保存 Token',
      folderLabel: '选择要部署的文件夹',
      folderPlaceholder: '请选择本地静态站点目录',
      chooseFolder: '选择文件夹',
      entryFileLabel: '入口文件',
      entryFilePlaceholder: '例如：index.html',
      entryCandidatesHint: '已识别 {count} 个 HTML 文件，请选择部署入口。',
      entryManualHint: '未自动识别到 HTML 文件，请手动输入相对于文件夹的入口文件路径。',
      previousShareReusable: '已检测到历史部署记录，可继续更新：{url}',
      previousShareGuestUnavailable:
        '检测到旧的游客部署记录，但缺少 updateToken 或链接已不适合继续更新，本次将默认创建新链接：{url}',
      previousShareIdentityUnavailable:
        '检测到历史部署记录，但当前身份不能直接更新这个链接：{url}',
      identitySectionTitle: '部署身份',
      savedModeTitle: '使用已保存 Token',
      savedModeDesc: '适合长期保留链接和后续更新版本',
      customModeTitle: '输入新 Token',
      customModeDesc: '使用注册账号部署，可选择保存到本地',
      guestModeTitle: '游客部署',
      guestModeDesc: '无需登录，但生成的链接仅保留 24 小时',
      tokenLabel: 'Token',
      tokenPlaceholder: '请输入 HTML to Link Token',
      howToGetToken: '获取 Token',
      customTokenHint:
        '没有 Token 也可以先游客部署；如果需要长期保存链接，点击上方按钮查看获取方式。',
      saveTokenLabel: '保存 Token，后续部署可直接复用',
      guestNote:
        '当前为游客部署模式，发布成功后链接仅保留 24 小时。若需要长期保存和版本更新，建议使用 Token。',
      deploy: '开始部署',
      deploying: '部署中...',
      deployProgressCollecting: '正在收集文件...',
      deployProgressZipping: '正在打包项目...',
      deployProgressUploading: '正在上传内容...',
      deployProgressSaving: '正在保存记录...',
      deployProgressRetrying: '上传暂时失败，正在自动重试（{attempt}/{max}）...',
      clearSavedToken: '清除已保存 Token',
      deployOptionsTitle: '部署选项',
      reuseExistingDeployment: '如果检测到已有部署记录，则在原链接上创建新版本',
      currentFolderHint: '当前目录：{folderPath}',
      deployHintWithoutFolder: '选择文件夹后，插件会自动尝试识别入口文件。',
      resultSectionTitle: '部署结果',
      openLastLink: '打开最近链接',
      resultEmpty: '部署完成后，这里会显示分享链接。',
      copyLink: '复制链接',
      openLink: '打开链接',
      footer: '支持 VS Code、Cursor、Trae 等基于 VS Code 扩展生态的编辑器。',
      guestConfirmTitle: '确认游客部署',
      guestConfirmText:
        '当前将以游客身份发布，适合快速试用，但链接只会保留 24 小时。',
      guestConfirmList: [
        '部署成功后会立即返回 URL，可直接复制和打开。',
        '游客链接到期后会失效，不能长期保留版本记录。',
        '如果需要长期管理和重复更新，建议改用 Token 部署。',
      ],
      guestConfirmCancel: '先去填 Token',
      guestConfirmAction: '继续游客部署',
      clearTokenTitle: '确认清除 Token',
      clearTokenText:
        '这会删除当前编辑器里保存的 HTML to Link Token，之后将不能直接复用登录身份部署。',
      clearTokenList: [
        '清除后不会影响已经生成的链接。',
        '后续仍可重新输入 Token 并再次保存。',
        '如果你只是想临时试用，可以直接切换到游客部署。',
      ],
      clearTokenCancel: '取消',
      clearTokenAction: '确认清除',
      tokenHelpTitle: '如何获取 Token',
      tokenHelpText:
        '使用 Token 部署后，链接可长期保留，也方便后续继续更新版本。',
      tokenHelpSteps: [
        {
          title: '先注册账号',
          text: '打开 https://htmlto.link/ ，先完成注册或登录。',
        },
        {
          title: '进入设置页',
          text: '登录后访问 https://htmlto.link/settings 。',
        },
        {
          title: '复制 Token 回来粘贴',
          text: '在设置页找到 API Token，复制后回到插件输入即可。',
        },
      ],
      tokenHelpClose: '我知道了',
      tokenHelpOpenHome: '打开首页注册',
      tokenHelpOpenSettings: '打开设置页',
      toastTitleInfo: '提示',
      toastTitleSuccess: '已完成',
      toastTitleWarning: '请注意',
      toastTitleError: '发生错误',
      toastPromptEnterToken: '请在面板中输入 Token，可直接保存到本地。',
      toastCopied: '链接已复制。',
      toastClearedToken: '已清除保存的 Token。',
      toastNoLastLink: '当前还没有可打开的部署链接。',
      toastReuseUnavailable: '当前历史部署记录不满足更新条件，本次将创建一个新的链接。',
      toastDeploySuccessCopied: '部署成功，链接已复制：{url}',
      toastDeploySuccess: '部署成功：{url}',
      errorChooseFolder: '请先选择要部署的文件夹。',
      errorEntryRequired: '请填写入口文件。',
      errorSavedTokenMissing: '当前没有已保存的 Token，请改为输入 Token 或游客部署。',
      errorCustomTokenRequired: '请输入 Token。',
      errorDeployFailed: '部署失败：{message}',
      unknownError: '未知错误',
    },
    sidebar: {
      headerTitle: '静态网站一键发布',
      headerDescription:
        '左侧固定入口。适合随时打开完整发布面板、选择文件夹、配置 Token，以及快速回到最近发布链接。',
      fixedEntryBadge: '固定入口',
      savedTokenBadge: '已保存 Token',
      emptyTokenBadge: '未保存 Token',
      recommendedSavedTitle: '当前推荐：使用已保存 Token 发布',
      recommendedSavedDesc: '适合长期保留链接，后续可继续在原链接上更新版本。',
      recommendedGuestTitle: '当前推荐：游客快速发布',
      recommendedGuestDesc:
        '未检测到已保存 Token，适合临时分享。需要长期更新链接时可先配置 Token。',
      openPanel: '打开完整发布面板',
      deployFolder: '选择文件夹并发布',
      tokenSettings: '打开 Token 设置',
      recentFolderTitle: '最近项目目录',
      recentFolderEmpty: '还没有最近使用目录。你可以先选择一个静态站点文件夹。',
      continueFolder: '继续发布这个目录',
      recentLinkTitle: '最近发布链接',
      recentLinkEmpty: '还没有最近发布记录。完成一次部署后，这里会提供快速打开入口。',
      openRecentLink: '打开最近链接',
    },
    quickPublish: {
      progressTitle: '正在发布 HTML…',
      progressCollecting: '正在收集文件…',
      progressZipping: '正在打包项目…',
      progressUploading: '正在上传…',
      progressSaving: '正在保存记录…',
      progressRetrying: '上传失败，正在重试（{attempt}/{max}）…',
      noTarget:
        '未找到可发布的 HTML。请打开一个 .html 文件，或在含 index.html 的文件夹中使用。',
      success: '发布成功：{url}',
      successCopied: '发布成功，链接已复制：{url}',
      openLink: '打开链接',
      copyLink: '复制链接',
      copied: '链接已复制到剪贴板',
      failed: '发布失败：{message}',
      unknownError: '未知错误',
    },
  },
  en: {
    panel: {
      panelTitle: 'Quick Static Site Publish',
      heroTitle: 'Quick Static Site Publish',
      heroDescription:
        'Publish local static HTML projects to a public URL. Supports 24-hour guest sharing and token-based long-term deployments.',
      languageSwitcherLabel: 'Language',
      folderSectionTitle: 'Project Folder',
      savedTokenBadge: 'Saved Token',
      emptyTokenBadge: 'No Saved Token',
      folderLabel: 'Choose the folder to publish',
      folderPlaceholder: 'Select a local static site folder',
      chooseFolder: 'Choose Folder',
      entryFileLabel: 'Entry File',
      entryFilePlaceholder: 'For example: index.html',
      entryCandidatesHint: 'Detected {count} HTML file(s). Choose the entry file to publish.',
      entryManualHint:
        'No HTML file was detected automatically. Enter the entry file path relative to the folder.',
      previousShareReusable: 'A previous deployment was found and can be updated: {url}',
      previousShareGuestUnavailable:
        'A previous guest deployment was found, but the update token is missing or the link can no longer be updated. A new link will be created: {url}',
      previousShareIdentityUnavailable:
        'A previous deployment was found, but the current identity cannot update this link directly: {url}',
      identitySectionTitle: 'Deployment Identity',
      savedModeTitle: 'Use Saved Token',
      savedModeDesc: 'Best for keeping links long-term and updating future versions',
      customModeTitle: 'Enter New Token',
      customModeDesc: 'Deploy with a registered account and optionally save the token locally',
      guestModeTitle: 'Guest Publish',
      guestModeDesc: 'No sign-in required, but the generated link only lasts 24 hours',
      tokenLabel: 'Token',
      tokenPlaceholder: 'Enter your HTML to Link token',
      howToGetToken: 'Get Token',
      customTokenHint:
        'You can start with guest publishing first. If you need persistent links, use the button above to learn how to get a token.',
      saveTokenLabel: 'Save this token so future publishes can reuse it',
      guestNote:
        'You are using guest publish mode. The published link lasts for 24 hours only. Use a token if you need long-term links and version updates.',
      deploy: 'Start Publish',
      deploying: 'Publishing...',
      deployProgressCollecting: 'Collecting files...',
      deployProgressZipping: 'Packaging project...',
      deployProgressUploading: 'Uploading content...',
      deployProgressSaving: 'Saving record...',
      deployProgressRetrying: 'Upload failed temporarily, retrying ({attempt}/{max})...',
      clearSavedToken: 'Clear Saved Token',
      deployOptionsTitle: 'Publish Options',
      reuseExistingDeployment:
        'If a previous deployment is found, create the new version on the existing link',
      currentFolderHint: 'Current folder: {folderPath}',
      deployHintWithoutFolder:
        'After you choose a folder, the extension will try to detect the entry file automatically.',
      resultSectionTitle: 'Publish Result',
      openLastLink: 'Open Last Link',
      resultEmpty: 'The public link will appear here after publishing.',
      copyLink: 'Copy Link',
      openLink: 'Open Link',
      footer: 'Works in VS Code, Cursor, Trae, and other editors built on the VS Code extension ecosystem.',
      guestConfirmTitle: 'Confirm Guest Publish',
      guestConfirmText:
        'This will publish as a guest. It is great for quick sharing, but the link only lasts 24 hours.',
      guestConfirmList: [
        'A public URL is returned immediately after a successful publish.',
        'Guest links expire and are not suitable for long-term version history.',
        'Use token publishing if you want long-term management and repeated updates.',
      ],
      guestConfirmCancel: 'Use Token Instead',
      guestConfirmAction: 'Continue as Guest',
      clearTokenTitle: 'Clear Saved Token?',
      clearTokenText:
        'This removes the HTML to Link token saved in the current editor, so it can no longer be reused directly.',
      clearTokenList: [
        'Previously generated links are not affected.',
        'You can always enter and save a token again later.',
        'If you only want a temporary link, switch to guest publish mode instead.',
      ],
      clearTokenCancel: 'Cancel',
      clearTokenAction: 'Clear Token',
      tokenHelpTitle: 'How To Get A Token',
      tokenHelpText:
        'Publishing with a token keeps links available long-term and makes later updates easier.',
      tokenHelpSteps: [
        {
          title: 'Create or sign in to your account',
          text: 'Open https://htmlto.link/ and complete sign up or sign in first.',
        },
        {
          title: 'Open the settings page',
          text: 'After signing in, visit https://htmlto.link/settings .',
        },
        {
          title: 'Copy the token and paste it here',
          text: 'Find the API Token in settings, copy it, then return to the extension and paste it.',
        },
      ],
      tokenHelpClose: 'Got It',
      tokenHelpOpenHome: 'Open Home Page',
      tokenHelpOpenSettings: 'Open Settings',
      toastTitleInfo: 'Info',
      toastTitleSuccess: 'Done',
      toastTitleWarning: 'Warning',
      toastTitleError: 'Error',
      toastPromptEnterToken: 'Enter a token in the panel. You can save it locally for later use.',
      toastCopied: 'The link has been copied.',
      toastClearedToken: 'The saved token has been cleared.',
      toastNoLastLink: 'There is no published link to open yet.',
      toastReuseUnavailable:
        'The previous deployment record cannot be reused right now, so a new link will be created.',
      toastDeploySuccessCopied: 'Publish succeeded. The link was copied: {url}',
      toastDeploySuccess: 'Publish succeeded: {url}',
      errorChooseFolder: 'Choose a folder to publish first.',
      errorEntryRequired: 'Enter the entry file first.',
      errorSavedTokenMissing:
        'No saved token is available. Enter a new token or switch to guest publish mode.',
      errorCustomTokenRequired: 'Enter a token first.',
      errorDeployFailed: 'Publish failed: {message}',
      unknownError: 'Unknown error',
    },
    sidebar: {
      headerTitle: 'Quick Static Site Publish',
      headerDescription:
        'A fixed sidebar entry for opening the full publish panel, selecting a folder, configuring a token, and jumping back to the latest public link.',
      fixedEntryBadge: 'Pinned Entry',
      savedTokenBadge: 'Saved Token',
      emptyTokenBadge: 'No Saved Token',
      recommendedSavedTitle: 'Recommended: publish with your saved token',
      recommendedSavedDesc: 'Best for keeping links long-term and updating the same link later.',
      recommendedGuestTitle: 'Recommended: quick guest publish',
      recommendedGuestDesc:
        'No saved token was detected. Guest publish works well for temporary sharing.',
      openPanel: 'Open Full Publish Panel',
      deployFolder: 'Choose Folder And Publish',
      tokenSettings: 'Open Token Settings',
      recentFolderTitle: 'Recent Project Folder',
      recentFolderEmpty: 'No recent folder yet. Choose a static site folder to get started.',
      continueFolder: 'Continue Publishing This Folder',
      recentLinkTitle: 'Recent Published Link',
      recentLinkEmpty: 'No recent publish yet. After one successful publish, a quick open action appears here.',
      openRecentLink: 'Open Recent Link',
    },
    quickPublish: {
      progressTitle: 'Publishing HTML…',
      progressCollecting: 'Collecting files…',
      progressZipping: 'Packaging project…',
      progressUploading: 'Uploading…',
      progressSaving: 'Saving record…',
      progressRetrying: 'Upload failed, retrying ({attempt}/{max})…',
      noTarget:
        'No publishable HTML found. Open a .html file, or use a folder that contains index.html.',
      success: 'Published: {url}',
      successCopied: 'Published and copied: {url}',
      openLink: 'Open Link',
      copyLink: 'Copy Link',
      copied: 'Link copied to clipboard',
      failed: 'Publish failed: {message}',
      unknownError: 'Unknown error',
    },
  },
}

export function normalizeUiLocale(locale?: string): UiLocale {
  return locale?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export function isUiLocale(value: string): value is UiLocale {
  return value === 'zh-CN' || value === 'en'
}

export async function getPreferredUiLocale(
  context: vscode.ExtensionContext
): Promise<UiLocale> {
  const stored = context.globalState.get<string>(UI_LOCALE_KEY)
  if (stored && isUiLocale(stored)) {
    return stored
  }
  return normalizeUiLocale(vscode.env.language)
}

export async function setPreferredUiLocale(
  context: vscode.ExtensionContext,
  locale: UiLocale
) {
  await context.globalState.update(UI_LOCALE_KEY, locale)
}

export function formatMessage(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
  }, template)
}
