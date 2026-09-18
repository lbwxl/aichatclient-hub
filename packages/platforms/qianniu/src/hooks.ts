import { createPlatformHooks } from '@aichat/platform-sdk'

export const qianniuHooks = createPlatformHooks({
  platformId: 'qianniu',
  transport: 'native',
  aliases: {
    conversationId: ['conversationId', 'contactId', 'nick'],
    senderId: ['senderId', 'uid', 'nick'],
    senderName: ['senderName', 'nick'],
    content: ['content', 'message', 'text']
  }
})
