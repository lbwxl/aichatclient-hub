import type { ChatMessage, ConnectionStatus, Shop } from '@aichat/contracts'
import type { PlatformRuntimeController } from '@aichat/platform-sdk'
import { create } from 'zustand'

export interface WorkspaceState {
  shops: readonly Shop[]
  activeShopId: string | null
  connectionByShop: Readonly<Record<string, ConnectionStatus>>
  messagesByShop: Readonly<Record<string, readonly ChatMessage[]>>
  lastError: string | null
  setShops(shops: readonly Shop[]): void
  patchShop(shopId: string, patch: Partial<Shop>): void
  setConnectionStatus(shopId: string, status: ConnectionStatus, error?: string): void
  appendMessage(message: ChatMessage): void
  selectShop(shopId: string | null): void
  connect(shopId: string, runtime: PlatformRuntimeController): Promise<void>
  disconnect(shopId: string, runtime: PlatformRuntimeController): Promise<void>
  sendMessage(
    shopId: string,
    conversationId: string,
    content: string,
    runtime: PlatformRuntimeController
  ): Promise<void>
  bindRuntime(runtime: PlatformRuntimeController): () => void
}

const findShop = (shops: readonly Shop[], shopId: string): Shop => {
  const shop = shops.find((item) => item.id === shopId)
  if (!shop) throw new Error(`Shop "${shopId}" was not found`)
  return shop
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  shops: [],
  activeShopId: null,
  connectionByShop: {},
  messagesByShop: {},
  lastError: null,
  setShops(shops) {
    const currentActive = get().activeShopId
    const nextActiveShopId =
      (currentActive && shops.some((shop) => shop.id === currentActive) ? currentActive : shops[0]?.id) ?? null
    set({
      shops,
      activeShopId: nextActiveShopId
    })
  },
  patchShop(shopId, patch) {
    set((state) => ({
      shops: state.shops.map((shop) => shop.id === shopId ? { ...shop, ...patch } : shop)
    }))
  },
  setConnectionStatus(shopId, status, error) {
    set((state) => ({
      connectionByShop: { ...state.connectionByShop, [shopId]: status },
      lastError: error ?? state.lastError
    }))
  },
  appendMessage(message) {
    set((state) => {
      const current = state.messagesByShop[message.shopId] ?? []
      return { messagesByShop: { ...state.messagesByShop, [message.shopId]: [...current, message].slice(-200) } }
    })
  },
  selectShop(activeShopId) {
    set({ activeShopId })
  },
  async connect(shopId, runtime) {
    try {
      await runtime.connect(findShop(get().shops, shopId))
      set({ lastError: null })
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : String(error) })
      throw error
    }
  },
  async disconnect(shopId, runtime) {
    try {
      await runtime.disconnect(findShop(get().shops, shopId))
      set({ lastError: null })
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : String(error) })
      throw error
    }
  },
  async sendMessage(shopId, conversationId, content, runtime) {
    try {
      await runtime.sendMessage(findShop(get().shops, shopId), { conversationId, content })
      set({ lastError: null })
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : String(error) })
      throw error
    }
  },
  bindRuntime(runtime) {
    return runtime.observe({
      onStatus(shopId, status, error) {
        set((state) => ({
          connectionByShop: { ...state.connectionByShop, [shopId]: status },
          lastError: error ?? state.lastError
        }))
      },
      onMessage(message) {
        set((state) => {
          const current = state.messagesByShop[message.shopId] ?? []
          return {
            messagesByShop: {
              ...state.messagesByShop,
              [message.shopId]: [...current, message].slice(-200)
            }
          }
        })
      }
    })
  }
}))
