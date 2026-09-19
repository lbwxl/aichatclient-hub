import type { PlatformId } from '@aichat/contracts'
import {
  PlatformRegistry,
  PlatformScheduler,
  type PlatformModule,
  type PlatformSchedulerOptions
} from '@aichat/platform-sdk'
import { douyinPlatform } from '@aichat/platform-douyin'
import { goofishPlatform } from '@aichat/platform-goofish'
import { kuaishouPlatform } from '@aichat/platform-kuaishou'
import { pinduoduoPlatform } from '@aichat/platform-pinduoduo'
import { qianniuPlatform } from '@aichat/platform-qianniu'
import { wechatPlatform } from '@aichat/platform-wechat'
import { weworkPlatform } from '@aichat/platform-wework'

/**
 * The Desktop application is the composition root. Core only consumes the
 * SDK contracts and never decides which platform packages are installed.
 */
export const platformModules: readonly PlatformModule[] = [
  douyinPlatform,
  kuaishouPlatform,
  pinduoduoPlatform,
  goofishPlatform,
  qianniuPlatform,
  wechatPlatform,
  weworkPlatform
]

export const platformRegistry = new PlatformRegistry(platformModules)

export const createPlatformScheduler = (
  options: Omit<PlatformSchedulerOptions, 'registry'> = {}
): PlatformScheduler => new PlatformScheduler({ ...options, registry: platformRegistry })

export const platformScheduler = createPlatformScheduler()

export const platformOptions = platformRegistry.list().map(({ manifest }) => ({
  id: manifest.id as PlatformId,
  label: manifest.displayName,
  color: manifest.color,
  host: manifest.host
}))
