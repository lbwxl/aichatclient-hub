import type {
  ChatMessage,
  ConnectionStatus,
  DesktopBridge,
  GatewayResult,
  PlatformEvent,
  PlatformId,
  PlatformManifest,
  SendMessageCommand,
  Shop
} from '@aichat/contracts'

export interface PlatformLogger {
  debug(message: string, context?: Readonly<Record<string, unknown>>): void
  warn(message: string, context?: Readonly<Record<string, unknown>>): void
  error(message: string, context?: Readonly<Record<string, unknown>>): void
}

export interface PlatformHookContext {
  readonly shop: Shop
  readonly signal: AbortSignal
  readonly logger: PlatformLogger
}

export interface PlatformLifecycleHooks {
  beforeConnect?(context: PlatformHookContext): Promise<void> | void
  afterConnect?(context: PlatformHookContext, result: GatewayResult): Promise<void> | void
  connectFailed?(context: PlatformHookContext, error: unknown): Promise<void> | void
  beforeDisconnect?(context: PlatformHookContext): Promise<void> | void
  afterDisconnect?(context: PlatformHookContext, result: GatewayResult): Promise<void> | void
}

export interface PlatformMessagingHooks {
  beforeSend?(
    command: SendMessageCommand,
    context: PlatformHookContext
  ): Promise<SendMessageCommand> | SendMessageCommand
  afterSend?(
    command: SendMessageCommand,
    result: GatewayResult<{ messageId: string }>,
    context: PlatformHookContext
  ): Promise<void> | void
  normalizeIncoming?(payload: unknown, context: PlatformHookContext): ChatMessage | null
}

export interface PlatformGoodsHooks {
  normalizeGoods?(payload: unknown, context: PlatformHookContext): readonly unknown[]
  collect?(context: PlatformHookContext): Promise<readonly unknown[]>
  learn?(context: PlatformHookContext): Promise<{ readonly count?: number; readonly message: string }>
}

export interface PlatformInjectionHooks {
  createBootstrapScript?(context: PlatformHookContext): Promise<string> | string
}

export interface PlatformHooks {
  readonly lifecycle?: PlatformLifecycleHooks
  readonly messaging?: PlatformMessagingHooks
  readonly goods?: PlatformGoodsHooks
  readonly injection?: PlatformInjectionHooks
}

export interface PlatformModule {
  readonly manifest: PlatformManifest
  readonly hooks: PlatformHooks
}

export interface RuntimeObserver {
  onStatus?(shopId: string, status: ConnectionStatus, error?: string): void
  onMessage?(message: ChatMessage): void
  onEvent?(event: PlatformEvent): void
}

export interface PlatformRuntimeOptions {
  readonly registry: PlatformRegistryLike
  readonly bridge: DesktopBridge
  readonly logger?: PlatformLogger
}

export interface PlatformRegistryLike {
  get(platformId: PlatformId): PlatformModule
  list(): readonly PlatformModule[]
}
