import { definePlatform } from '@aichat/platform-sdk'

import { kuaishouHooks } from './hooks'

export const kuaishouPlatform = definePlatform({
  manifest: {
    id: 'kuaishou',
    displayName: '快手小店',
    host: 'webview',
    capabilities: ['messaging', 'file-upload', 'goods-sync', 'script-injection', 'hidden-sender'],
    color: '#ff5d28',
    loginUrl: 'https://im.kwaixiaodian.com/workbench'
  },
  hooks: kuaishouHooks
})

export { kuaishouHooks } from './hooks'
