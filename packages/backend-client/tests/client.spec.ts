import { describe, expect, it } from 'vitest'

import { BackendError, createBackendClient, toContractShop } from '../src'

describe('backend client', () => {
  it('normalizes the backend shop_id contract for the renderer', () => {
    const shop = toContractShop({ id: 7, platform_en: 'douyin', nick_name: '晨光旗舰店', shop_id: 'fxg-7', auto: true })
    expect(shop).toMatchObject({ id: '7', platformId: 'douyin', displayName: '晨光旗舰店', externalId: 'fxg-7', autoReplyEnabled: true })
  })

  it('attaches bearer tokens and unwraps data responses', async () => {
    const calls: Request[] = []
    const client = createBackendClient({
      baseUrl: 'http://server/api/v1',
      tokenStore: { get: () => 'token-1', set: () => undefined, clear: () => undefined },
      fetcher: async (input, init) => {
        calls.push(new Request(input, init))
        return new Response(JSON.stringify({ code: 200, data: { items: [], total: 0, page: 1, page_size: 100 } }), { status: 200 })
      }
    })
    await expect(client.listShops()).resolves.toMatchObject({ items: [], total: 0 })
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer token-1')
    expect(calls[0]?.url).toContain('/shops/list?')
  })

  it('maps unauthorized responses to a typed error and clears the token', async () => {
    let cleared = false
    const client = createBackendClient({
      baseUrl: 'http://server/api/v1',
      tokenStore: { get: () => 'token-1', set: () => undefined, clear: () => { cleared = true } },
      fetcher: async () => new Response(JSON.stringify({ detail: '登录已过期' }), { status: 401 })
    })
    await expect(client.me()).rejects.toBeInstanceOf(BackendError)
    expect(cleared).toBe(true)
  })
})
