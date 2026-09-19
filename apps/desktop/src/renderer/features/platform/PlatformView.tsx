import { AlertCircle, Loader2, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { PlatformRuntime, PlatformRuntimeContext } from '@aichat/platform-sdk'
import type { PlatformMessage, Shop } from '@aichat/contracts'
import { platformRegistry } from '../../../bootstrap/platform-registry'

type WebViewElement = HTMLElement & {
  executeJavaScript?: <T = unknown>(expression: string, userGesture?: boolean) => Promise<T>
}

const logger = {
  debug(message: string, context?: Readonly<Record<string, unknown>>) { console.debug(`[platform-view] ${message}`, context ?? {}) },
  warn(message: string, context?: Readonly<Record<string, unknown>>) { console.warn(`[platform-view] ${message}`, context ?? {}) },
  error(message: string, context?: Readonly<Record<string, unknown>>) { console.error(`[platform-view] ${message}`, context ?? {}) }
}

export interface PlatformViewProps {
  readonly shop: Shop
}

/**
 * Renders any platform WebView through the SDK runtime. Platform-specific Hook
 * clients remain inside their package and are reached through runtime drivers.
 */
export function PlatformView({ shop }: PlatformViewProps) {
  const webviewRef = useRef<WebViewElement | null>(null)
  const readyRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [messageCount, setMessageCount] = useState(0)

  const runtime = useMemo<PlatformRuntime>(() => {
    const controller = new AbortController()
    const module = platformRegistry.get(shop.platformId)
    const context: PlatformRuntimeContext = {
      shop,
      signal: controller.signal,
      logger,
      registry: platformRegistry,
      services: {
        getWebviewExecutor: () => {
          const element = webviewRef.current
          if (!element?.executeJavaScript) return undefined
          return function execute<T>(expression: string) {
            return element.executeJavaScript?.<T>(expression) as Promise<T>
          }
        },
        isWebviewReady: () => readyRef.current
      }
    }
    return module.createRuntime(context)
  }, [shop])

  const url = runtime.webview?.getUrl(shop) ?? 'about:blank'
  const partition = runtime.webview?.getPartition(shop)
  const manifest = platformRegistry.get(shop.platformId).manifest

  useEffect(() => {
    let disposed = false
    if (!runtime.webview) {
      void runtime.start().then(() => {
        if (!disposed) setStatus('ready')
      }).catch((cause: unknown) => {
        if (!disposed) {
          setStatus('error')
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      })
    }
    return () => {
      disposed = true
      void runtime.stop()
    }
  }, [runtime])

  const onDomReady = () => {
    readyRef.current = true
    void runtime.start()
      .then(() => {
        setStatus('ready')
        const unsubscribe = runtime.messaging?.subscribe?.((_message: PlatformMessage) => {
          setMessageCount((count) => count + 1)
        })
        if (unsubscribe) {
          const element = webviewRef.current
          element?.addEventListener('destroyed', unsubscribe, { once: true })
        }
      })
      .catch((cause: unknown) => {
        setStatus('error')
        setError(cause instanceof Error ? cause.message : String(cause))
      })
  }

  useEffect(() => {
    const element = webviewRef.current
    if (!element) return
    element.addEventListener('dom-ready', onDomReady)
    return () => element.removeEventListener('dom-ready', onDomReady)
  }, [runtime])

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white/50">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/75 px-4 text-xs">
        {status === 'ready' ? <Wifi className="h-4 w-4 text-emerald-500" /> : status === 'error' ? <AlertCircle className="h-4 w-4 text-rose-500" /> : <WifiOff className="h-4 w-4 text-slate-400" />}
        <span className="font-medium text-slate-600">{manifest.displayName}</span>
        <span className="text-slate-400">{status === 'loading' ? '正在连接页面 runtime…' : status === 'ready' ? '已连接' : '连接异常'}</span>
        <span className="ml-auto text-slate-400">{messageCount ? `${messageCount} 条新消息` : ''}</span>
      </div>
      <div className="relative min-h-0 flex-1">
        {runtime.webview ? <webview ref={webviewRef} src={url} {...(partition ? { partition } : {})} allowpopups /> : <div className="grid h-full place-items-center text-sm text-slate-400">当前平台未提供 WebView driver</div>}
        {status !== 'ready' && runtime.webview && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-50/70 via-blue-50/50 to-slate-50/70 p-6 text-center">
          {status === 'loading' ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />正在加载 {manifest.displayName} 工作台</div> : <div className="max-w-sm"><AlertCircle className="mx-auto h-7 w-7 text-rose-400" /><p className="mt-3 text-sm font-medium text-slate-700">平台页面暂时不可用</p><p className="mt-2 text-xs leading-6 text-slate-400">{error ?? '请刷新页面后重试。'}</p></div>}
        </div>}
      </div>
      <div className="flex h-7 shrink-0 items-center justify-between border-t border-slate-200/80 bg-white/70 px-3 text-[10px] text-slate-400"><span>{error ?? `${manifest.displayName} runtime`}</span><span>通过 PlatformRuntime 连接</span></div>
    </div>
  )
}
