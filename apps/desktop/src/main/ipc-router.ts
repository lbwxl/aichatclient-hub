import {
  connectRequestSchema,
  disconnectRequestSchema,
  sendMessageCommandSchema,
  type ConnectRequest,
  type DisconnectRequest,
  type GatewayResult,
  type SendMessageCommand,
  type Unsubscribe
} from '@aichat/contracts'

export interface PlatformDriver {
  connect(request: ConnectRequest): Promise<GatewayResult>
  disconnect(request: DisconnectRequest): Promise<GatewayResult>
  sendMessage(command: SendMessageCommand): Promise<GatewayResult<{ messageId: string }>>
}

export interface IpcMainTransport {
  handle(channel: string, handler: (payload: unknown) => Promise<unknown>): Unsubscribe
  emit(channel: string, payload: unknown): void
}

export interface IpcRouterOptions {
  readonly transport: IpcMainTransport
  readonly drivers: ReadonlyMap<string, PlatformDriver>
}

const invalidRequest = (message: string): GatewayResult => ({
  ok: false,
  error: { code: 'INVALID_REQUEST', message, retryable: false }
})

const driverFor = (drivers: ReadonlyMap<string, PlatformDriver>, platformId: string): PlatformDriver => {
  const driver = drivers.get(platformId)
  if (!driver) throw new Error(`No driver registered for platform "${platformId}"`)
  return driver
}

export const registerIpcRouter = ({ transport, drivers }: IpcRouterOptions): Unsubscribe => {
  const cleanups = [
    transport.handle('platform:connect', async (payload) => {
      const parsed = connectRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest(parsed.error.message)
      try {
        return await driverFor(drivers, parsed.data.platform).connect(parsed.data)
      } catch (error) {
        return { ok: false, error: { code: 'CONNECT_FAILED', message: error instanceof Error ? error.message : String(error), retryable: true } }
      }
    }),
    transport.handle('platform:disconnect', async (payload) => {
      const parsed = disconnectRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest(parsed.error.message)
      try {
        return await driverFor(drivers, parsed.data.platform).disconnect(parsed.data)
      } catch (error) {
        return { ok: false, error: { code: 'DISCONNECT_FAILED', message: error instanceof Error ? error.message : String(error), retryable: true } }
      }
    }),
    transport.handle('platform:send-message', async (payload) => {
      const parsed = sendMessageCommandSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest(parsed.error.message)
      try {
        return await driverFor(drivers, parsed.data.platformId).sendMessage(parsed.data)
      } catch (error) {
        return { ok: false, error: { code: 'SEND_FAILED', message: error instanceof Error ? error.message : String(error), retryable: true } }
      }
    })
  ]

  return () => cleanups.forEach((cleanup) => cleanup())
}
