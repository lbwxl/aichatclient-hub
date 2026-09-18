import { RouterProvider } from '@tanstack/react-router'
import { useEffect } from 'react'

import { toContractShop } from '@aichat/backend-client'
import { backendClient } from '../lib/backend'
import { useSessionStore } from '../lib/session-store'
import { router } from '../routes/router'
import { useWorkspaceStore } from '@aichat/core'

export function App() {
  const initialize = useSessionStore((state) => state.initialize)
  const status = useSessionStore((state) => state.status)
  const setShops = useWorkspaceStore((state) => state.setShops)

  useEffect(() => {
    let disposed = false
    void initialize(backendClient)
    return () => { disposed = true }
  }, [initialize, setShops])

  useEffect(() => {
    if (status !== 'authenticated') return
    void window.workbench?.invoke({ type: 'session', token: backendClient.token })
    let disposed = false
    void backendClient.listShops().then((data) => {
      if (!disposed) setShops(data.items.map(toContractShop))
    }).catch((error) => console.warn('[backend] shop list failed', error))
    return () => { disposed = true }
  }, [status, setShops])

  return <RouterProvider router={router} />
}
