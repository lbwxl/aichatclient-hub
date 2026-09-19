import { Link } from '@tanstack/react-router'
import { Bell, BookOpen, CircleHelp, ClipboardList, Home, Plus, RefreshCw, Settings, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { platformOptions } from '../../../bootstrap/platform-registry'
import { backendClient } from '../../lib/backend'

import { useSessionStore } from '../../lib/session-store'
import { useUiStore } from '../../lib/ui-store'

export function WorkspaceLayout({ children }: { readonly children: ReactNode }) {
  const user = useSessionStore((state) => state.user)
  const status = useSessionStore((state) => state.status)
  const openLogin = useUiStore((state) => state.openLogin)
  const initials = (user?.nickname || user?.username || '访').slice(0, 1).toUpperCase()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="flex h-screen min-w-[320px] flex-col overflow-hidden bg-slate-50 text-slate-700">
      <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-blue-100/70 bg-white/90 px-6 shadow-sm backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/assets/images/icon.png" alt="小二智客" className="h-8 w-8 rounded-lg object-cover shadow-md" />
            <h1 className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-xl font-bold text-transparent">小二智客</h1>
            <span className="hidden rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600 sm:inline">当前 v0.1</span>
          </div>
          <button type="button" aria-label="刷新店铺" className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /></button>
          <button type="button" className="hidden items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-600 shadow-sm transition hover:bg-blue-50 sm:flex" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> 添加店铺</button>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <nav className="hidden items-center gap-5 text-xs font-semibold text-slate-600 lg:flex">
            <Link to="/" activeOptions={{ exact: true }} className="flex items-center gap-1.5 transition hover:text-blue-700"><Home className="h-4 w-4 text-blue-600" />首页</Link>
            <Link to="/products" className="flex items-center gap-1.5 transition hover:text-blue-700"><ClipboardList className="h-4 w-4 text-blue-600" />商品库</Link>
            <Link to="/knowledge" className="flex items-center gap-1.5 transition hover:text-blue-700"><BookOpen className="h-4 w-4 text-blue-600" />知识库</Link>
            <Link to="/settings" className="flex items-center gap-1.5 transition hover:text-blue-700"><Settings className="h-4 w-4 text-blue-600" />设置中心</Link>
            <Link to="/logs" className="hidden items-center gap-1.5 transition hover:text-blue-700 xl:flex"><CircleHelp className="h-4 w-4 text-blue-600" />日志</Link>
          </nav>
          <button type="button" aria-label="消息通知" className="relative rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"><Bell className="h-5 w-5" /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" /></button>
          <button type="button" aria-label={user ? '用户中心' : '登录'} onClick={openLogin} className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-blue-50"><span className="grid h-9 w-9 place-items-center rounded-full border border-blue-100 bg-gradient-to-br from-blue-100 to-violet-100 text-sm font-bold text-blue-700 shadow-sm">{status === 'authenticated' ? initials : <UserRound className="h-4 w-4" />}</span></button>
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />
          <div className="hidden items-center gap-2 sm:flex" aria-label="窗口控制"><button type="button" aria-label="最小化" onClick={() => void window.desktopWindow?.minimize()} className="h-4 w-4 rounded-full bg-amber-400 transition hover:brightness-90" /><button type="button" aria-label="最大化" onClick={() => void window.desktopWindow?.maximize()} className="h-4 w-4 rounded-full bg-emerald-400 transition hover:brightness-90" /><button type="button" aria-label="关闭" onClick={() => void window.desktopWindow?.close()} className="h-4 w-4 rounded-full bg-rose-400 transition hover:brightness-90" /></div>
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
      {addOpen && <AddShopModal onClose={() => setAddOpen(false)} />}
    </div>
  )
}

function AddShopModal({ onClose }: { readonly onClose: () => void }) {
  const [platform, setPlatform] = useState(platformOptions[0]?.id ?? ''); const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const save = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); try { await backendClient.createShop({ platform_en: platform, platform: platformOptions.find((item) => item.id === platform)?.label, shop_name: name || undefined, url: url || undefined }); onClose(); window.location.reload() } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) } finally { setBusy(false) } }
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/30 p-4 backdrop-blur-sm"><form onSubmit={(event) => void save(event)} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold tracking-widest text-blue-600">店铺管理</p><h3 className="mt-1 text-lg font-semibold text-slate-700">添加平台店铺</h3></div><button type="button" onClick={onClose} className="text-xl text-slate-400">×</button></div><label className="mt-5 block text-xs text-slate-600">平台<select value={platform} onChange={(event) => setPlatform(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3">{platformOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="mt-3 block text-xs text-slate-600">店铺名称<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" placeholder="登录后可自动识别" /></label><label className="mt-3 block text-xs text-slate-600">工作台地址<input value={url} onChange={(event) => setUrl(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" placeholder="可选，使用平台默认地址" /></label>{error && <p className="mt-3 rounded bg-rose-50 p-2 text-xs text-rose-600">{error}</p>}<button disabled={busy} className="mt-5 h-10 w-full rounded-lg bg-blue-600 text-sm font-medium text-white disabled:opacity-60">{busy ? '正在保存…' : '保存并打开'}</button></form></div>
}
