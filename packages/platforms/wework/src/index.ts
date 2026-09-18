import { definePlatform } from '@aichat/platform-sdk'

import { weworkHooks } from './hooks'

export const weworkPlatform = definePlatform({
  manifest: {
    id: 'wework',
    displayName: '企业微信',
    host: 'native',
    capabilities: ['messaging', 'file-upload'],
    color: '#1877c9'
  },
  hooks: weworkHooks
})

export { weworkHooks } from './hooks'
