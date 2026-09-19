import { describe, expect, it } from 'vitest'

import { platformModules, platformRegistry } from './platform-registry'

describe('desktop platform composition root', () => {
  it('registers platform modules outside core', () => {
    expect(platformModules.map(({ manifest }) => manifest.id)).toContain('douyin')
    expect(platformRegistry.get('douyin').manifest.host).toBe('webview')
  })

  it('uses the registry as the runtime source of platform modules', () => {
    expect(platformRegistry.list()).toHaveLength(platformModules.length)
    expect(platformRegistry.list().every((module) => platformRegistry.get(module.manifest.id) === module)).toBe(true)
  })
})
