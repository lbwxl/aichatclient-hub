import type { Shop } from '@aichat/contracts'
import { platformIdSchema } from '@aichat/contracts'
import { resourceClient } from './resources'
export * from './resources'
export { MAIN_SERVER_BASE_URL, MAIN_SERVER_CONFIG } from './config'

export interface BackendClientConfig {
  readonly baseUrl: string
  readonly tokenStore?: TokenStore
  readonly fetcher?: typeof fetch
}

export interface TokenStore {
  get(): string | null
  set(token: string): void
  clear(): void
}

export interface LoginInput {
  phone: string
  password: string
  rememberMe?: boolean
}

export interface PhoneLoginInput {
  phone: string
  code: string
  invitationCode?: string
}

export interface AuthUser {
  id: string
  username?: string
  nickname?: string
  avatar?: string
  [key: string]: unknown
}

export interface AuthSession {
  token: string
  refreshToken?: string
  expiresIn?: number
  user?: AuthUser
}

export interface BackendShop {
  id: number | string
  platform?: string
  platform_en?: string
  nick_name?: string
  username?: string
  shop_name?: string
  shop_id?: string
  shop_shop_id?: string
  url?: string
  logo?: string
  shop_avatar?: string
  auto?: boolean
  is_hidden?: boolean
  remark?: string
  customer_service_id?: string
  [key: string]: unknown
}

export interface ShopListResult {
  items: BackendShop[]
  total: number
  page: number
  page_size: number
}

export class BackendError extends Error {
  readonly code: string
  readonly status: number
  readonly retryable: boolean

  constructor(message: string, options: { code?: string; status?: number; retryable?: boolean } = {}) {
    super(message)
    this.name = 'BackendError'
    this.code = options.code ?? 'BACKEND_ERROR'
    this.status = options.status ?? 0
    this.retryable = options.retryable ?? this.status >= 500
  }
}

const browserTokenStore: TokenStore = {
  get: () => (typeof localStorage === 'undefined' ? null : localStorage.getItem('token')),
  set: (token) => { if (typeof localStorage !== 'undefined') localStorage.setItem('token', token) },
  clear: () => { if (typeof localStorage !== 'undefined') localStorage.removeItem('token') }
}

const unwrap = <T>(payload: unknown): T => {
  if (!payload || typeof payload !== 'object') return payload as T
  const body = payload as Record<string, unknown>
  if (body.code !== undefined && body.code !== 200 && body.code !== 0) {
    throw new BackendError(typeof body.message === 'string' ? body.message : '后端请求失败', { code: String(body.code) })
  }
  return (body.data ?? payload) as T
}

const toBackendShopPayload = (input: Partial<BackendShop>): Record<string, unknown> => {
  const { shop_shop_id, shop_id, ...rest } = input
  return { ...rest, ...(shop_id ?? shop_shop_id ? { shop_id: shop_id ?? shop_shop_id } : {}) }
}

export const toContractShop = (raw: BackendShop): Shop => {
  const externalId = String(raw.shop_id ?? raw.shop_shop_id ?? '')
  const aliases: Record<string, string> = { '抖店': 'douyin', '闲鱼': 'goofish', '拼多多': 'pinduoduo', '快手': 'kuaishou', '千牛': 'qianniu', '微信': 'wechat', '企业微信': 'wework' }
  const platformCandidate = raw.platform_en || aliases[raw.platform ?? ''] || String(raw.platform ?? 'unknown').toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const platform = platformIdSchema.safeParse(platformCandidate).success ? platformCandidate : 'unknown'
  return {
    id: String(raw.id),
    platformId: platform,
    displayName: raw.nick_name || raw.shop_name || raw.username || `店铺 ${raw.id}`,
    accountName: raw.username || raw.nick_name || '',
    externalId,
    ...(raw.shop_avatar || raw.logo ? { avatarUrl: raw.shop_avatar || raw.logo } : {}),
    autoReplyEnabled: raw.auto === true,
    unreadCount: 0,
    metadata: { backend: raw }
  }
}

export function createBackendClient(config: BackendClientConfig) {
  const fetcher = config.fetcher ?? fetch
  const tokenStore = config.tokenStore ?? browserTokenStore
  const baseUrl = config.baseUrl.replace(/\/$/, '')

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const headers = new Headers(init.headers)
    if (!headers.has('Accept')) headers.set('Accept', 'application/json')
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    const token = tokenStore.get()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    let response: Response
    try {
      response = await fetcher(`${baseUrl}/${path.replace(/^\//, '')}`, { ...init, headers })
    } catch (error) {
      throw new BackendError(error instanceof Error ? error.message : '网络连接失败', { code: 'NETWORK_ERROR', retryable: true })
    }
    const text = await response.text()
    let payload: unknown = null
    if (text) {
      try { payload = JSON.parse(text) } catch { payload = text }
    }
    if (!response.ok) {
      const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
      if (response.status === 401) tokenStore.clear()
      throw new BackendError(typeof body.detail === 'string' ? body.detail : typeof body.message === 'string' ? body.message : `请求失败（${response.status}）`, { status: response.status, code: response.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR' })
    }
    return unwrap<T>(payload)
  }

  const json = (method: string, path: string, body?: unknown) => request<unknown>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return {
    ...resourceClient(request),
    get token() { return tokenStore.get() },
    isAuthenticated: () => Boolean(tokenStore.get()),
    clearSession: () => tokenStore.clear(),
    async login(input: LoginInput) { const session = await json('POST', 'auth/login', input) as AuthSession; tokenStore.set(session.token); return session },
    async phoneLogin(input: PhoneLoginInput) { const session = await json('POST', 'auth/phone', input) as AuthSession; tokenStore.set(session.token); return session },
    sendSms: (phone: string) => json('POST', 'auth/send-sms', { phone }) as Promise<{ success: boolean }>,
    me: () => json('GET', 'users/me') as Promise<AuthUser>,
    listShops: (params: { platform_en?: string; page?: number; page_size?: number } = {}) => {
      const query = new URLSearchParams({
        ...(params.platform_en ? { platform_en: params.platform_en } : {}),
        page: String(params.page ?? 1),
        page_size: String(params.page_size ?? 100)
      })
      return json('GET', `shops/list?${query.toString()}`) as Promise<ShopListResult>
    },
    createShop: (input: Partial<BackendShop>) => json('POST', 'shops/create', toBackendShopPayload(input)) as Promise<BackendShop>,
    updateShop: (id: string | number, input: Partial<BackendShop>) => json('PUT', `shops/update/${id}`, toBackendShopPayload(input)) as Promise<BackendShop>,
    deleteShop: (id: string | number) => json('DELETE', `shops/delete/${id}`) as Promise<{ success: boolean }>,
    updateShopStatus: (shops: Array<{ id: string | number; auto: boolean }>) => json('PUT', 'shops/update-batch-status', { shops }) as Promise<unknown>,
    syncShops: (shops: Array<Partial<BackendShop>>) => json('POST', 'shops/sync', { shops: shops.map(toBackendShopPayload) }) as Promise<unknown>
  }
}

export type BackendClient = ReturnType<typeof createBackendClient>
