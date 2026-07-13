import * as vscode from 'vscode'

const emitter = new vscode.EventEmitter<void>()

export function onSidebarStateChanged(listener: () => void) {
  return emitter.event(listener)
}

export function notifySidebarStateChanged() {
  emitter.fire()
}
