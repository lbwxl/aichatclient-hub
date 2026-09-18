import { definePlatform } from '@aichat/platform-sdk'

import { qianniuHooks } from './hooks'

export const qianniuPlatform = definePlatform({
  manifest: {
    id: 'qianniu',
    displayName: '千牛',
    host: 'native',
    capabilities: ['messaging', 'file-upload', 'goods-sync'],
    color: '#d97916'
  },
  hooks: qianniuHooks
})

export { qianniuHooks } from './hooks'
