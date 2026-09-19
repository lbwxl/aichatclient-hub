import { describe, expect, it } from 'vitest'

import type { Shop } from '@aichat/contracts'

import {
  createFakePlatform,
  FakePlatform,
  PlatformRegistry,
  PlatformScheduler
} from '../src'

const shop = (id: string, platformId: Shop['platformId']): Shop => ({
  id,
  platformId,
  displayName: id,
  accountName: '',
  autoReplyEnabled: false,
  unreadCount: 0,
  metadata: {}
})

describe('platform contract', () => {
  it('registers a module and creates an isolated runtime', async () => {
    const platform = new FakePlatform({ id: 'contract-platform' })
    const registry = new PlatformRegistry([platform])
    const scheduler = new PlatformScheduler(registry)
    const first = shop('shop-a', 'contract-platform')
    const second = shop('shop-b', 'contract-platform')

    const runtimeA = await scheduler.startShop(first)
    const runtimeB = await scheduler.startShop(second)
    expect(runtimeA).not.toBe(runtimeB)
    expect(platform.state.startCount).toBe(2)
    expect(scheduler.list()).toHaveLength(2)

    await scheduler.stopShop(first.id)
    await scheduler.stopShop(first.id)
    expect(platform.state.stopCount).toBe(1)
    expect(scheduler.has(second.id)).toBe(true)
    await scheduler.dispose()
    expect(platform.state.stopCount).toBe(2)
  })

  it('exposes the shared auth, webview, messaging, product and handoff contracts', async () => {
    const platform = createFakePlatform({ id: 'contract-drivers' })
    const registry = new PlatformRegistry([platform])
    const scheduler = new PlatformScheduler(registry)
    const currentShop = shop('shop-drivers', 'contract-drivers')
    const runtime = await scheduler.startShop(currentShop)

    expect(await runtime.auth?.getSession()).toMatchObject({ authenticated: true })
    expect(runtime.webview?.getPartition(currentShop)).toContain(currentShop.id)
    const sendResult = await runtime.messaging?.sendMessage({
      requestId: 'request-1',
      shopId: currentShop.id,
      platformId: currentShop.platformId,
      conversationId: 'conversation-1',
      content: 'hello',
      metadata: {}
    })
    expect(sendResult).toMatchObject({ ok: true, data: { messageId: 'fake-request-1' } })
    const products = await runtime.products?.syncProducts(currentShop)
    expect(products?.[0]).toMatchObject({ shopId: currentShop.id, platformId: currentShop.platformId })
    expect(await runtime.handoff?.handoff({
      shopId: currentShop.id,
      conversationId: 'conversation-1',
      customerId: 'customer-1',
      reason: 'requested',
      message: '',
      metadata: {}
    })).toMatchObject({ accepted: true })
    await scheduler.dispose()
  })

  it('keeps a failed runtime from stopping another shop', async () => {
    const failing = createFakePlatform({ id: 'contract-failing', failStart: true })
    const healthy = createFakePlatform({ id: 'contract-healthy' })
    const scheduler = new PlatformScheduler(new PlatformRegistry([failing, healthy]))

    await expect(scheduler.startShop(shop('failed-shop', 'contract-failing'))).rejects.toThrow('Fake platform start failed')
    await scheduler.startShop(shop('healthy-shop', 'contract-healthy'))
    expect(healthy.state.startCount).toBe(1)
    expect(scheduler.has('healthy-shop')).toBe(true)
    await scheduler.dispose()
  })
})
