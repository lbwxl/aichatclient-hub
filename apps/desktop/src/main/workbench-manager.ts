import { BrowserWindow, ipcMain } from 'electron'
import { MAIN_SERVER_BASE_URL } from '@aichat/backend-client'
import type { AppSettings, LogEntry, Shop, TaskAction, TaskResult } from '@aichat/contracts'
import { defaultSettings, workbenchCommandSchema } from '@aichat/contracts'
import type { PlatformScheduler } from '@aichat/platform-sdk'

const channel = 'workbench:log'

export interface WorkbenchManagerOptions {
  readonly scheduler: PlatformScheduler
  readonly emit: (channel: string, payload: unknown) => void
  /** Shared only with the composition root so platform runtimes can lazily
   * obtain a neutral WebContents evaluator after a window is created. */
  readonly webviewWindows?: Map<string, BrowserWindow>
}

export class WorkbenchManager {
  readonly #scheduler: PlatformScheduler
  readonly #windows = new Map<string, BrowserWindow>()
  readonly #webviewWindows: Map<string, BrowserWindow>
  readonly #logs: LogEntry[] = []
  readonly #emit: (channel: string, payload: unknown) => void
  #token: string | null = null
  #settings: AppSettings = defaultSettings
  #queue: Promise<unknown> = Promise.resolve()

  constructor(options: WorkbenchManagerOptions) {
    this.#scheduler = options.scheduler
    this.#emit = options.emit
    this.#webviewWindows = options.webviewWindows ?? this.#windows
  }

  register(): () => void {
    const handler = async (_event: Electron.IpcMainInvokeEvent, payload: unknown) => this.invoke(payload)
    ipcMain.handle('workbench:invoke', handler)
    return () => ipcMain.removeHandler('workbench:invoke')
  }

  async invoke(payload: unknown): Promise<unknown> {
    const command = workbenchCommandSchema.parse(payload)
    if (command.type === 'session') { this.#token = command.token; return { ok: true } }
    if (command.type === 'logs') return this.#logs.slice(-this.#settings.logLimit)
    if (command.type === 'settings') { if (command.value) this.#settings = command.value; return this.#settings }
    if (command.type === 'open') return this.open(command.shop)
    if (command.type === 'show') return this.show(command.shopId, command.bounds)
    if (command.type === 'hide') { this.#windows.forEach((window) => window.hide()); return { ok: true } }
    if (command.type === 'close') return this.close(command.shopId)
    if (command.type === 'task') return this.enqueue(command.shop, command.action)
  }

  async open(shop: Shop): Promise<{ ok: boolean }> {
    const existing = this.#windows.get(shop.id)
    if (existing && !existing.isDestroyed()) { existing.show(); return { ok: true } }

    const runtime = await this.#scheduler.startShop(shop)
    const webview = runtime.webview
    const window = new BrowserWindow({
      show: false,
      width: 1280,
      height: 800,
      title: shop.displayName,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webviewTag: true,
        ...(webview ? { partition: webview.getPartition(shop) } : {})
      }
    })
    this.#windows.set(shop.id, window)
    this.#webviewWindows.set(shop.id, window)
    window.on('closed', () => {
      this.#windows.delete(shop.id)
      this.#webviewWindows.delete(shop.id)
      void this.#scheduler.stopShop(shop.id).catch((error: unknown) => this.log('error', error instanceof Error ? error.message : String(error), shop))
    })

    if (webview) await window.loadURL(webview.getUrl(shop))
    window.show()
    this.log('info', `已打开${shop.displayName}的平台窗口`, shop)
    return { ok: true }
  }

  async restart(shop: Shop): Promise<{ ok: boolean }> {
    const runtime = await this.#scheduler.restartShop(shop)
    const window = this.#windows.get(shop.id)
    if (window && !window.isDestroyed()) {
      if (runtime.webview) await window.loadURL(runtime.webview.getUrl(shop))
      window.show()
    } else {
      await this.open(shop)
    }
    return { ok: true }
  }

  enqueue(shop: Shop, action: TaskAction): Promise<TaskResult> {
    const next = this.#queue.then(() => this.runTask(shop, action))
    this.#queue = next.catch(() => undefined)
    return next
  }

  async runTask(shop: Shop, action: TaskAction): Promise<TaskResult> {
    await this.open(shop)
    const runtime = this.#scheduler.get(shop.id)
    const session = await runtime.auth?.getSession(shop)
    if (!session?.authenticated) {
      this.log('info', `${shop.displayName} 等待登录`, shop)
      return { message: '需要在平台窗口完成登录', authenticated: false }
    }

    if (action === 'auth') {
      this.log('info', `${shop.displayName} 已登录`, shop)
      return { message: '已登录', authenticated: true, externalId: session.externalId }
    }

    if (action === 'sync-products') {
      if (!runtime.products) return { message: '当前平台不支持商品同步', authenticated: true }
      const products = await runtime.products.syncProducts(shop)
      await this.request('goods/syncIds', products.map((product) => ({
        goods_id: product.externalId,
        platform_en: shop.platformId,
        shop_id: Number(shop.id)
      })))
      this.log('info', `${shop.displayName} 已同步 ${products.length} 个商品`, shop)
      return { message: `已同步 ${products.length} 个商品`, count: products.length, authenticated: true }
    }

    const result = await this.request<TaskResult>('goods/learn-shop', { shop_id: Number(shop.id), platform_en: shop.platformId })
    this.log('info', `${shop.displayName} 商品学习任务已提交`, shop)
    return { ...result, message: result.message || '商品学习任务已提交', authenticated: true }
  }

  async show(shopId: string, bounds: Electron.Rectangle): Promise<{ ok: boolean }> {
    const window = this.#windows.get(shopId)
    if (!window) return { ok: false }
    window.setBounds(bounds)
    window.show()
    return { ok: true }
  }

  async close(shopId: string): Promise<{ ok: boolean }> {
    await this.#scheduler.stopShop(shopId)
    const window = this.#windows.get(shopId)
    if (window && !window.isDestroyed()) window.close()
    return { ok: true }
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.#windows.keys()].map((shopId) => this.close(shopId)))
    await this.#scheduler.dispose()
  }

  async request<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${MAIN_SERVER_BASE_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.#token ? { Authorization: `Bearer ${this.#token}` } : {}) },
      body: JSON.stringify(body)
    })
    if (!response.ok) throw new Error(`后端请求失败（${response.status}）`)
    const payload = await response.json() as { data?: T; message?: string }
    return (payload.data ?? payload) as T
  }

  log(level: LogEntry['level'], message: string, shop?: Shop): void {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      time: new Date().toISOString(),
      level,
      message,
      ...(shop ? { shopId: shop.id, platformId: shop.platformId } : {})
    }
    this.#logs.push(entry)
    if (this.#logs.length > this.#settings.logLimit) this.#logs.splice(0, this.#logs.length - this.#settings.logLimit)
    this.#emit(channel, entry)
  }
}

export { channel as WORKBENCH_LOG_CHANNEL }
