import type {
  GatewayResult,
  HandoffInput,
  PlatformMessage,
  PlatformSession,
  Product,
  SendMessageCommand,
  Shop
} from '@aichat/contracts'
import type { PlatformRuntime, PlatformRuntimeContext } from '@aichat/platform-sdk'
import {
  createDoudianClient,
  type CdpEvaluate,
  type DoudianClient,
  type ProductRecord,
  type HookEvent
} from '@platform-hub/doudian-hook'

import { normalizeDoudianEvent } from './adapter'

interface DoudianRuntimeServices {
  getWebviewExecutor?: (shop: Shop) => CdpEvaluate | undefined
  isWebviewReady?: (shop: Shop) => boolean
}

const servicesFor = (context: PlatformRuntimeContext): DoudianRuntimeServices => {
  return (context.services ?? {}) as DoudianRuntimeServices
}

const unauthenticated = (shop: Shop, error?: string): PlatformSession => ({
  shopId: shop.id,
  platformId: shop.platformId,
  authenticated: false,
  status: 'unauthenticated',
  ...(error ? { metadata: { error } } : { metadata: {} })
})

const normalizeProduct = (shop: Shop, value: ProductRecord): Product => {
  const externalId = value.goodsId || value.id
  return {
    id: `${shop.id}:${externalId}`,
    shopId: shop.id,
    platformId: shop.platformId,
    externalId,
    title: value.name || externalId,
    description: value.description ?? '',
    price: Number.isFinite(value.price) ? value.price : undefined,
    currency: 'CNY',
    images: (value.images ?? []).filter((image): image is string => typeof image === 'string'),
    skus: (value.skuList ?? []).map((sku) => ({
      id: sku.skuId,
      name: sku.skuName,
      price: sku.skuPrice,
      metadata: {}
    })),
    metadata: {
      platform: value.platform,
      goodsUrl: value.goodsUrl,
      raw: value.raw
    }
  }
}

const gatewayError = (code: string, message: string): GatewayResult<never> => ({
  ok: false,
  error: { code, message, retryable: true }
})

const resultMessage = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '平台操作失败'
  const record = value as Record<string, unknown>
  return typeof record.error === 'string' ? record.error : '平台操作失败'
}

/** The Douyin package owns its Hook client and adapts it to the SDK drivers. */
export const createDouyinRuntime = (context: PlatformRuntimeContext): PlatformRuntime => {
  const services = servicesFor(context)
  let client: DoudianClient | null = null
  let installed = false
  let installPromise: Promise<void> | null = null

  const getClient = (): DoudianClient | null => {
    if (client) return client
    const evaluate = services.getWebviewExecutor?.(context.shop)
    if (!evaluate) return null
    client = createDoudianClient(evaluate)
    return client
  }

  const ensureInstalled = async (): Promise<DoudianClient | null> => {
    const next = getClient()
    if (!next) return null
    if (installed) return next
    installPromise ??= next.install().then(() => { installed = true }).finally(() => { installPromise = null })
    await installPromise
    return next
  }

  const getSession = async (shop = context.shop): Promise<PlatformSession> => {
    const next = await ensureInstalled()
    if (!next) return unauthenticated(shop, '抖店 WebView runtime 尚未连接')
    try {
      const state = await next.getAuthState()
      return {
        shopId: shop.id,
        platformId: shop.platformId,
        ...(state.shopId ? { externalId: state.shopId } : {}),
        authenticated: state.authenticated,
        status: state.authenticated ? 'authenticated' : 'unauthenticated',
        metadata: state
      }
    } catch (error) {
      return unauthenticated(shop, error instanceof Error ? error.message : String(error))
    }
  }

  return {
    auth: {
      getSession,
      async login() {
        const next = await ensureInstalled()
        if (!next) return unauthenticated(context.shop, '抖店 WebView runtime 尚未连接')
        const state = await next.waitForLogin()
        return {
          shopId: context.shop.id,
          platformId: context.shop.platformId,
          ...(state.shopId ? { externalId: state.shopId } : {}),
          authenticated: state.authenticated,
          status: state.authenticated ? 'authenticated' as const : 'unauthenticated' as const,
          metadata: state
        }
      },
      async logout() {
        await client?.dispose()
        client = null
        installed = false
      }
    },
    webview: {
      getUrl(shop) {
        const backend = shop.metadata.backend
        if (backend && typeof backend === 'object' && typeof (backend as { url?: unknown }).url === 'string') {
          return (backend as { url: string }).url
        }
        return 'https://im.jinritemai.com/pc_seller_v2/main/workspace'
      },
      getPartition(shop) {
        return `persist:platform-${shop.platformId}-${shop.id}`
      }
    },
    messaging: {
      async sendMessage(command: SendMessageCommand) {
        const next = await ensureInstalled()
        if (!next) return gatewayError('WEBVIEW_UNAVAILABLE', '抖店 WebView runtime 尚未连接')
        const result = await next.sendMessage(command.conversationId, command.content)
        if (result && typeof result === 'object' && (result.ok === false || result.success === false)) {
          return gatewayError('SEND_FAILED', resultMessage(result))
        }
        const candidateMessageId = result && typeof result === 'object' ? (result as Record<string, unknown>).messageId : undefined
        const messageId = typeof candidateMessageId === 'string' ? candidateMessageId : command.requestId
        return { ok: true, data: { messageId } }
      },
      normalizeMessage(payload) {
        return normalizeDoudianEvent(context.shop.id, payload as HookEvent) as PlatformMessage | null
      },
      subscribe(listener) {
        const next = getClient()
        if (!next) return () => undefined
        return next.subscribe((event) => {
          const message = normalizeDoudianEvent(context.shop.id, event)
          if (message) listener(message)
        })
      }
    },
    products: {
      async syncProducts(shop) {
        const next = await ensureInstalled()
        if (!next) return []
        const products = await next.collectProducts()
        return products.map((product) => normalizeProduct(shop, product))
      },
      async getProduct(shop, externalId) {
        const next = await ensureInstalled()
        if (!next) return null
        return normalizeProduct(shop, await next.getProductDetail(externalId))
      }
    },
    handoff: {
      async handoff(input: HandoffInput) {
        const next = await ensureInstalled()
        if (!next) return { accepted: false, message: '抖店 WebView runtime 尚未连接', metadata: {} }
        const result = await next.transferSession(input.conversationId, input.customerId ?? 'human')
        const accepted = Boolean(result && typeof result === 'object' && (result.ok !== false && result.success !== false))
        return { accepted, message: accepted ? '' : resultMessage(result), metadata: { raw: result } }
      }
    },
    async start() {
      if (services.isWebviewReady?.(context.shop)) await ensureInstalled()
    },
    async stop() {
      await client?.dispose()
      client = null
      installed = false
      installPromise = null
    }
  }
}
