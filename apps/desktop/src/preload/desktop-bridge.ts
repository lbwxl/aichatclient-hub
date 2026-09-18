import {
  connectRequestSchema,
  disconnectRequestSchema,
  IPC_CHANNELS,
  sendMessageCommandSchema,
  platformEventSchema,
  type DesktopBridge,
  type PlatformEvent,
  type Unsubscribe
} from '@aichat/contracts'

export interface IpcTransport {
  invoke(channel: string, payload: unknown): Promise<unknown>
  on(channel: string, listener: (payload: unknown) => void): Unsubscribe
}

const isPlatformEvent = (payload: unknown): payload is PlatformEvent => {
  return platformEventSchema.safeParse(payload).success
}

const parseGatewayResult = <T>(payload: unknown): { ok: boolean; data?: T; error?: { code: string; message: string; retryable: boolean } } => {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: { code: 'INVALID_RESPONSE', message: 'Invalid gateway response', retryable: false } }
  }
  const value = payload as Record<string, unknown>
  if (value.ok === true) return { ok: true, data: value.data as T | undefined }
  const error = value.error && typeof value.error === 'object' ? value.error as Record<string, unknown> : {}
  return {
    ok: false,
    error: {
      code: typeof error.code === 'string' ? error.code : 'GATEWAY_ERROR',
      message: typeof error.message === 'string' ? error.message : 'Gateway operation failed',
      retryable: error.retryable === true
    }
  }
}

export const createDesktopBridge = (ipc: IpcTransport): DesktopBridge => ({
  async connect(request) {
    return parseGatewayResult(await ipc.invoke(IPC_CHANNELS.connect, connectRequestSchema.parse(request)))
  },
  async disconnect(request) {
    return parseGatewayResult(await ipc.invoke(IPC_CHANNELS.disconnect, disconnectRequestSchema.parse(request)))
  },
  async sendMessage(command) {
    return parseGatewayResult(await ipc.invoke(IPC_CHANNELS.sendMessage, sendMessageCommandSchema.parse(command)))
  },
  subscribe(listener) {
    return ipc.on(IPC_CHANNELS.event, (payload) => {
      if (isPlatformEvent(payload)) listener(payload)
    })
  }
})
