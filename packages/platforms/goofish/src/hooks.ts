import { createPlatformHooks } from '@aichat/platform-sdk'

export const goofishHooks = createPlatformHooks({
  platformId: 'goofish',
  transport: 'service',
  aliases: {
    messageId: ['messageId', 'id'],
    conversationId: ['sessionId', 'conversationId'],
    senderId: ['senderId', 'fromUserId'],
    senderName: ['senderName', 'nickname'],
    content: ['content', 'text']
  }
})
