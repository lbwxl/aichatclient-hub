import { z } from 'zod'

import { platformIdSchema } from './platform'

export const shopSchema = z.object({
  id: z.string().trim().min(1),
  platformId: platformIdSchema,
  displayName: z.string().trim().min(1),
  accountName: z.string().trim().default(''),
  externalId: z.string().trim().optional(),
  avatarUrl: z.string().url().optional(),
  autoReplyEnabled: z.boolean().default(false),
  unreadCount: z.number().int().nonnegative().default(0),
  metadata: z.record(z.string(), z.unknown()).default({})
})

export type Shop = z.infer<typeof shopSchema>
