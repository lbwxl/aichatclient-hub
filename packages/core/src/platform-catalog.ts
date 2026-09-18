import type { PlatformId } from '@aichat/contracts'
import { PlatformRegistry, type PlatformModule } from '@aichat/platform-sdk'

import { douyinPlatform } from '@aichat/platform-douyin'

export const platformModules: readonly PlatformModule[] = [
  douyinPlatform
]

export const platformRegistry = new PlatformRegistry(platformModules)

export const platformOptions = platformModules.map(({ manifest }) => ({
  id: manifest.id as PlatformId,
  label: manifest.displayName,
  color: manifest.color,
  host: manifest.host
}))
