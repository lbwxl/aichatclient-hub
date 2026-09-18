import type { PlatformId } from '@aichat/contracts'

import { DuplicatePlatformError, PlatformNotRegisteredError } from './errors'
import type { PlatformModule, PlatformRegistryLike } from './types'

export const definePlatform = <T extends PlatformModule>(platform: T): T => platform

export class PlatformRegistry implements PlatformRegistryLike {
  readonly #platforms = new Map<PlatformId, PlatformModule>()

  constructor(platforms: readonly PlatformModule[] = []) {
    platforms.forEach((platform) => this.register(platform))
  }

  register(platform: PlatformModule): this {
    const { id } = platform.manifest
    if (this.#platforms.has(id)) throw new DuplicatePlatformError(id)
    this.#platforms.set(id, platform)
    return this
  }

  get(platformId: PlatformId): PlatformModule {
    const platform = this.#platforms.get(platformId)
    if (!platform) throw new PlatformNotRegisteredError(platformId)
    return platform
  }

  has(platformId: PlatformId): boolean {
    return this.#platforms.has(platformId)
  }

  list(): readonly PlatformModule[] {
    return [...this.#platforms.values()]
  }
}
