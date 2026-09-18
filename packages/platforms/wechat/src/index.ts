import { definePlatform } from '@aichat/platform-sdk'

import { wechatHooks } from './hooks'

export const wechatPlatform = definePlatform({
  manifest: {
    id: 'wechat',
    displayName: '微信',
    host: 'native',
    capabilities: ['messaging', 'file-upload'],
    color: '#2b9c4b'
  },
  hooks: wechatHooks
})

export { wechatHooks } from './hooks'
