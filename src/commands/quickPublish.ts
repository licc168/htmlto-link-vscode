import * as vscode from 'vscode'
import { HtmlToLinkPanel } from '../panel/HtmlToLinkPanel'

/**
 * 快捷发布命令：打开功能面板并自动触发部署。
 * - 从编辑器标题栏 / 右键菜单触发时，自动识别当前文件所在目录
 * - 面板内展示完整流程：Token 填写、部署进度、结果链接
 */
export function createQuickPublishCommand(context: vscode.ExtensionContext) {
  return async (resourceUri?: vscode.Uri) => {
    const uri =
      resourceUri ?? vscode.window.activeTextEditor?.document.uri

    await HtmlToLinkPanel.createOrShowAndDeploy(context, uri)
  }
}
