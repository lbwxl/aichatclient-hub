import type { AuthUser, BackendClient, AuthSession } from '@aichat/backend-client'
import { create } from 'zustand'

type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous' | 'error'

interface SessionState {
  status: SessionStatus
  user: AuthUser | null
  error: string | null
  initialize(client: BackendClient): Promise<void>
  login(client: BackendClient, input: { phone: string; password: string; rememberMe?: boolean }): Promise<AuthSession>
  phoneLogin(client: BackendClient, input: { phone: string; code: string; invitationCode?: string }): Promise<AuthSession>
  logout(client: BackendClient): void
  clearError(): void
}

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error)

export const useSessionStore = create<SessionState>((set) => ({
  status: 'idle',
  user: null,
  error: null,
  async initialize(client) {
    if (!client.isAuthenticated()) {
      set({ status: 'anonymous', user: null, error: null })
      return
    }
    set({ status: 'loading', error: null })
    try {
      const user = await client.me()
      set({ status: 'authenticated', user, error: null })
    } catch (error) {
      client.clearSession()
      set({ status: 'anonymous', user: null, error: messageOf(error) })
    }
  },
  async login(client, input) {
    set({ status: 'loading', error: null })
    try {
      const session = await client.login(input)
      const user = session.user ?? await client.me()
      set({ status: 'authenticated', user, error: null })
      return session
    } catch (error) {
      set({ status: 'error', error: messageOf(error) })
      throw error
    }
  },
  async phoneLogin(client, input) {
    set({ status: 'loading', error: null })
    try {
      const session = await client.phoneLogin(input)
      const user = session.user ?? await client.me()
      set({ status: 'authenticated', user, error: null })
      return session
    } catch (error) {
      set({ status: 'error', error: messageOf(error) })
      throw error
    }
  },
  logout(client) {
    client.clearSession()
    set({ status: 'anonymous', user: null, error: null })
  },
  clearError() { set({ error: null }) }
}))
