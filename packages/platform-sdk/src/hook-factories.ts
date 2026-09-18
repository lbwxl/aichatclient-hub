import { chatMessageSchema, type ChatMessage, type PlatformId } from '@aichat/contracts'

import type { PlatformHooks, PlatformMessagingHooks } from './types'

interface HookFactoryOptions {
  readonly platformId: PlatformId
  readonly transport: 'webview' | 'native' | 'service'
  readonly aliases?: {
    readonly messageId?: readonly string[]
    readonly conversationId?: readonly string[]
    readonly senderId?: readonly string[]
    readonly senderName?: readonly string[]
    readonly content?: readonly string[]
  }
}

const asRecord = (value: unknown): Readonly<Record<string, unknown>> | null =>
  value !== null && typeof value === 'object' ? (value as Readonly<Record<string, unknown>>) : null

const firstString = (
  record: Readonly<Record<string, unknown>>,
  keys: readonly string[],
  fallback = ''
): string => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return fallback
}

const normalizeDate = (value: unknown): string => {
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value < 10_000_000_000 ? value * 1000 : value).toISOString()
  }
  return new Date().toISOString()
}

const normalizeContentType = (value: string): 'text' | 'image' | 'file' | 'system' => {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'image' || normalized === 'img' || normalized === 'picture') return 'image'
  if (normalized === 'file' || normalized === 'document' || normalized === 'attachment') return 'file'
  if (normalized === 'system' || normalized === 'notice') return 'system'
  return 'text'
}

const createMessagingHooks = (options: HookFactoryOptions): PlatformMessagingHooks => ({
  beforeSend(command) {
    return {
      ...command,
      metadata: {
        ...command.metadata,
        transport: options.transport,
        platform: options.platformId
      }
    }
  },
  normalizeIncoming(payload, context): ChatMessage | null {
    const record = asRecord(payload)
    if (!record) return null

    const content = firstString(record, options.aliases?.content ?? ['content', 'message', 'text'])
    const conversationId = firstString(
      record,
      options.aliases?.conversationId ?? ['conversationId', 'conversation_id', 'sessionId', 'session_id']
    )
    const senderId = firstString(
      record,
      options.aliases?.senderId ?? ['senderId', 'sender_id', 'from', 'userId']
    )

    if (!content || !conversationId || !senderId) return null

    const normalized = chatMessageSchema.safeParse({
      id: firstString(
        record,
        options.aliases?.messageId ?? ['messageId', 'message_id', 'msgId', 'id'],
        `${context.shop.id}:${conversationId}:${Date.now()}`
      ),
      shopId: context.shop.id,
      conversationId,
      senderId,
      senderName: firstString(
        record,
        options.aliases?.senderName ?? ['senderName', 'sender_name', 'nickname', 'name']
      ),
      content,
      direction: 'incoming',
      contentType: normalizeContentType(firstString(record, ['contentType', 'message_type'], 'text')),
      receivedAt: normalizeDate(record.receivedAt ?? record.timestamp ?? record.time),
      raw: payload
    })
    return normalized.success ? normalized.data : null
  }
})

export const createPlatformHooks = (options: HookFactoryOptions): PlatformHooks => ({
  lifecycle: {
    beforeConnect(context) {
      if (context.signal.aborted) throw new DOMException('Connection cancelled', 'AbortError')
      context.logger.debug('Connecting platform shop', {
        platformId: options.platformId,
        shopId: context.shop.id,
        transport: options.transport
      })
    },
    connectFailed(context, error) {
      context.logger.error('Platform connection failed', {
        platformId: options.platformId,
        shopId: context.shop.id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  },
  messaging: createMessagingHooks(options),
  injection:
    options.transport === 'webview'
      ? {
          createBootstrapScript(context) {
            const marker = JSON.stringify(`${options.platformId}:${context.shop.id}`)
            return `window.__AICHAT_PLATFORM__ = ${marker};`
          }
        }
      : undefined
})
