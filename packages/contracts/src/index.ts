import { z } from 'zod'

// Platform packages are the source of truth. Platform ids are validated for
// shape here and resolved at runtime by PlatformRegistry.
export const platformIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,49}$/)
export type PlatformId = z.infer<typeof platformIdSchema>

export const platformHostSchema = z.enum(['webview', 'native', 'service'])
export type PlatformHost = z.infer<typeof platformHostSchema>

export const platformCapabilitySchema = z.enum([
  'messaging',
  'file-upload',
  'goods-sync',
  'goods-learn',
  'script-injection',
  'hidden-sender'
])
export type PlatformCapability = z.infer<typeof platformCapabilitySchema>

export interface PlatformManifest {
  readonly id: PlatformId
  readonly displayName: string
  readonly host: PlatformHost
  readonly capabilities: readonly PlatformCapability[]
  readonly color: string
  readonly loginUrl?: string
}

export const shopSchema = z.object({
  id: z.string().trim().min(1),
  platformId: platformIdSchema,
  displayName: z.string().trim().min(1),
  accountName: z.string().trim().default(''),
  externalId: z.string().trim().optional(),
  avatarUrl: z.string().url().optional(),
  autoReplyEnabled: z.boolean().default(false),
  unreadCount: z.number().int().nonnegative().default(0),
  metadata: z.record(z.string(), z.unknown()).default({})
})

export type Shop = z.infer<typeof shopSchema>

export const connectionStatusSchema = z.enum([
  'idle',
  'connecting',
  'connected',
  'disconnecting',
  'error'
])
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>

export const chatMessageSchema = z.object({
  id: z.string().trim().min(1),
  shopId: z.string().trim().min(1),
  conversationId: z.string().trim().min(1),
  senderId: z.string().trim().min(1),
  senderName: z.string().trim().default(''),
  content: z.string(),
  direction: z.enum(['incoming', 'outgoing']),
  contentType: z.enum(['text', 'image', 'file', 'system']).default('text'),
  receivedAt: z.string().datetime(),
  raw: z.unknown().optional()
})

export type ChatMessage = z.infer<typeof chatMessageSchema>

/**
 * The platform-neutral message name used at the platform boundary.
 * `ChatMessage` is kept as a backwards-compatible alias for the renderer
 * store while new platform code uses `PlatformMessage`.
 */
export type PlatformMessage = ChatMessage

export const sendMessageCommandSchema = z.object({
  requestId: z.string().trim().min(1),
  shopId: z.string().trim().min(1),
  platformId: platformIdSchema,
  conversationId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(10_000),
  metadata: z.record(z.string(), z.unknown()).default({})
})

export type SendMessageCommand = z.infer<typeof sendMessageCommandSchema>

export const connectRequestSchema = z.object({
  shop: shopSchema,
  platform: platformIdSchema,
  metadata: z.record(z.string(), z.unknown()).default({})
})

export type ConnectRequest = z.infer<typeof connectRequestSchema>

export const disconnectRequestSchema = z.object({
  shopId: z.string().trim().min(1),
  platform: platformIdSchema
})

export type DisconnectRequest = z.infer<typeof disconnectRequestSchema>

export interface GatewayResult<T = undefined> {
  readonly ok: boolean
  readonly data?: T
  readonly error?: {
    readonly code: string
    readonly message: string
    readonly retryable: boolean
  }
}

export const platformSessionSchema = z.object({
  shopId: z.string().trim().min(1),
  platformId: platformIdSchema,
  externalId: z.string().trim().optional(),
  authenticated: z.boolean(),
  status: z.enum(['unknown', 'authenticated', 'unauthenticated', 'expired']),
  metadata: z.record(z.string(), z.unknown()).default({})
})

export type PlatformSession = z.infer<typeof platformSessionSchema>

export const skuSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().default(''),
  price: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
})

export type Sku = z.infer<typeof skuSchema>

export const productSchema = z.object({
  id: z.string().trim().min(1),
  shopId: z.string().trim().min(1),
  platformId: platformIdSchema,
  externalId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().default(''),
  price: z.number().nonnegative().optional(),
  currency: z.string().trim().default('CNY'),
  images: z.array(z.string().url()).default([]),
  skus: z.array(skuSchema).default([]),
  metadata: z.record(z.string(), z.unknown()).default({})
})

export type Product = z.infer<typeof productSchema>

export const handoffInputSchema = z.object({
  shopId: z.string().trim().min(1),
  conversationId: z.string().trim().min(1),
  customerId: z.string().trim().optional(),
  reason: z.string().trim().default(''),
  message: z.string().default(''),
  metadata: z.record(z.string(), z.unknown()).default({})
})

export type HandoffInput = z.infer<typeof handoffInputSchema>

export const handoffResultSchema = z.object({
  accepted: z.boolean(),
  handoffId: z.string().trim().optional(),
  message: z.string().default(''),
  metadata: z.record(z.string(), z.unknown()).default({})
})

export type HandoffResult = z.infer<typeof handoffResultSchema>

export type PlatformEvent =
  | {
      readonly type: 'connection-status'
      readonly shopId: string
      readonly status: ConnectionStatus
      readonly occurredAt: string
      readonly error?: string
    }
  | {
      readonly type: 'message-received'
      readonly shopId: string
      readonly platformId: PlatformId
      readonly payload: unknown
      readonly occurredAt: string
    }

export const platformEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('connection-status'),
    shopId: z.string().trim().min(1),
    status: connectionStatusSchema,
    occurredAt: z.string().datetime(),
    error: z.string().optional()
  }),
  z.object({
    type: z.literal('message-received'),
    shopId: z.string().trim().min(1),
    platformId: platformIdSchema,
    payload: z.unknown(),
    occurredAt: z.string().datetime()
  })
])

export type Unsubscribe = () => void

export interface DesktopBridge {
  connect(request: ConnectRequest): Promise<GatewayResult>
  disconnect(request: DisconnectRequest): Promise<GatewayResult>
  sendMessage(command: SendMessageCommand): Promise<GatewayResult<{ messageId: string }>>
  subscribe(listener: (event: PlatformEvent) => void): Unsubscribe
}

export const IPC_CHANNELS = {
  connect: 'platform:connect',
  disconnect: 'platform:disconnect',
  sendMessage: 'platform:send-message',
  event: 'platform:event'
} as const

export * from './workbench'
