import { createPlatformHooks } from '@aichat/platform-sdk'

export const kuaishouHooks = createPlatformHooks({
  platformId: 'kuaishou',
  transport: 'webview',
  aliases: {
    conversationId: ['targetId', 'conversationId', 'sessionId'],
    senderId: ['fromUserId', 'senderId', 'uid'],
    senderName: ['fromUserName', 'senderName', 'nickname'],
    content: ['msgContent', 'content', 'text']
  }
})
