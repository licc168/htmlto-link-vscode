# HTML to Link VS Code 插件计划

## 1. 背景

当前方向已经明确收敛，不再做“编辑 Markdown / 选模板 / 实时预览”的网页能力迁移。

这个插件的目标改为：

- 选择本地静态站点文件夹
- 未登录用户可直接部署，但链接只保留 24 小时
- 已注册用户可填写 Token，部署后可获得长期可管理链接
- 一键上传并部署
- 部署成功后直接返回 URL

目标目录：

- `d:\licc\htmltolink\htmlto-link-vscode`


## 2. 产品目标

### 2.1 总体目标

做一个非常轻量的部署插件，优先解决“把本地静态 HTML 项目快速发布到 htmlto.link”这个核心需求。

插件不承担以下职责：

- 不做 Markdown 编辑器
- 不做模板系统
- 不做网页端卡片预览
- 不做复杂用户中心
- 不做支付和站点后台

### 2.2 首版核心能力

首版只保留以下关键流程：

1. 选择一个本地文件夹
2. 自动识别或让用户指定入口文件
3. 询问是否使用 Token
4. 未填写 Token 时提示“链接仅保留 24 小时”
5. 填写 Token 时按注册用户流程部署
6. 一键上传压缩包到服务端
7. 返回部署 URL 并自动复制


## 3. 用户流程

### 3.1 游客流程

1. 用户执行部署命令
2. 选择本地项目文件夹
3. 插件识别入口文件，例如 `index.html`
4. 插件提示：未登录部署生成的链接仅保留 24 小时
5. 用户确认继续
6. 插件打包文件夹并上传
7. 服务端返回分享链接
8. 插件展示 URL，并支持复制和打开

### 3.2 已注册用户流程

1. 用户执行部署命令
2. 选择本地项目文件夹
3. 识别入口文件
4. 用户填写 Token，或使用已保存 Token
5. 插件打包并上传
6. 服务端返回部署 URL
7. 插件展示 URL，并将返回信息缓存到本地配置文件，便于后续更新版本


## 4. 核心设计原则

### 4.1 只做部署，不做编辑器

插件只负责“把已有静态项目发布出去”，不负责“在插件里生产内容”。

这样做的好处：

- 交互更简单
- 开发周期更短
- 更接近真实使用场景
- 更容易兼容 VS Code、Cursor、Trae

### 4.2 优先命令式交互

首版不强依赖复杂 Webview 面板，优先使用 VS Code 原生交互能力：

- `showOpenDialog` 选择文件夹
- `showInputBox` 输入 Token
- `showWarningMessage` 提示游客链接有效期
- `showInformationMessage` 返回部署结果

只有在后续需要显示部署历史、版本信息时，再考虑补一个简单面板。

### 4.3 兼容多宿主

为了兼容 VS Code / Cursor / Trae，首版尽量只使用标准 `vscode` API：

- 命令注册
- 选择目录
- 输入框
- 配置读取
- 通知消息
- 打开外部链接
- 剪贴板


## 5. 现有项目可复用能力

### 5.1 可直接复用

可以优先参考现有部署 Skill 的思路：

- [html-to-link-deploy-zh/SKILL.md](file:///d:/licc/htmltolink/html2url/test/.trae/skills/html-to-link-deploy-zh/SKILL.md)

这部分已经包含了首版插件最核心的能力模型：

- 打包当前项目目录
- 排除不需要上传的目录
- 调用 `https://htmlto.link/api/skill/deploy`
- 支持新建链接或在已有链接上更新版本

### 5.2 插件侧需要新增的能力

插件和 Skill 不同的部分主要是：

- 图形化选择文件夹
- Token 输入与保存
- 游客 24 小时提示
- 入口文件自动识别
- 部署结果弹窗与复制 URL
- 更稳定的本地配置持久化


## 6. 推荐技术方案

### 6.1 总体架构

建议采用两层结构即可：

### A. 扩展宿主层

负责：

- 注册命令
- 选择文件夹
- 读取配置
- 询问 Token
- 展示提示信息
- 打开 URL
- 复制结果

### B. 部署核心层

负责：

- 扫描文件夹
- 识别入口文件
- 过滤不需要上传的目录
- 生成 zip
- 调用部署接口
- 解析返回结果
- 保存部署记录

### 6.2 为什么首版不需要 Webview

当前目标非常明确，核心只是一条部署链路：

- 选目录
- 传 Token 或匿名部署
- 上传
- 返回 URL

这类流程用原生命令交互即可完成，不值得先引入 Webview 和复杂前端。


## 7. 推荐目录结构

```text
htmlto-link-vscode/
  docs/
    vscode-plugin-plan.md
  src/
    extension.ts
    commands/
      deployFolder.ts
      selectFolder.ts
      setToken.ts
      clearToken.ts
    core/
      deploy/
        detectEntryFile.ts
        collectFiles.ts
        zipProject.ts
        deployClient.ts
        deploymentState.ts
      config/
        tokenStore.ts
        workspaceState.ts
    utils/
      notifications.ts
      openExternal.ts
  package.json
  tsconfig.json
  README.md
```


## 8. MVP 范围

### 8.1 首版必须实现

- 命令：选择文件夹并部署
- 自动识别入口文件，默认优先 `index.html`
- 无 Token 时提示“链接仅保留 24 小时”
- 支持用户输入 Token
- 支持保存 Token 到配置或 Secret Storage
- 打包目录为 zip
- 调用部署接口
- 返回并复制部署 URL
- 成功后支持一键打开结果页面

### 8.2 首版可延后

- 部署历史列表
- 已有分享链接的版本更新界面
- 多环境配置
- 可视化部署面板
- 本地预览
- 站点模板能力

### 8.3 MVP 判断标准

只要用户可以在编辑器里：

1. 选中文件夹
2. 选择是否使用 Token
3. 完成部署
4. 拿到 URL

就说明首版目标已经成立。


## 9. 关键交互设计

### 9.1 Token 交互

建议交互顺序如下：

1. 先检查本地是否已保存 Token
2. 如果已保存，询问：
   - 使用已保存 Token
   - 重新输入 Token
   - 不使用 Token，按游客部署
3. 如果没有 Token，询问：
   - 输入 Token
   - 跳过，按游客部署

### 9.2 游客提示

在未使用 Token 的情况下，部署前必须明确提示：

- 当前为未登录部署
- 返回的链接仅保留 24 小时
- 若需长期保存和后续更新，请使用注册账号的 Token

### 9.3 入口文件处理

建议规则：

1. 优先查找 `index.html`
2. 若不存在，查找文件夹中其他 `.html` 文件
3. 若仍不明确，则让用户手动输入或选择入口文件

### 9.4 成功反馈

部署成功后建议提供这些操作：

- 复制 URL
- 在浏览器中打开
- 保存部署记录


## 10. 服务对接方案

### 10.1 首版接口方向

首版直接对接现有部署接口：

- `POST https://htmlto.link/api/skill/deploy`

建议请求字段沿用现有 Skill 方案：

- `file`
- `entry_file`
- `title`
- `share_url`（如果是更新已有链接）

认证方式：

- 有 Token 时：`Authorization: Bearer <token>`
- 无 Token 时：不带 Authorization，按游客逻辑处理

### 10.2 本地记录建议

部署成功后建议在项目目录保存一个本地元数据文件，例如：

- `.htmltolink.json`

可存储：

- `shareUrl`
- `versionNo`
- `entryFile`
- `lastDeployTime`
- `projectPath`

这样后续可以支持“更新已有链接”而不是每次新建。


## 11. 分阶段实施计划

### 阶段一：初始化扩展工程

目标：

- 创建标准 VS Code 扩展工程
- 建立命令入口
- 跑通本地调试

输出：

- `package.json`
- `src/extension.ts`
- 基础命令注册

### 阶段二：完成本地部署链路

目标：

- 选择文件夹
- 自动识别入口文件
- 过滤无关目录
- 打包 zip

输出：

- `detectEntryFile.ts`
- `collectFiles.ts`
- `zipProject.ts`

### 阶段三：接入服务端部署

目标：

- 调用部署接口
- 处理 Token 和游客模式
- 处理返回 URL

输出：

- `deployClient.ts`
- `deploymentState.ts`

### 阶段四：优化用户体验

目标：

- 保存 Token
- 保存部署记录
- 返回链接后一键复制与打开
- 错误提示更清晰

### 阶段五：跨编辑器验证与打包

目标：

- 在 VS Code 中验证
- 在 Cursor 中安装验证
- 在 Trae 中安装验证
- 打包为 `vsix`


## 12. 跨编辑器兼容策略

Cursor 和 Trae 都建立在 VS Code 扩展生态之上，因此这个轻量插件天然更容易迁移。

首版重点验证：

- 文件夹选择是否一致
- 输入 Token 的交互是否一致
- 通知与打开链接是否一致
- 剪贴板复制是否一致
- Secret Storage 或配置存储是否一致

首版尽量避免：

- 复杂 Webview
- 宿主私有 API
- 平台特有能力依赖


## 13. 主要风险与难点

### 13.1 匿名部署规则

服务端需要明确支持：

- 无 Token 的游客上传
- 返回 24 小时有效链接

如果服务端当前还没有完整游客模式，插件开发前需要先确认接口规则。

### 13.2 入口文件识别

有些静态项目并不一定使用 `index.html`，需要处理：

- 多 HTML 文件
- 构建产物路径不规范
- 单页应用资源相对路径问题

### 13.3 打包过滤规则

需要明确哪些目录默认排除，例如：

- `node_modules`
- `.git`
- `.next`
- `dist/cache`
- `.turbo`

否则上传包会过大，影响体验。


## 14. 推荐开发顺序

建议按以下顺序推进：

1. 先搭扩展骨架
2. 先做“选择文件夹并部署”命令
3. 再补 Token 逻辑
4. 再补 `.htmltolink.json` 持久化
5. 最后补跨编辑器兼容验证


## 15. 首版建议命令

- `HTML to Link: Deploy Folder`
- `HTML to Link: Set Token`
- `HTML to Link: Clear Token`
- `HTML to Link: Open Last Deploy URL`


## 16. 首版建议配置项

- `htmlToLink.apiBaseUrl`
- `htmlToLink.autoCopyUrl`
- `htmlToLink.defaultEntryFile`
- `htmlToLink.excludePatterns`


## 17. 结论

当前最合理的插件方向不是把网页端编辑器搬进 VS Code，而是做成一个“静态项目一键部署插件”。

这个方向的特点是：

- 功能边界清晰
- 用户路径极短
- 开发复杂度低
- 更容易快速上线
- 更适合迁移到 Cursor、Trae 等宿主


## 18. 下一步建议

文档确认后，下一步直接进入开发：

1. 初始化 `htmlto-link-vscode` 扩展工程
2. 先实现 `Deploy Folder` 命令
3. 接入 Token / 游客模式
4. 打通部署接口并返回 URL

