import type {
  ConnectRequest,
  DesktopBridge,
  DisconnectRequest,
  GatewayResult,
  PlatformEvent,
  SendMessageCommand,
  Unsubscribe
} from '@aichat/contracts'

const ok = <T = undefined>(data?: T): GatewayResult<T> => ({ ok: true, data })

export class DemoBridge implements DesktopBridge {
  readonly #listeners = new Set<(event: PlatformEvent) => void>()

  async connect(request: ConnectRequest): Promise<GatewayResult> {
    this.#emit({
      type: 'connection-status',
      shopId: request.shop.id,
      status: 'connected',
      occurredAt: new Date().toISOString()
    })
    return ok()
  }

  async disconnect(request: DisconnectRequest): Promise<GatewayResult> {
    this.#emit({
      type: 'connection-status',
      shopId: request.shopId,
      status: 'idle',
      occurredAt: new Date().toISOString()
    })
    return ok()
  }

  async sendMessage(command: SendMessageCommand): Promise<GatewayResult<{ messageId: string }>> {
    const messageId = `demo-${command.requestId}`
    setTimeout(() => {
      this.#emit({
        type: 'message-received',
        shopId: command.shopId,
        platformId: command.platformId,
        occurredAt: new Date().toISOString(),
        payload: {
          id: messageId,
          sessionId: command.conversationId,
          senderId: 'demo-bot',
          senderName: 'Demo echo',
          content: command.content,
          timestamp: Date.now()
        }
      })
    }, 150)
    return ok({ messageId })
  }

  subscribe(listener: (event: PlatformEvent) => void): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  #emit(event: PlatformEvent): void {
    this.#listeners.forEach((listener) => listener(event))
  }
}
