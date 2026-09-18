import { describe, expect, it, vi } from 'vitest'

import type { DesktopBridge, PlatformEvent, SendMessageCommand, Unsubscribe } from '@aichat/contracts'

import { createPlatformHooks, PlatformRegistry, PlatformRuntime } from '../src'

const shop = {
  id: 'shop-1',
  platformId: 'douyin' as const,
  displayName: 'Demo',
  accountName: 'Support',
  autoReplyEnabled: true,
  unreadCount: 0,
  metadata: {}
}

const platform = {
  manifest: {
    id: 'douyin' as const,
    displayName: '抖店',
    host: 'webview' as const,
    capabilities: ['messaging'] as const,
    color: '#2864dc'
  },
  hooks: createPlatformHooks({ platformId: 'douyin', transport: 'webview' })
}

class TestBridge implements DesktopBridge {
  readonly events = new Set<(event: PlatformEvent) => void>()
  sent: SendMessageCommand | null = null

  async connect() { return { ok: true as const } }
  async disconnect() { return { ok: true as const } }
  async sendMessage(command: SendMessageCommand) {
    this.sent = command
    return { ok: true as const, data: { messageId: 'message-1' } }
  }
  subscribe(listener: (event: PlatformEvent) => void): Unsubscribe {
    this.events.add(listener)
    return () => this.events.delete(listener)
  }
  emit(event: PlatformEvent) { this.events.forEach((listener) => listener(event)) }
}

describe('platform runtime', () => {
  it('runs platform hooks around a typed send command', async () => {
    const bridge = new TestBridge()
    const runtime = new PlatformRuntime({
      registry: new PlatformRegistry([platform]),
      bridge,
      logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() }
    })

    await runtime.sendMessage(shop, { conversationId: 'conversation-1', content: '你好' })

    expect(bridge.sent).toMatchObject({
      shopId: 'shop-1',
      platformId: 'douyin',
      metadata: { platform: 'douyin', transport: 'webview' }
    })
  })

  it('normalizes malformed platform payloads without breaking the bridge event loop', async () => {
    const bridge = new TestBridge()
    const runtime = new PlatformRuntime({
      registry: new PlatformRegistry([platform]),
      bridge,
      logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() }
    })
    const messages: unknown[] = []
    runtime.observe({ onMessage: (message) => messages.push(message) })
    await runtime.connect(shop)

    bridge.emit({
      type: 'message-received',
      shopId: 'shop-1',
      platformId: 'douyin',
      occurredAt: new Date().toISOString(),
      payload: { session_id: 'conversation-1', sender_id: 'user-1', content: 'hello', message_type: 'img' }
    })
    bridge.emit({
      type: 'message-received',
      shopId: 'shop-1',
      platformId: 'douyin',
      occurredAt: new Date().toISOString(),
      payload: { content: 'missing identity' }
    })

    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ contentType: 'image', conversationId: 'conversation-1' })
  })
})
