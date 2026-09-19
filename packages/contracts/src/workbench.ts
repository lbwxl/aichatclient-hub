import { z } from 'zod'

import { shopSchema } from './shop'

export const boundsSchema = z.object({ x: z.number().int().nonnegative(), y: z.number().int().nonnegative(), width: z.number().int().min(1).max(10000), height: z.number().int().min(1).max(10000) })
export const settingsSchema = z.object({ concurrency: z.number().int().min(1).max(4), minimizeToTray: z.boolean(), logLimit: z.number().int().min(100).max(2000) })
export type AppSettings = z.infer<typeof settingsSchema>
export const defaultSettings: AppSettings = { concurrency: 2, minimizeToTray: false, logLimit: 500 }
export const workbenchCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('session'), token: z.string().nullable() }),
  z.object({ type: z.literal('open'), shop: shopSchema }),
  z.object({ type: z.literal('show'), shopId: z.string().min(1), bounds: boundsSchema }),
  z.object({ type: z.literal('hide') }),
  z.object({ type: z.literal('close'), shopId: z.string().min(1) }),
  z.object({ type: z.literal('task'), shop: shopSchema, action: z.enum(['auth', 'sync-products', 'learn-products']) }),
  z.object({ type: z.literal('logs') }),
  z.object({ type: z.literal('settings'), value: settingsSchema.optional() })
])
export type WorkbenchCommand = z.infer<typeof workbenchCommandSchema>
export type TaskAction = Extract<WorkbenchCommand, { type: 'task' }>['action']
export interface TaskResult { message: string; count?: number; authenticated?: boolean; externalId?: string; shopName?: string }
export interface LogEntry { id: string; time: string; level: 'info' | 'error'; message: string; shopId?: string; platformId?: string }
export interface WorkbenchBridge {
  invoke(command: WorkbenchCommand): Promise<unknown>
  subscribe(listener: (entry: LogEntry) => void): () => void
}
