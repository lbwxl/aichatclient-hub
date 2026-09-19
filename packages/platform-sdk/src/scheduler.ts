import type { Shop } from '@aichat/contracts'

import { PlatformNotRegisteredError } from './errors'
import type {
  PlatformLogger,
  PlatformRuntime,
  PlatformSchedulerOptions,
  ScheduledRuntime
} from './types'

const consoleLogger: PlatformLogger = {
  debug: (message, context) => console.debug(`[platform-scheduler] ${message}`, context ?? {}),
  warn: (message, context) => console.warn(`[platform-scheduler] ${message}`, context ?? {}),
  error: (message, context) => console.error(`[platform-scheduler] ${message}`, context ?? {})
}

interface RuntimeEntry {
  readonly shop: Shop
  readonly runtime: PlatformRuntime
  readonly controller: AbortController
  status: ScheduledRuntime['status']
  startPromise: Promise<void> | null
  stopPromise: Promise<void> | null
}

/**
 * Owns one runtime per shop. A failed runtime is removed in isolation so it
 * cannot tear down runtimes belonging to other platforms or shops.
 */
export class PlatformScheduler {
  readonly #options: PlatformSchedulerOptions
  readonly #logger: PlatformLogger
  readonly #entries = new Map<string, RuntimeEntry>()

  constructor(options: PlatformSchedulerOptions)
  constructor(registry: PlatformSchedulerOptions['registry'], options?: Omit<PlatformSchedulerOptions, 'registry'>)
  constructor(
    optionsOrRegistry: PlatformSchedulerOptions | PlatformSchedulerOptions['registry'],
    extraOptions: Omit<PlatformSchedulerOptions, 'registry'> = {}
  ) {
    this.#options = 'registry' in optionsOrRegistry
      ? optionsOrRegistry
      : { ...extraOptions, registry: optionsOrRegistry }
    this.#logger = this.#options.logger ?? consoleLogger
  }

  async startShop(shop: Shop): Promise<PlatformRuntime> {
    const current = this.#entries.get(shop.id)
    if (current) {
      if (current.status === 'stopping' && current.stopPromise) await current.stopPromise
      else if (current.startPromise) await current.startPromise
      const active = this.#entries.get(shop.id)
      if (active && active.status === 'running') return active.runtime
    }

    const module = this.#options.registry.get(shop.platformId)
    const controller = new AbortController()
    const context = this.#options.createContext?.(shop, controller.signal, this.#options) ?? {
      shop,
      signal: controller.signal,
      logger: this.#logger,
      bridge: this.#options.bridge,
      registry: this.#options.registry,
      services: this.#options.services
    }
    const runtime = module.createRuntime(context)
    if (!runtime || typeof runtime.start !== 'function' || typeof runtime.stop !== 'function') {
      throw new TypeError(`Platform "${shop.platformId}" returned an invalid runtime`)
    }

    const entry: RuntimeEntry = {
      shop,
      runtime,
      controller,
      status: 'starting',
      startPromise: null,
      stopPromise: null
    }
    this.#entries.set(shop.id, entry)
    entry.startPromise = Promise.resolve()
      .then(() => runtime.start())
      .then(() => {
        if (controller.signal.aborted) return
        entry.status = 'running'
      })
      .catch((error: unknown) => {
        controller.abort()
        if (this.#entries.get(shop.id) === entry) this.#entries.delete(shop.id)
        this.#logger.error('Platform runtime failed to start', {
          platformId: shop.platformId,
          shopId: shop.id,
          error: error instanceof Error ? error.message : String(error)
        })
        throw error
      })

    await entry.startPromise
    return runtime
  }

  async stopShop(shopId: string): Promise<void> {
    const entry = this.#entries.get(shopId)
    if (!entry) return
    if (entry.stopPromise) return entry.stopPromise

    entry.status = 'stopping'
    entry.controller.abort()
    entry.stopPromise = Promise.resolve()
      .then(() => entry.runtime.stop())
      .catch((error: unknown) => {
        this.#logger.error('Platform runtime failed to stop', {
          platformId: entry.shop.platformId,
          shopId,
          error: error instanceof Error ? error.message : String(error)
        })
        throw error
      })
      .finally(() => {
        if (this.#entries.get(shopId) === entry) this.#entries.delete(shopId)
      })
    return entry.stopPromise
  }

  async restartShop(shop: Shop): Promise<PlatformRuntime> {
    await this.stopShop(shop.id)
    return this.startShop(shop)
  }

  getRuntime(shopId: string): PlatformRuntime | undefined {
    return this.#entries.get(shopId)?.runtime
  }

  get(shopId: string): PlatformRuntime {
    const runtime = this.getRuntime(shopId)
    if (!runtime) throw new Error(`No runtime is active for shop "${shopId}"`)
    return runtime
  }

  has(shopId: string): boolean {
    return this.#entries.has(shopId)
  }

  list(): readonly ScheduledRuntime[] {
    return [...this.#entries.values()].map(({ shop, runtime, status }) => ({ shop, runtime, status }))
  }

  async dispose(): Promise<void> {
    const results = await Promise.allSettled([...this.#entries.keys()].map((shopId) => this.stopShop(shopId)))
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (failure) throw failure.reason
  }
}

export { PlatformNotRegisteredError }
