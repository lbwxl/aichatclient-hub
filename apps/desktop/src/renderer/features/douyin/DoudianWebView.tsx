import { AlertCircle, Loader2, MessageCircle, RefreshCw, Send, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { createDoudianWebViewClient, doudianHook, normalizeDoudianEvent, type ChatSession, type DoudianClient, type PlatformMessage } from '@aichat/platform-douyin'

interface DoudianWebViewProps {
  readonly shopId: string
  readonly src: string
}

type WebViewElement = HTMLElement & { executeJavaScript?: (expression: string) => Promise<unknown> }

export function DoudianWebView({ shopId, src }: DoudianWebViewProps) {
  const webviewRef = useRef<WebViewElement | null>(null)
  const clientRef = useRef<DoudianClient | null>(null)
  const [ready, setReady] = useState(false)
  const [auth, setAuth] = useState<'checking' | 'login-required' | 'authenticated' | 'error'>('checking')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<PlatformMessage[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const activeSessionRef = useRef<string | null>(null)

  useEffect(() => {
    const element = webviewRef.current
    if (!element) return
    let disposed = false
    let stopEvents: (() => void) | undefined
    const onDomReady = async () => {
      if (!element.executeJavaScript || disposed) {
        setAuth('login-required')
        setError('当前浏览器预览未提供 Electron WebView runtime')
        return
      }
      const executeJavaScript = element.executeJavaScript
      if (!executeJavaScript) return
      const client = createDoudianWebViewClient({ executeJavaScript: (expression) => executeJavaScript.call(element, expression) })
      clientRef.current = client
      try {
        await client.install()
        const state = await client.getAuthState()
        if (disposed) return
        if (!state.authenticated) setAuth('login-required')
        let authenticatedState = state
        if (!state.authenticated) {
          const deadline = Date.now() + 15 * 60_000
          while (!disposed && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 1500))
            if (disposed) return
            authenticatedState = await client.getAuthState()
            if (authenticatedState.authenticated) break
          }
        }
        if (disposed || !authenticatedState.authenticated) return
        setAuth('authenticated')
        setReady(true)
        const nextSessions = await client.listSessions()
        if (disposed) return
        setSessions(nextSessions)
        const first = nextSessions[0]
        if (first) {
          setActiveSessionId(first.id)
          setMessages(await client.listMessages(first.id))
        }
        stopEvents = client.subscribe((event) => {
          const message = normalizeDoudianEvent(shopId, event)
          if (message && message.conversationId === activeSessionRef.current) setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, { id: message.id, sessionId: message.conversationId, senderId: message.senderId, senderName: message.senderName, content: message.content, type: message.contentType, isMine: message.direction === 'outgoing', timestamp: Date.parse(message.receivedAt), raw: typeof message.raw === 'object' && message.raw !== null ? message.raw as Record<string, unknown> : undefined }])
        })
      } catch (cause) {
        if (!disposed) { setAuth('error'); setError(cause instanceof Error ? cause.message : String(cause)) }
      }
    }
    element.addEventListener('dom-ready', onDomReady)
    return () => {
      disposed = true
      element.removeEventListener('dom-ready', onDomReady)
      stopEvents?.()
      void clientRef.current?.dispose()
      clientRef.current = null
    }
  }, [shopId, src])

  useEffect(() => {
    activeSessionRef.current = activeSessionId
    const client = clientRef.current
    if (!client || !activeSessionId || auth !== 'authenticated') return
    void client.listMessages(activeSessionId).then(setMessages).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
  }, [activeSessionId, auth])

  const send = async () => {
    const content = draft.trim()
    const client = clientRef.current
    if (!client || !activeSessionId || !content) return
    setDraft('')
    try {
      await client.sendMessage(activeSessionId, content)
      setMessages((current) => [...current, { id: `local-${Date.now()}`, sessionId: activeSessionId, senderId: 'me', senderName: '我', content, type: 'text', isMine: true, timestamp: Date.now() }])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white/50">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/75 px-4 text-xs">
        {auth === 'authenticated' ? <Wifi className="h-4 w-4 text-emerald-500" /> : auth === 'error' ? <AlertCircle className="h-4 w-4 text-rose-500" /> : <WifiOff className="h-4 w-4 text-slate-400" />}
        <span className="font-medium text-slate-600">抖店工作台</span>
        <span className="text-slate-400">{auth === 'checking' ? '正在连接页面 runtime…' : auth === 'authenticated' ? '已连接' : auth === 'login-required' ? '请在页面内完成登录' : '连接异常'}</span>
        <span className="ml-auto text-slate-400">{ready ? `${sessions.length} 个会话` : ''}</span>
      </div>
      <div className="relative min-h-0 flex-1">
        {/** Electron replaces this custom element with a guest page. */}
        <webview ref={webviewRef} src={src} partition={`persist:douyin-${shopId}`} allowpopups />
        {auth !== 'authenticated' && (
          <div className={`absolute inset-0 grid place-items-center p-6 text-center ${auth === 'login-required' ? 'pointer-events-none bg-transparent' : 'bg-gradient-to-br from-slate-50/95 via-blue-50/90 to-slate-50/95'}`}>
            {auth === 'checking' ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />正在加载抖店工作台</div> : <div className="max-w-sm"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-blue-600"><MessageCircle className="h-7 w-7" /></div><p className="text-sm font-medium text-slate-700">{auth === 'login-required' ? '请在抖店页面完成登录' : '抖店页面暂时不可用'}</p><p className="mt-2 text-xs leading-6 text-slate-400">{error ?? '登录完成后会自动加载会话和消息。'}</p></div>}
          </div>
        )}
        {auth === 'authenticated' && <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200/80 bg-white/95 shadow-sm"><div className="flex h-10 items-center justify-between border-b border-slate-100 px-3 text-xs font-semibold text-slate-600"><span>会话列表</span><button type="button" aria-label="刷新会话" className="rounded p-1 text-slate-400 hover:bg-slate-100" onClick={() => void clientRef.current?.listSessions().then(setSessions)}><RefreshCw className="h-3.5 w-3.5" /></button></div><div className="min-h-0 flex-1 overflow-y-auto p-2">{sessions.map((session) => <button type="button" key={session.id} onClick={() => setActiveSessionId(session.id)} className={`mb-1 w-full rounded-lg p-2 text-left transition ${activeSessionId === session.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}><span className="block truncate text-xs font-medium">{session.title || '未命名会话'}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{session.lastMessage || '暂无消息'}</span></button>)}{sessions.length === 0 && <p className="px-2 py-8 text-center text-xs text-slate-400">暂无会话</p>}</div><div className="border-t border-slate-100 p-2"><div className="flex items-end gap-1 rounded-lg border border-slate-200 bg-white p-1"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} className="min-h-8 flex-1 resize-none border-0 px-1 py-1 text-xs outline-none" placeholder="输入消息" /><button type="button" aria-label="发送消息" onClick={() => void send()} className="rounded-md bg-blue-600 p-1.5 text-white hover:bg-blue-700"><Send className="h-3.5 w-3.5" /></button></div></div></div>}
      </div>
      <div className="flex h-7 shrink-0 items-center justify-between border-t border-slate-200/80 bg-white/70 px-3 text-[10px] text-slate-400"><span>{error ?? `抖店 Hook runtime v${doudianHook.version}`}</span><span>仅通过 window runtime 连接</span></div>
    </div>
  )
}
