# HTML 一键部署 / Static Site Publish

本插件用于把本地 `HTML` 文件或静态网站文件夹一键发布到 `htmlto.link`，适合静态部署、HTML 发布、落地页分享和前端演示。

## 中文说明

一键把本地 HTML 文件 / 静态网站文件夹发布成可公开访问的链接。

- **打开 HTML 即可发布**：编辑器标题栏点「发布」云图标，无需打开面板
- 不用手动压缩再上传
- 自动识别入口 HTML 文件
- 支持游客发布和 Token 发布
- 发布后立即获得公开 URL，并可自动复制

### 适合谁用

- HTML 落地页
- 前端演示项目和原型
- 导出的静态文档站点
- 需要快速分享的项目预览

### 最快路径：标题栏一键发布（推荐）

1. 在 VS Code / Cursor 中打开任意 `.html` 文件
2. 点击编辑器**标题栏右侧**的云上传图标「**发布**」
3. 等待打包上传，成功后 toast 展示公开链接（默认自动复制）

也可：

- 在编辑器中**右键** HTML →「发布」
- 在资源管理器中**右键** HTML 文件或文件夹 →「发布」

> **上传范围说明**：一键发布不是只传当前这一个 HTML，而是以当前 HTML 为**入口**，打包上传**整个项目目录**（同目录下的 CSS / JS / 图片等依赖会一起带走）。  
> - 已打开工作区时：上传范围为**工作区根目录**  
> - 未打开工作区、仅打开单个文件时：上传范围为**该 HTML 所在文件夹**  
> 大仓库里只想发子站时，请在资源管理器中右键对应**子文件夹**再发布，或使用发布面板手动选目录。

### 插件界面

![Quick Static Site Publish Chinese UI](https://image.albumshare.cn/hmltolink/vscode/zh_vscode.png)

### 这个插件做什么

- 直接发布本地静态网站文件夹，不用手动压缩再上传
- 打开 HTML 时标题栏一键发布，跳过面板
- 自动识别可作为入口的 HTML 文件
- 支持游客发布，适合快速临时分享
- 支持 Token 发布，适合重复部署和长期使用
- 部署完成后立即返回公开访问链接

### 快速开始

**方式 A：一键发布（最省事）**

1. 安装插件
2. 打开项目中的某个 `.html`
3. 点标题栏「发布」
4. 复制或打开生成的公开链接

**方式 B：发布面板（可选入口 / Token / 高级选项）**

1. 打开命令面板，执行 `静态网站一键发布: 打开发布面板`
2. 选择本地文件夹（打开面板时会尽量自动填入工作区根目录）
3. 确认入口 HTML 文件
4. 选择游客发布，或填写 Token
5. 复制或打开生成的公开链接

### 核心能力

- 编辑器标题栏 / 右键一键发布
- 一键发布文件夹（整目录打包 + 指定入口）
- 自动识别入口 HTML
- 打开面板时自动识别工作区根目录
- 支持游客模式
- 支持保存 Token
- 支持复制和打开发布结果

### 入口方式

| 入口 | 说明 |
|------|------|
| 编辑器标题栏「发布」 | 打开 `.html` 时显示，一键部署，不打开面板 |
| 编辑器右键「发布」 | 对当前 HTML 一键部署 |
| 资源管理器右键「发布」 | 对 HTML 文件或文件夹一键部署 |
| 命令面板 | `静态网站一键发布: 发布` / `打开发布面板` 等 |
| 左侧活动栏 | 「发布」视图，打开完整面板 |

### 命令

- `静态网站一键发布: 发布`（一键发布，跳过面板）
- `静态网站一键发布: 打开发布面板`
- `静态网站一键发布: 选择文件夹并发布`
- `静态网站一键发布: 打开 Token 设置`
- `静态网站一键发布: 清除已保存 Token`
- `静态网站一键发布: 打开最近发布链接`

### 配置项

- `htmlToLink.apiBaseUrl`：部署接口基础地址
- `htmlToLink.autoCopyUrl`：发布成功后自动复制链接
- `htmlToLink.defaultEntryFile`：自动识别入口文件时优先文件名
- `htmlToLink.excludePatterns`：打包上传时排除的目录和文件模式

### 说明

- 这个插件只聚焦静态网站发布
- 不包含页面编辑、模板生成或可视化搭建能力
- 同目录依赖会随项目目录一起上传；请使用相对路径引用资源

---

## English

Publish local `HTML` files and static site folders to `htmlto.link` in one click from VS Code, Cursor, or Trae.

- **Publish from the editor title bar**: open any `.html` and click the cloud-upload **Publish** icon — no panel required
- No manual zip and upload
- Automatic entry HTML detection
- Guest mode and token deployment
- Instant public URL after publish (auto-copy by default)

### Best For

- HTML landing pages
- Frontend demos and prototypes
- Exported static documentation sites
- Project previews you want to share fast

### Fastest Path: Title-Bar One-Click Publish (Recommended)

1. Open any `.html` file in VS Code / Cursor
2. Click the cloud-upload **Publish** icon on the **editor title bar**
3. Wait for packaging and upload; a toast shows the public URL (copied automatically by default)

You can also:

- **Right-click** the HTML in the editor → **Publish**
- **Right-click** an HTML file or folder in the Explorer → **Publish**

> **What gets uploaded?** One-click publish does **not** upload only the single HTML file. It uses the current HTML as the **entry** and packages the **whole project folder** (CSS / JS / images in the same tree are included).  
> - With a workspace open: upload root = **workspace root**  
> - Without a workspace (single file): upload root = **the HTML’s parent folder**  
> For a sub-site inside a large repo, right-click that **subfolder** in Explorer, or use the publish panel to pick the folder.

### Screenshot

![Quick Static Site Publish English UI](https://image.albumshare.cn/hmltolink/vscode/en_vscode.png)

### What It Does

- Publish a local static site folder without manually zipping and uploading
- One-click publish from the editor title bar (skips the panel)
- Detect candidate HTML entry files automatically
- Support guest publishing for quick temporary sharing
- Support token-based publishing for repeatable and longer-term use
- Return a public URL immediately after deployment

### Quick Start

**Option A: One-click publish (fastest)**

1. Install the extension
2. Open an `.html` file in your project
3. Click **Publish** on the title bar
4. Copy or open the public URL

**Option B: Publish panel (entry / token / advanced options)**

1. Open the command palette and run `Quick Static Site Publish: Open Publish Panel`
2. Choose a local folder (workspace root is preferred when available)
3. Confirm the detected entry HTML file
4. Publish as guest or enter your token
5. Copy or open the generated public URL

### Main Features

- Editor title-bar / context-menu one-click publish
- One-click folder publishing (full tree + entry file)
- Automatic entry HTML detection
- Auto-detect workspace root when opening the panel
- Guest mode support
- Saved token support
- Instant copy and open actions after publishing

### Entry Points

| Entry | Description |
|-------|-------------|
| Editor title bar **Publish** | Shown for `.html`; deploys without opening the panel |
| Editor context menu **Publish** | One-click deploy for the current HTML |
| Explorer context menu **Publish** | One-click deploy for an HTML file or folder |
| Command palette | `Quick Static Site Publish: Publish` / `Open Publish Panel`, etc. |
| Activity Bar | **Publish** view for the full panel |

### Commands

- `Quick Static Site Publish: Publish` (one-click, skips panel)
- `Quick Static Site Publish: Open Publish Panel`
- `Quick Static Site Publish: Select Folder and Publish`
- `Quick Static Site Publish: Open Token Settings`
- `Quick Static Site Publish: Clear Saved Token`
- `Quick Static Site Publish: Open Last Published Link`

### Settings

- `htmlToLink.apiBaseUrl`: deployment API base URL
- `htmlToLink.autoCopyUrl`: automatically copy the public URL after publishing
- `htmlToLink.defaultEntryFile`: preferred entry file name when auto-detecting HTML
- `htmlToLink.excludePatterns`: file and directory patterns excluded from packaging

### Notes

- This extension focuses only on static site deployment
- It does not provide page editing, template generation, or visual page building
- Same-folder assets are uploaded with the project tree; use relative paths for resources
