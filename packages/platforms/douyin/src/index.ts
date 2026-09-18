import { definePlatform } from '@aichat/platform-sdk'
export {
  createDoudianClient,
  doudianHook,
  doudianHookScript
} from '@platform-hub/doudian-hook'
export type { ChatSession, DoudianClient, PlatformMessage } from '@platform-hub/doudian-hook'

import { douyinHooks } from './hooks'

export const douyinPlatform = definePlatform({
  manifest: {
    id: 'douyin',
    displayName: '抖店',
    host: 'webview',
    capabilities: ['messaging', 'file-upload', 'goods-sync', 'script-injection', 'hidden-sender'],
    color: '#2864dc',
    loginUrl: 'https://im.jinritemai.com/pc_seller_v2/main/workspace'
  },
  hooks: douyinHooks
})

export { douyinHooks } from './hooks'
export * from './adapter'
