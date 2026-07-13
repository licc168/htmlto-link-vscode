# HTML to Link VS Code

一个面向静态 HTML 项目的轻量部署插件，可以直接从 VS Code、Cursor、Trae 中把本地文件夹发布到 `htmlto.link`。

## 核心体验

- 选择本地文件夹后即可一键部署
- 自动识别入口 HTML 文件
- 支持游客部署
- 支持保存 Token，便于长期管理链接
- 部署成功后自动返回 URL

## 命令

- `HTML to Link: 部署文件夹`
- `HTML to Link: 设置 Token`
- `HTML to Link: 清除 Token`
- `HTML to Link: 打开最近部署链接`

## 当前定位

当前版本聚焦于“部署”这一个核心任务，不包含：

- Markdown 编辑器
- 模板选择
- 页面预览面板
- 用户中心能力

## 开发

```bash
npm install
npm run build
```
