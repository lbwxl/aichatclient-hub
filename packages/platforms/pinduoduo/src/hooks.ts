import { createPlatformHooks } from '@aichat/platform-sdk'

export const pinduoduoHooks = createPlatformHooks({
  platformId: 'pinduoduo',
  transport: 'webview',
  aliases: {
    conversationId: ['chatId', 'conversationId', 'conversation_id'],
    senderId: ['uid', 'senderId', 'fromUid'],
    senderName: ['nickname', 'senderName'],
    content: ['content', 'message', 'text']
  }
})
