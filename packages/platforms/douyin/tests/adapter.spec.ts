import { describe, expect, it } from 'vitest'

import { normalizeDoudianEvent } from '../src/adapter'

describe('doudian adapter', () => {
  it('normalizes hook message events without reading page DOM', () => {
    const message = normalizeDoudianEvent('shop-1', {
      type: 'message',
      timestamp: 1_700_000_000_000,
      payload: {
        id: 'message-1', sessionId: 'session-1', senderId: 'buyer-1', senderName: '买家', content: '你好', type: 'text', isMine: false
      }
    })
    expect(message).toMatchObject({ id: 'message-1', shopId: 'shop-1', conversationId: 'session-1', direction: 'incoming', content: '你好' })
  })

  it('ignores non-message and incomplete events', () => {
    expect(normalizeDoudianEvent('shop-1', { type: 'ready', payload: {} })).toBeNull()
    expect(normalizeDoudianEvent('shop-1', { type: 'message', payload: { content: 'missing ids' } })).toBeNull()
  })
})
