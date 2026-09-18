import { BrowserWindow, ipcMain } from 'electron'
import { MAIN_SERVER_BASE_URL } from '@aichat/backend-client'
import type { AppSettings, LogEntry, Shop, TaskAction, TaskResult, WorkbenchCommand } from '@aichat/contracts'
import { workbenchCommandSchema, defaultSettings } from '@aichat/contracts'
import type { DoudianClient } from '@aichat/platform-douyin'
import { createDoudianClient } from '@aichat/platform-douyin'

const channel = 'workbench:log'
type RuntimeWindow = BrowserWindow & { __shopId?: string; __client?: DoudianClient }

export class WorkbenchManager {
  readonly #windows = new Map<string, RuntimeWindow>()
  readonly #logs: LogEntry[] = []
  #token: string | null = null
  #settings: AppSettings = defaultSettings
  #queue: Promise<unknown> = Promise.resolve()

  constructor(private readonly emit: (channel: string, payload: unknown) => void) {}

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
    const backend = shop.metadata.backend as { url?: string } | undefined
    const window = new BrowserWindow({ show: false, width: 1280, height: 800, title: `${shop.displayName} · ${shop.platformId}`, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: true, partition: `persist:platform-${shop.platformId}-${shop.id}` } }) as RuntimeWindow
    window.__shopId = shop.id
    this.#windows.set(shop.id, window)
    window.on('closed', () => { this.#windows.delete(shop.id); void window.__client?.dispose() })
    const url = backend?.url || 'https://im.jinritemai.com/pc_seller_v2/main/workspace'
    await window.loadURL(url)
    this.log('info', `已打开${shop.displayName}的平台窗口`, shop)
    return { ok: true }
  }

  async #client(shop: Shop): Promise<DoudianClient> {
    await this.open(shop)
    const window = this.#windows.get(shop.id)
    if (!window) throw new Error('平台窗口未创建')
    if (!window.__client) {
      const evaluate = <T>(expression: string) => window.webContents.executeJavaScript(expression, true) as Promise<T>
      window.__client = createDoudianClient(evaluate)
      await window.__client.install()
    }
    return window.__client
  }

  enqueue(shop: Shop, action: TaskAction): Promise<TaskResult> {
    const next = this.#queue.then(() => this.runTask(shop, action))
    this.#queue = next.catch(() => undefined)
    return next
  }

  async runTask(shop: Shop, action: TaskAction): Promise<TaskResult> {
    const client = await this.#client(shop)
    if (action === 'auth') {
      const state = await client.getAuthState()
      this.log('info', state.authenticated ? `${shop.displayName} 已登录` : `${shop.displayName} 等待登录`, shop)
      return { message: state.authenticated ? '已登录' : '需要在平台窗口完成登录', authenticated: state.authenticated, externalId: state.shopId }
    }
    const auth = await client.getAuthState()
    if (!auth.authenticated) return { message: '请先在平台窗口完成登录', authenticated: false }
    if (action === 'sync-products') {
      const products = await client.collectProducts()
      await this.request('goods/syncIds', products.map((product) => ({ goods_id: product.goodsId, platform_en: shop.platformId, shop_id: Number(shop.id) })))
      this.log('info', `${shop.displayName} 已同步 ${products.length} 个商品`, shop)
      return { message: `已同步 ${products.length} 个商品`, count: products.length, authenticated: true }
    }
    const result = await this.request<TaskResult>('goods/learn-shop', { shop_id: Number(shop.id), platform_en: shop.platformId })
    this.log('info', `${shop.displayName} 商品学习任务已提交`, shop)
    return { ...result, message: result.message || '商品学习任务已提交', authenticated: true }
  }

  async show(shopId: string, bounds: Electron.Rectangle): Promise<{ ok: boolean }> { const window = this.#windows.get(shopId); if (!window) return { ok: false }; window.setBounds(bounds); window.show(); return { ok: true } }
  async close(shopId: string): Promise<{ ok: boolean }> { const window = this.#windows.get(shopId); if (window && !window.isDestroyed()) window.close(); return { ok: true } }

  async request<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${MAIN_SERVER_BASE_URL}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(this.#token ? { Authorization: `Bearer ${this.#token}` } : {}) }, body: JSON.stringify(body) })
    if (!response.ok) throw new Error(`后端请求失败（${response.status}）`)
    const payload = await response.json() as { data?: T; message?: string }
    return (payload.data ?? payload) as T
  }

  log(level: LogEntry['level'], message: string, shop?: Shop): void { const entry: LogEntry = { id: `${Date.now()}-${Math.random()}`, time: new Date().toISOString(), level, message, ...(shop ? { shopId: shop.id, platformId: shop.platformId } : {}) }; this.#logs.push(entry); if (this.#logs.length > this.#settings.logLimit) this.#logs.splice(0, this.#logs.length - this.#settings.logLimit); this.emit(channel, entry) }
}

export { channel as WORKBENCH_LOG_CHANNEL }
