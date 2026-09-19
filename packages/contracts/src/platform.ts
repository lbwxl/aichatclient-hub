import { z } from 'zod'

// Platform packages are the source of truth. Platform ids are validated for
// shape here and resolved at runtime by PlatformRegistry.
export const platformIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,49}$/)
export type PlatformId = z.infer<typeof platformIdSchema>

export const platformHostSchema = z.enum(['webview', 'native', 'service'])
export type PlatformHost = z.infer<typeof platformHostSchema>

export const platformCapabilitySchema = z.enum([
  'messaging',
  'file-upload',
  'goods-sync',
  'goods-learn',
  'script-injection',
  'hidden-sender'
])
export type PlatformCapability = z.infer<typeof platformCapabilitySchema>

export interface PlatformManifest {
  readonly id: PlatformId
  readonly displayName: string
  readonly host: PlatformHost
  readonly capabilities: readonly PlatformCapability[]
  readonly color: string
  readonly loginUrl?: string
}
