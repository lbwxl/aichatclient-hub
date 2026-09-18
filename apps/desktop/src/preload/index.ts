import { contextBridge, ipcRenderer } from 'electron'

import { createDesktopBridge } from './desktop-bridge'

const desktopBridge = createDesktopBridge({
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  on: (channel, listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => listener(payload)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
})

contextBridge.exposeInMainWorld('desktopBridge', desktopBridge)
contextBridge.exposeInMainWorld('desktopWindow', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close')
})
contextBridge.exposeInMainWorld('workbench', {
  invoke: (command: unknown) => ipcRenderer.invoke('workbench:invoke', command),
  onLog: (listener: (payload: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => listener(payload)
    ipcRenderer.on('workbench:log', handler)
    return () => ipcRenderer.removeListener('workbench:log', handler)
  }
})
