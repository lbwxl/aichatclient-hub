import { definePlatform } from '@aichat/platform-sdk'

import { goofishHooks } from './hooks'

export const goofishPlatform = definePlatform({
  manifest: {
    id: 'goofish',
    displayName: '闲鱼',
    host: 'service',
    capabilities: ['messaging', 'file-upload', 'goods-sync'],
    color: '#e2ae08'
  },
  hooks: goofishHooks
})

export { goofishHooks } from './hooks'
