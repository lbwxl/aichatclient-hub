import { describe, expect, it } from 'vitest'

import { platformModules, platformRegistry } from '../src/platform-catalog'

describe('platform catalog', () => {
  it('registers only the active doudian platform', () => {
    expect(platformModules.map(({ manifest }) => manifest.id)).toEqual(['douyin'])
    expect(platformRegistry.list()).toHaveLength(1)
  })

  it('keeps platform-specific transport decisions out of the app shell', () => {
    expect(platformRegistry.get('douyin').manifest.host).toBe('webview')
  })
})
