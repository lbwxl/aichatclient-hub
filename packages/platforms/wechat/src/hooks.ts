import { createPlatformHooks } from '@aichat/platform-sdk'

export const wechatHooks = createPlatformHooks({
  platformId: 'wechat',
  transport: 'native',
  aliases: {
    conversationId: ['conversation_id', 'conversationId', 'sender_id'],
    senderId: ['sender_id', 'senderId', 'wxid'],
    senderName: ['nickname', 'sender_name', 'senderName'],
    content: ['content', 'text']
  }
})
