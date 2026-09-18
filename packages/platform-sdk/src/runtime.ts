import {
  sendMessageCommandSchema,
  type GatewayResult,
  type PlatformEvent,
  type SendMessageCommand,
  type Shop
} from '@aichat/contracts'

import { PlatformOperationError } from './errors'
import type {
  PlatformHookContext,
  PlatformLogger,
  PlatformRuntimeOptions,
  RuntimeObserver
} from './types'

const consoleLogger: PlatformLogger = {
  debug: (message, context) => console.debug(`[platform] ${message}`, context ?? {}),
  warn: (message, context) => console.warn(`[platform] ${message}`, context ?? {}),
  error: (message, context) => console.error(`[platform] ${message}`, context ?? {})
}

const createRequestId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `request-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export class PlatformRuntime {
  readonly #controllers = new Map<string, AbortController>()
  readonly #shops = new Map<string, Shop>()
  readonly #observers = new Set<RuntimeObserver>()
  readonly #logger: PlatformLogger
  #unsubscribeBridge: (() => void) | null = null

  constructor(readonly options: PlatformRuntimeOptions) {
    this.#logger = options.logger ?? consoleLogger
  }

  start(): void {
    if (this.#unsubscribeBridge) return
    this.#unsubscribeBridge = this.options.bridge.subscribe((event) => this.#handleEvent(event))
  }

  observe(observer: RuntimeObserver): () => void {
    this.#observers.add(observer)
    return () => this.#observers.delete(observer)
  }

  async connect(shop: Shop): Promise<void> {
    this.start()
    this.#controllers.get(shop.id)?.abort()
    const controller = new AbortController()
    this.#controllers.set(shop.id, controller)
    this.#shops.set(shop.id, shop)

    const platform = this.options.registry.get(shop.platformId)
    const context = this.#context(shop, controller.signal)
    this.#emitStatus(shop.id, 'connecting')

    try {
      await platform.hooks.lifecycle?.beforeConnect?.(context)
      const result = await this.options.bridge.connect({
        shop,
        platform: shop.platformId,
        metadata: {}
      })
      this.#assertResult(result, 'CONNECT_FAILED')
      if (controller.signal.aborted) return
      await platform.hooks.lifecycle?.afterConnect?.(context, result)
      this.#emitStatus(shop.id, 'connected')
    } catch (error) {
      if (controller.signal.aborted) return
      await platform.hooks.lifecycle?.connectFailed?.(context, error)
      this.#emitStatus(shop.id, 'error', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  async disconnect(shop: Shop): Promise<void> {
    const existing = this.#controllers.get(shop.id)
    existing?.abort()
    const controller = new AbortController()
    this.#controllers.set(shop.id, controller)

    const platform = this.options.registry.get(shop.platformId)
    const context = this.#context(shop, controller.signal)
    this.#emitStatus(shop.id, 'disconnecting')
    try {
      await platform.hooks.lifecycle?.beforeDisconnect?.(context)
      const result = await this.options.bridge.disconnect({
        shopId: shop.id,
        platform: shop.platformId
      })
      this.#assertResult(result, 'DISCONNECT_FAILED')
      await platform.hooks.lifecycle?.afterDisconnect?.(context, result)
      this.#emitStatus(shop.id, 'idle')
      this.#shops.delete(shop.id)
      this.#controllers.delete(shop.id)
    } catch (error) {
      this.#emitStatus(shop.id, 'error', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  async sendMessage(
    shop: Shop,
    input: Pick<SendMessageCommand, 'conversationId' | 'content'> & {
      readonly metadata?: Readonly<Record<string, unknown>>
    }
  ): Promise<GatewayResult<{ messageId: string }>> {
    const platform = this.options.registry.get(shop.platformId)
    const controller = this.#controllers.get(shop.id) ?? new AbortController()
    const context = this.#context(shop, controller.signal)
    let command = sendMessageCommandSchema.parse({
      requestId: createRequestId(),
      shopId: shop.id,
      platformId: shop.platformId,
      conversationId: input.conversationId,
      content: input.content,
      metadata: input.metadata ?? {}
    })

    command = (await platform.hooks.messaging?.beforeSend?.(command, context)) ?? command
    command = sendMessageCommandSchema.parse(command)
    const result = await this.options.bridge.sendMessage(command)
    this.#assertResult(result, 'SEND_FAILED')
    await platform.hooks.messaging?.afterSend?.(command, result, context)
    return result
  }

  dispose(): void {
    this.#controllers.forEach((controller) => controller.abort())
    this.#controllers.clear()
    this.#shops.clear()
    this.#unsubscribeBridge?.()
    this.#unsubscribeBridge = null
    this.#observers.clear()
  }

  #context(shop: Shop, signal: AbortSignal): PlatformHookContext {
    return { shop, signal, logger: this.#logger }
  }

  #assertResult(result: GatewayResult<unknown>, fallbackCode: string): void {
    if (result.ok) return
    throw new PlatformOperationError(
      result.error?.message ?? 'Platform operation failed',
      result.error?.code ?? fallbackCode,
      result.error?.retryable ?? false
    )
  }

  #emitStatus(shopId: string, status: Parameters<NonNullable<RuntimeObserver['onStatus']>>[1], error?: string): void {
    this.#observers.forEach((observer) => observer.onStatus?.(shopId, status, error))
  }

  #handleEvent(event: PlatformEvent): void {
    this.#observers.forEach((observer) => observer.onEvent?.(event))
    if (event.type === 'connection-status') {
      this.#emitStatus(event.shopId, event.status, event.error)
      return
    }

    const shop = this.#shops.get(event.shopId)
    if (!shop) return
    let platform
    try {
      platform = this.options.registry.get(event.platformId)
    } catch (error) {
      this.#logger.warn('Ignoring event for an unregistered platform', {
        platformId: event.platformId,
        shopId: event.shopId,
        error: error instanceof Error ? error.message : String(error)
      })
      return
    }
    const controller = this.#controllers.get(shop.id) ?? new AbortController()
    try {
      const message = platform.hooks.messaging?.normalizeIncoming?.(
        event.payload,
        this.#context(shop, controller.signal)
      )
      if (message) this.#observers.forEach((observer) => observer.onMessage?.(message))
    } catch (error) {
      this.#logger.warn('Unable to normalize platform event', {
        platformId: event.platformId,
        shopId: event.shopId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}
