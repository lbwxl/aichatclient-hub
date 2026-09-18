import { createPlatformHooks } from '@aichat/platform-sdk'

export const weworkHooks = createPlatformHooks({
  platformId: 'wework',
  transport: 'native',
  aliases: {
    conversationId: ['conversation_id', 'conversationId', 'sender_id'],
    senderId: ['sender_id', 'senderId', 'userId'],
    senderName: ['sender_name', 'nickname', 'senderName'],
    content: ['content', 'text']
  }
})
