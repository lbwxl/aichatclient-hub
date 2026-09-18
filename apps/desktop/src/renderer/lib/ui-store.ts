import { create } from 'zustand'

interface UiState {
  loginModalOpen: boolean
  openLogin(): void
  closeLogin(): void
}

export const useUiStore = create<UiState>((set) => ({
  loginModalOpen: false,
  openLogin: () => set({ loginModalOpen: true }),
  closeLogin: () => set({ loginModalOpen: false })
}))
