import type {
  GatewayResult,
  PlatformManifest,
  PlatformMessage,
  Product,
  SendMessageCommand,
  Shop
} from '@aichat/contracts'

import type {
  PlatformModule,
  PlatformRuntime,
  PlatformRuntimeContext
} from './types'

export interface FakePlatformOptions {
  readonly id?: PlatformManifest['id']
  readonly displayName?: string
  readonly host?: PlatformManifest['host']
  readonly failStart?: boolean | ((shop: Shop) => boolean)
  readonly failStop?: boolean | ((shop: Shop) => boolean)
  readonly products?: readonly Product[]
}

export interface FakePlatformState {
  startCount: number
  stopCount: number
  startsByShop: Record<string, number>
  stopsByShop: Record<string, number>
  sentMessages: SendMessageCommand[]
  handoffs: Array<{ shopId: string; conversationId: string }>
}

const ok = <T>(data: T): GatewayResult<T> => ({ ok: true, data })

const shouldFail = (value: boolean | ((shop: Shop) => boolean) | undefined, shop: Shop): boolean => {
  return typeof value === 'function' ? value(shop) : value === true
}

/** A deterministic platform used by SDK contract tests and local composition. */
export class FakePlatform implements PlatformModule {
  readonly manifest: PlatformManifest
  readonly state: FakePlatformState = {
    startCount: 0,
    stopCount: 0,
    startsByShop: {},
    stopsByShop: {},
    sentMessages: [],
    handoffs: []
  }
  readonly #options: FakePlatformOptions

  constructor(options: FakePlatformOptions = {}) {
    this.#options = options
    this.manifest = {
      id: options.id ?? 'fake',
      displayName: options.displayName ?? 'Fake Platform',
      host: options.host ?? 'service',
      capabilities: ['messaging', 'goods-sync'],
      color: '#64748b'
    }
  }

  createRuntime(context: PlatformRuntimeContext): PlatformRuntime {
    const platform = this
    let started = false
    let stopped = false
    const session = {
      shopId: context.shop.id,
      platformId: this.manifest.id,
      externalId: `fake:${context.shop.id}`,
      authenticated: true,
      status: 'authenticated' as const,
      metadata: {}
    }

    return {
      auth: {
        async getSession() {
          return session
        }
      },
      webview: {
        getUrl: (shop) => `https://fake.platform.local/${encodeURIComponent(shop.id)}`,
        getPartition: (shop) => `persist:platform-${this.manifest.id}-${shop.id}`,
        getPreload: () => undefined
      },
      messaging: {
        async sendMessage(command) {
          platform.state.sentMessages.push(command)
          return ok({ messageId: `fake-${command.requestId}` })
        },
        normalizeMessage: (payload): PlatformMessage | null => {
          if (!payload || typeof payload !== 'object') return null
          const value = payload as Record<string, unknown>
          const content = typeof value.content === 'string' ? value.content : null
          if (!content) return null
          return {
            id: String(value.id ?? `fake-${Date.now()}`),
            shopId: context.shop.id,
            conversationId: String(value.conversationId ?? 'fake-conversation'),
            senderId: String(value.senderId ?? 'fake-customer'),
            senderName: String(value.senderName ?? 'Fake Customer'),
            content,
            direction: 'incoming',
            contentType: 'text',
            receivedAt: new Date().toISOString(),
            raw: payload
          }
        }
      },
      products: {
        async syncProducts() {
          return platform.#options.products ?? [{
            id: `fake-product-${context.shop.id}`,
            shopId: context.shop.id,
            platformId: platform.manifest.id,
            externalId: `product-${context.shop.id}`,
            title: 'Fake Product',
            description: '',
            currency: 'CNY',
            images: [],
            skus: [],
            metadata: {}
          }]
        }
      },
      handoff: {
        async handoff(input) {
          platform.state.handoffs.push({ shopId: input.shopId, conversationId: input.conversationId })
          return { accepted: true, handoffId: `fake-handoff-${input.conversationId}`, message: '', metadata: {} }
        }
      },
      async start() {
        if (started) return
        if (shouldFail(platform.#options.failStart, context.shop)) throw new Error('Fake platform start failed')
        started = true
        stopped = false
        platform.state.startCount += 1
        platform.state.startsByShop[context.shop.id] = (platform.state.startsByShop[context.shop.id] ?? 0) + 1
      },
      async stop() {
        if (stopped || !started) return
        if (shouldFail(platform.#options.failStop, context.shop)) throw new Error('Fake platform stop failed')
        stopped = true
        platform.state.stopCount += 1
        platform.state.stopsByShop[context.shop.id] = (platform.state.stopsByShop[context.shop.id] ?? 0) + 1
      }
    }
  }
}

export const createFakePlatform = (options: FakePlatformOptions = {}): FakePlatform => new FakePlatform(options)

export const fakePlatform = new FakePlatform()
