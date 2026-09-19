import type { DesktopBridge, GatewayResult, PlatformEvent, PlatformId, SendMessageCommand } from '@aichat/contracts'

import { DuplicatePlatformError, PlatformNotRegisteredError } from './errors'
import { PlatformRuntimeController } from './runtime'
import type {
  PlatformModule,
  PlatformModuleDefinition,
  PlatformRegistryLike,
  PlatformRuntimeContext
} from './types'

const unavailableBridge: DesktopBridge = {
  async connect(): Promise<GatewayResult> {
    return {
      ok: false,
      error: { code: 'BRIDGE_UNAVAILABLE', message: 'No desktop bridge was supplied', retryable: false }
    }
  },
  async disconnect(): Promise<GatewayResult> {
    return {
      ok: false,
      error: { code: 'BRIDGE_UNAVAILABLE', message: 'No desktop bridge was supplied', retryable: false }
    }
  },
  async sendMessage(): Promise<GatewayResult<{ messageId: string }>> {
    return {
      ok: false,
      error: { code: 'BRIDGE_UNAVAILABLE', message: 'No desktop bridge was supplied', retryable: false }
    }
  },
  subscribe(_listener: (event: PlatformEvent) => void): () => void {
    return () => undefined
  }
}

/**
 * Defines a public platform entry point. Existing hook-only platforms are
 * wrapped in a bridge-backed runtime so they can migrate incrementally.
 */
export const definePlatform = <T extends PlatformModuleDefinition>(
  platform: T
): PlatformModule & T => {
  if (platform.createRuntime) return platform as PlatformModule & T

  let normalized!: PlatformModule
  const createRuntime = (context: PlatformRuntimeContext) => new PlatformRuntimeController({
    registry: context.registry ?? new PlatformRegistry([normalized]),
    bridge: context.bridge ?? unavailableBridge,
    logger: context.logger
  })
  normalized = { ...platform, createRuntime }
  return normalized as PlatformModule & T
}

export class PlatformRegistry implements PlatformRegistryLike {
  readonly #platforms = new Map<PlatformId, PlatformModule>()

  constructor(platforms: readonly PlatformModuleDefinition[] = []) {
    platforms.forEach((platform) => this.register(platform))
  }

  register(platform: PlatformModuleDefinition): this {
    const normalized = definePlatform(platform)
    const { id } = normalized.manifest
    if (this.#platforms.has(id)) throw new DuplicatePlatformError(id)
    this.#platforms.set(id, normalized)
    return this
  }

  get(platformId: PlatformId | string): PlatformModule {
    const platform = this.#platforms.get(platformId as PlatformId)
    if (!platform) throw new PlatformNotRegisteredError(platformId as PlatformId)
    return platform
  }

  has(platformId: PlatformId): boolean {
    return this.#platforms.has(platformId)
  }

  list(): readonly PlatformModule[] {
    return [...this.#platforms.values()]
  }
}
