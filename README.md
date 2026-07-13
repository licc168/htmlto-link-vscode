# Quick Static Site Publish

One-click publish local static site folders from VS Code, Cursor, and Trae to `htmlto.link`. The extension opens a visual publish panel, detects entry HTML files automatically, and returns a public URL right after publishing.

一键将本地静态网站文件夹从 VS Code、Cursor、Trae 发布到 `htmlto.link`。插件会打开可视化发布面板，自动识别入口 HTML 文件，并在发布完成后立即返回公开访问链接。

## Overview / 简介

- Built for local static websites and frontend demo projects
- Publish directly from a folder without manually zipping and uploading files
- Detect root-level HTML files automatically and let users choose the entry file
- Support both guest publishing and token-based long-term publishing
- Return a public URL immediately after a successful publish

- 面向本地静态网站和前端演示项目
- 从文件夹直接发布，不需要手动压缩和上传
- 自动识别根目录 HTML 文件并让用户选择入口文件
- 同时支持游客临时发布和 Token 长期发布
- 发布成功后立即返回公开访问链接

## Features / 核心体验

- Open a visual panel and publish a selected folder with one click
- List detected HTML entry candidates automatically
- Use guest mode for quick temporary sharing
- Save a token for repeated publishing and long-term link management
- Copy or open the published URL right after deployment

- 在可视化面板中选择文件夹并一键发布
- 自动列出识别到的 HTML 入口候选项
- 支持游客模式，适合快速临时分享
- 支持保存 Token，便于重复发布和长期管理链接
- 发布成功后可直接复制或打开链接

## Entry Points / 入口方式

- Run `Quick Static Site Publish: Open Publish Panel` from the command palette
- Right-click a folder in the explorer and publish it directly
- Complete folder selection, entry HTML selection, token configuration, and result viewing inside the panel

- 在命令面板中执行 `Quick Static Site Publish: Open Publish Panel`
- 在资源管理器中右键文件夹后可直接发起发布
- 在面板内统一完成文件夹选择、入口 HTML 选择、Token 配置和发布结果查看

## Scope / 当前定位

This version focuses on one task only: publishing static sites. It does not include:

- Markdown editor
- Template selection
- Page preview editor
- User center capabilities

当前版本聚焦于“静态网站发布”这一个核心任务，不包含：

- Markdown 编辑器
- 模板选择
- 页面预览编辑器
- 用户中心能力

## Development / 开发

```bash
npm install
npm run build
```
