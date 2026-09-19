import type {
  ChatMessage,
  ConnectionStatus,
  DesktopBridge,
  GatewayResult,
  HandoffInput,
  HandoffResult,
  PlatformEvent,
  PlatformId,
  PlatformManifest,
  PlatformMessage,
  PlatformSession,
  Product,
  SendMessageCommand,
  Shop
} from '@aichat/contracts'

export interface PlatformLogger {
  debug(message: string, context?: Readonly<Record<string, unknown>>): void
  warn(message: string, context?: Readonly<Record<string, unknown>>): void
  error(message: string, context?: Readonly<Record<string, unknown>>): void
}

/** Context supplied to a platform when a shop runtime is created. */
export interface PlatformRuntimeContext {
  readonly shop: Shop
  readonly signal: AbortSignal
  readonly logger: PlatformLogger
  readonly bridge?: DesktopBridge
  readonly registry?: PlatformRegistryLike
  readonly services?: Readonly<Record<string, unknown>>
}

export interface PlatformAuthDriver {
  getSession(shop?: Shop): Promise<PlatformSession>
  login?(input?: unknown): Promise<PlatformSession>
  logout?(): Promise<void>
}

export interface PlatformWebviewDriver {
  getUrl(shop: Shop): string
  getPartition(shop: Shop): string
  getPreload?(shop?: Shop): string | undefined
}

export interface PlatformMessagingDriver {
  sendMessage(
    command: SendMessageCommand
  ): Promise<GatewayResult<{ readonly messageId: string }>>
  normalizeMessage?(payload: unknown, context: PlatformRuntimeContext): PlatformMessage | null
  subscribe?(listener: (message: PlatformMessage) => void): () => void
}

export interface PlatformProductDriver {
  syncProducts(shop: Shop): Promise<readonly Product[]>
  getProduct?(shop: Shop, externalId: string): Promise<Product | null>
}

export interface PlatformHandoffDriver {
  handoff(input: HandoffInput): Promise<HandoffResult>
}

/** A platform runtime is isolated to one shop and owns its lifecycle. */
export interface PlatformRuntime {
  readonly auth?: PlatformAuthDriver
  readonly webview?: PlatformWebviewDriver
  readonly messaging?: PlatformMessagingDriver
  readonly products?: PlatformProductDriver
  readonly handoff?: PlatformHandoffDriver
  start(): Promise<void>
  stop(): Promise<void>
}

export interface PlatformHookContext {
  readonly shop: Shop
  readonly signal: AbortSignal
  readonly logger: PlatformLogger
}

/** Legacy hook shape retained as an adapter while platforms migrate. */
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
  readonly createRuntime: (context: PlatformRuntimeContext) => PlatformRuntime
  /** @deprecated Use runtime drivers. Kept for the incremental migration adapter. */
  readonly hooks?: PlatformHooks
}

export interface PlatformModuleDefinition {
  readonly manifest: PlatformManifest
  readonly createRuntime?: (context: PlatformRuntimeContext) => PlatformRuntime
  readonly hooks?: PlatformHooks
}

export interface RuntimeObserver {
  onStatus?(shopId: string, status: ConnectionStatus, error?: string): void
  onMessage?(message: ChatMessage): void
  onEvent?(event: PlatformEvent): void
}

/** Options for the legacy bridge-backed runtime controller. */
export interface PlatformRuntimeOptions {
  readonly registry: PlatformRegistryLike
  readonly bridge: DesktopBridge
  readonly logger?: PlatformLogger
}

export interface PlatformRegistryLike {
  get(platformId: PlatformId | string): PlatformModule
  list(): readonly PlatformModule[]
}

export interface PlatformSchedulerOptions {
  readonly registry: PlatformRegistryLike
  readonly bridge?: DesktopBridge
  readonly logger?: PlatformLogger
  readonly services?: Readonly<Record<string, unknown>>
  readonly createContext?: (
    shop: Shop,
    signal: AbortSignal,
    options: PlatformSchedulerOptions
  ) => PlatformRuntimeContext
}

export interface ScheduledRuntime {
  readonly shop: Shop
  readonly runtime: PlatformRuntime
  readonly status: 'starting' | 'running' | 'stopping'
}
