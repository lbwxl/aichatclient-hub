import { createPlatformHooks } from '@aichat/platform-sdk'
import { doudianHookScript } from '@platform-hub/doudian-hook'

export const douyinHooks = createPlatformHooks({
  platformId: 'douyin',
  transport: 'webview',
  aliases: {
    conversationId: ['conversationId', 'conversation_id', 'session_id'],
    senderId: ['senderId', 'sender_id', 'from_user_id'],
    senderName: ['senderName', 'nickname', 'from_user_name'],
    content: ['content', 'text', 'message']
  }
})

export { doudianHookScript }
