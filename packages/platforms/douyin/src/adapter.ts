import type { ChatMessage } from '@aichat/contracts'
import { createDoudianClient, type DoudianClient } from '@platform-hub/doudian-hook'
import type { HookEvent, PlatformMessage } from '@platform-hub/doudian-hook'

export interface DoudianWebViewLike {
  executeJavaScript(expression: string): Promise<unknown>
}

export const createDoudianWebViewClient = (webview: DoudianWebViewLike): DoudianClient =>
  createDoudianClient(<T>(expression: string) => webview.executeJavaScript(expression) as Promise<T>)

const messageFromPlatform = (shopId: string, message: PlatformMessage): ChatMessage => ({
  id: message.id,
  shopId,
  conversationId: message.sessionId,
  senderId: message.senderId,
  senderName: message.senderName,
  content: message.content,
  direction: message.isMine ? 'outgoing' : 'incoming',
  contentType: message.type === 'image' ? 'image' : message.type === 'file' ? 'file' : 'text',
  receivedAt: new Date(message.timestamp || Date.now()).toISOString(),
  raw: message.raw
})

export const normalizeDoudianEvent = (shopId: string, event: HookEvent): ChatMessage | null => {
  if (event.type !== 'message' || !event.payload || typeof event.payload !== 'object') return null
  const payload = event.payload as Partial<PlatformMessage>
  if (!payload.id || !payload.sessionId || !payload.senderId || typeof payload.content !== 'string') return null
  return messageFromPlatform(shopId, {
    id: String(payload.id),
    sessionId: String(payload.sessionId),
    senderId: String(payload.senderId),
    senderName: String(payload.senderName ?? ''),
    content: payload.content,
    type: String(payload.type ?? 'text'),
    isMine: payload.isMine === true,
    timestamp: Number(payload.timestamp ?? Date.now()),
    raw: payload.raw
  })
}

export { createDoudianClient }
