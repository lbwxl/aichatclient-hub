import { definePlatform } from '@aichat/platform-sdk'

import { pinduoduoHooks } from './hooks'

export const pinduoduoPlatform = definePlatform({
  manifest: {
    id: 'pinduoduo',
    displayName: '拼多多',
    host: 'webview',
    capabilities: ['messaging', 'file-upload', 'goods-sync', 'script-injection'],
    color: '#d63b32',
    loginUrl: 'https://mms.pinduoduo.com/chat-merchant/'
  },
  hooks: pinduoduoHooks
})

export { pinduoduoHooks } from './hooks'
