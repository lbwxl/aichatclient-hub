import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'

import { createPlatformScheduler } from '../bootstrap/platform-registry'
import { registerIpcRouter, type IpcMainTransport } from './ipc-router'
import { WorkbenchManager } from './workbench-manager'

const createIpcTransport = (): IpcMainTransport => ({
  handle(channel, handler) {
    const wrapped = async (event: Electron.IpcMainInvokeEvent, payload: unknown) => handler(payload)
    ipcMain.handle(channel, wrapped)
    return () => ipcMain.removeHandler(channel)
  },
  emit(channel, payload) {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send(channel, payload)
    }
  }
})

const createWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: '小二智客',
    titleBarStyle: 'hidden',
    backgroundColor: '#f8fafc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      preload: join(__dirname, '../preload/index.cjs')
    }
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererUrl) void window.loadURL(rendererUrl)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
  return window
}

const installWindowHandlers = (): void => {
  ipcMain.handle('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize())
  ipcMain.handle('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return false
    if (window.isMaximized()) window.unmaximize()
    else window.maximize()
    return window.isMaximized()
  })
  ipcMain.handle('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close())
}

app.whenReady().then(() => {
  installWindowHandlers()

  const webviewWindows = new Map<string, BrowserWindow>()
  const scheduler = createPlatformScheduler({
    services: {
      getWebviewExecutor: (shop: { id: string }) => {
        const window = webviewWindows.get(shop.id)
        if (!window || window.isDestroyed()) return undefined
        return <T>(expression: string) => window.webContents.executeJavaScript(expression, true) as Promise<T>
      },
      isWebviewReady: (shop: { id: string }) => {
        const window = webviewWindows.get(shop.id)
        return Boolean(window && !window.isDestroyed() && !window.webContents.isLoadingMainFrame())
      }
    }
  })

  // Keep the shared IPC contract active even before platform drivers are wired.
  // Platform-specific work continues through the WebView runtime in the renderer.
  registerIpcRouter({
    transport: createIpcTransport(),
    scheduler
  })

  const manager = new WorkbenchManager({
    scheduler,
    webviewWindows,
    emit: (channel, payload) => {
      for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed()) window.webContents.send(channel, payload)
    }
  })
  manager.register()

  app.on('before-quit', () => { void manager.dispose() })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
