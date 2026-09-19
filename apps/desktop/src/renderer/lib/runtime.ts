import type { DesktopBridge, GatewayResult, PlatformEvent, SendMessageCommand, ConnectRequest, DisconnectRequest, Unsubscribe } from '@aichat/contracts'
import { PlatformRuntime } from '@aichat/platform-sdk'
import { DemoBridge } from '@aichat/core'
import { platformRegistry } from '../../bootstrap/platform-registry'

const unavailableBridge: DesktopBridge = {
  async connect(): Promise<GatewayResult> { return { ok: false, error: { code: 'DESKTOP_BRIDGE_UNAVAILABLE', message: 'Electron desktop bridge is not available', retryable: false } } },
  async disconnect(): Promise<GatewayResult> { return { ok: false, error: { code: 'DESKTOP_BRIDGE_UNAVAILABLE', message: 'Electron desktop bridge is not available', retryable: false } } },
  async sendMessage(_command: SendMessageCommand): Promise<GatewayResult<{ messageId: string }>> { return { ok: false, error: { code: 'DESKTOP_BRIDGE_UNAVAILABLE', message: 'Electron desktop bridge is not available', retryable: false } } },
  subscribe(_listener: (event: PlatformEvent) => void): Unsubscribe { return () => undefined }
}

const demoEnabled = import.meta.env.VITE_ENABLE_DEMO === 'true'
export const runtimeBridge = window.desktopBridge ?? (demoEnabled ? new DemoBridge() : unavailableBridge)
export const platformRuntime = new PlatformRuntime({ registry: platformRegistry, bridge: runtimeBridge })

export type { ConnectRequest, DisconnectRequest }
