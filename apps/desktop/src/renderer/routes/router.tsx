import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { BookOpen, Database, FileText, Loader2, LogIn, Moon, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Store, Sun } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { toContractShop, type KnowledgeBase, type KnowledgeDocument, type Product } from '@aichat/backend-client'
import { useWorkspaceStore } from '@aichat/core'
import { platformOptions, platformRegistry } from '../../bootstrap/platform-registry'
import { PlatformView } from '../features/platform/PlatformView'
import { LoginModal } from '../features/auth/LoginModal'
import { WorkspaceLayout } from '../features/workspace/WorkspaceLayout'
import { backendClient } from '../lib/backend'
import { useSessionStore } from '../lib/session-store'
import { useUiStore } from '../lib/ui-store'

const rootRoute = createRootRoute({ component: () => <WorkspaceLayout><Outlet /><LoginModal /></WorkspaceLayout> })
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsPage })
const productsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/products', component: ProductsPage })
const knowledgeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/knowledge', component: KnowledgePage })
const logsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/logs', component: LogsPage })
const routeTree = rootRoute.addChildren([homeRoute, settingsRoute, productsRoute, knowledgeRoute, logsRoute])
export const router = createRouter({ routeTree })
declare module '@tanstack/react-router' { interface Register { router: typeof router } }

function PageFrame({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6 lg:p-10"><div className="mx-auto max-w-6xl"><p className="text-xs font-semibold tracking-widest text-blue-600">{eyebrow}</p><h2 className="mt-2 text-2xl font-semibold text-slate-700">{title}</h2>{children}</div></div>
}

function HomePage() {
  const status = useSessionStore((state) => state.status)
  const shops = useWorkspaceStore((state) => state.shops)
  const activeShopId = useWorkspaceStore((state) => state.activeShopId)
  const setShops = useWorkspaceStore((state) => state.setShops)
  const selectShop = useWorkspaceStore((state) => state.selectShop)
  const openLogin = useUiStore((state) => state.openLogin)
  const [search, setSearch] = useState('')
  const [offlineSleeping, setOfflineSleeping] = useState(false)
  const [platformOpen, setPlatformOpen] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const filtered = useMemo(() => shops.filter((shop) => shop.displayName.toLowerCase().includes(search.toLowerCase())), [shops, search])
  const activeShop = shops.find((shop) => shop.id === activeShopId) ?? shops[0]

  const reloadShops = async () => {
    if (!backendClient.isAuthenticated()) return
    try {
      const data = await backendClient.listShops()
      setShops(data.items.map(toContractShop))
      setLoadError(null)
    } catch (error) { setLoadError(error instanceof Error ? error.message : String(error)) }
  }

  if (status !== 'authenticated') return <div className="flex h-full bg-gradient-to-br from-slate-50/90 via-blue-50/80 to-slate-50/90"><LoginSidebar onLogin={openLogin} /><WelcomePanel onLogin={openLogin} /></div>

  return <div className="relative flex h-full overflow-hidden bg-gradient-to-br from-slate-50/90 via-blue-50/80 to-slate-50/90">
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-slate-200/70 bg-white/90 shadow-sm backdrop-blur-sm">
      <div className="flex h-10 shrink-0 border-b border-slate-200 bg-white"><button type="button" className="flex-1 border-b-2 border-blue-600 text-sm font-medium text-blue-600">在线 {shops.length ? `(${shops.length})` : ''}</button><button type="button" className="flex-1 text-sm font-medium text-slate-400 hover:text-slate-700">未登录</button></div>
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-3 py-2"><div className="relative flex-1"><Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索店铺名称" className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></div><button type="button" aria-label={offlineSleeping ? '唤醒离线店铺' : '沉睡离线店铺'} onClick={() => setOfflineSleeping((value) => !value)} className={`rounded-md border p-1.5 transition ${offlineSleeping ? 'border-amber-200 bg-amber-50 text-amber-500' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}>{offlineSleeping ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2"><button type="button" onClick={() => setPlatformOpen((value) => !value)} className="flex w-full items-center gap-2 px-2 py-2 text-left text-xs font-semibold text-slate-500"><span className="h-2 w-2 rounded-full bg-blue-500" />{activeShop ? platformRegistry.get(activeShop.platformId).manifest.displayName : '平台'}<span className="ml-auto text-slate-300">{platformOpen ? '⌃' : '⌄'}</span></button>{platformOpen && (offlineSleeping ? <div className="flex flex-col items-center py-20 text-center"><Moon className="h-12 w-12 text-amber-400" /><p className="mt-4 text-sm font-medium text-slate-500">店铺已沉睡</p><p className="mt-1 text-xs text-slate-400">点击上方按钮唤醒</p></div> : filtered.map((shop) => <button type="button" key={shop.id} onClick={() => selectShop(shop.id)} className={`group mb-1 flex w-full items-center gap-2 rounded-lg p-2 text-left transition ${activeShop?.id === shop.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}><img src={shop.avatarUrl || '/assets/images/icon.png'} alt="" className="h-10 w-10 rounded-lg border border-slate-100 object-cover" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium text-slate-700">{shop.displayName}</strong><small className="mt-1 block truncate text-[11px] text-slate-400">{platformRegistry.get(shop.platformId).manifest.displayName} · {shop.accountName || '未设置客服'}</small></span><span className="h-2 w-2 rounded-full bg-emerald-400" /></button>))}</div>
      <div className="shrink-0 border-t border-slate-100 p-3"><div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-500" />服务连接正常<button type="button" aria-label="刷新店铺" className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100" onClick={() => void reloadShops()}><Settings2 className="h-4 w-4" /></button></div></div>
    </aside>
    <main className="min-w-0 flex-1">{loadError && <div role="alert" className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600 shadow-sm">{loadError}</div>}{activeShop ? <PlatformView key={activeShop.id} shop={activeShop} /> : <WelcomePanel onLogin={reloadShops} compact />}</main>
  </div>
}

function LoginSidebar({ onLogin }: { readonly onLogin: () => void }) {
  return <aside className="flex h-full w-80 shrink-0 flex-col border-r border-slate-200/70 bg-white/90 p-4 shadow-sm"><div className="border-b border-slate-100 pb-4"><p className="text-xs font-semibold tracking-widest text-blue-600">店铺管理</p><h2 className="mt-2 text-lg font-semibold text-slate-700">连接平台店铺</h2><p className="mt-1 text-xs leading-5 text-slate-400">登录后统一管理店铺消息、商品和订单。</p></div><button type="button" onClick={onLogin} className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:from-blue-600 hover:to-blue-700"><LogIn className="h-4 w-4" />一键登录</button><div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400"><Store className="h-4 w-4" />平台能力由独立 package 提供</div></aside>
}

function WelcomePanel({ onLogin, compact = false }: { readonly onLogin: () => void; readonly compact?: boolean }) {
  return <div className="flex min-w-0 flex-1 items-center justify-center p-8 text-center"><div className={`animate-float-in ${compact ? 'max-w-sm' : 'max-w-lg'}`}><img src="/assets/images/jianXiaoZhiAi.png" alt="小二智客" className="mx-auto h-20 w-20 rounded-2xl object-contain" /><h2 className="mt-5 text-xl font-semibold text-slate-700">欢迎使用小二智客</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">登录后即可连接平台客服工作台，让店铺消息、商品与订单在一个窗口内流转。</p>{!compact && <button type="button" onClick={onLogin} className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">立即登录</button>}</div></div>
}

function SettingsPage() {
  const logout = useSessionStore((state) => state.logout)
  const status = useSessionStore((state) => state.status)
  return <PageFrame eyebrow="设置中心" title="工作台设置"><p className="mt-2 text-sm text-slate-400">平台能力由独立 package 管理，当前已发现 {platformOptions.length} 个平台包。</p><div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">{platformOptions.map((platform) => <div className="flex items-center gap-4 py-5" key={platform.id}><span className="h-3 w-3 rounded-full" style={{ backgroundColor: platform.color }} /><div className="flex-1"><strong className="text-sm font-medium text-slate-700">{platform.label}</strong><small className="mt-1 block text-xs text-slate-400">{platform.host} · {platform.host === 'webview' ? 'window runtime / CDP' : '主进程服务驱动'}</small></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-600">{status === 'authenticated' ? '已启用' : '等待登录'}</span></div>)}</div><button type="button" onClick={() => logout(backendClient)} className="mt-8 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50">退出登录</button></PageFrame>
}

function ProductsPage() {
  const shops = useWorkspaceStore((state) => state.shops); const shop = shops[0]; const [products, setProducts] = useState<Product[]>([]); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('')
  const load = async () => { if (!shop) return; setBusy(true); try { const result = await backendClient.listProducts(shop.id, shop.platformId); setProducts(result.items); setMessage(`共 ${result.total} 个商品`) } catch (cause) { setMessage(cause instanceof Error ? cause.message : String(cause)) } finally { setBusy(false) } }
  useEffect(() => { void load() }, [shop?.id])
  const task = async (action: 'sync-products' | 'learn-products') => { if (!shop || !window.workbench) return; setBusy(true); try { const result = await window.workbench.invoke({ type: 'task', shop, action }) as { message?: string }; setMessage(result.message ?? '任务已完成'); await load() } catch (cause) { setMessage(cause instanceof Error ? cause.message : String(cause)) } finally { setBusy(false) } }
  return <PageFrame eyebrow="商品库" title="商品同步与学习"><div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><Database className="h-5 w-5 text-blue-500" /><span className="text-sm text-slate-600">{shop ? `${shop.displayName} · ${shop.platformId}` : '请先添加店铺'}</span><button onClick={() => void task('sync-products')} disabled={busy || !shop} className="ml-auto rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"><RefreshCw className="mr-1 inline h-3.5 w-3.5" />同步商品</button><button onClick={() => void task('learn-products')} disabled={busy || !shop} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 disabled:opacity-50"><Sparkles className="mr-1 inline h-3.5 w-3.5" />学习商品</button></div>{message && <p className="mt-3 text-xs text-slate-500">{message}</p>}<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <div key={product.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="h-32 bg-slate-100">{product.image && <img src={product.image} alt="" className="h-full w-full object-cover" />}</div><div className="p-3"><p className="truncate text-sm font-medium text-slate-700">{product.name || product.goodsId}</p><p className="mt-1 text-xs text-slate-400">¥{product.price.toFixed(2)} · {product.learnStatus}</p></div></div>)}{!products.length && <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">暂无商品，先同步平台商品</div>}</div></PageFrame>
}

function KnowledgePage() {
  const [bases, setBases] = useState<KnowledgeBase[]>([]); const [selected, setSelected] = useState<KnowledgeBase | null>(null); const [docs, setDocs] = useState<KnowledgeDocument[]>([]); const [name, setName] = useState(''); const [answer, setAnswer] = useState(''); const [question, setQuestion] = useState(''); const [message, setMessage] = useState('')
  const load = async () => { try { const result = await backendClient.listKnowledge(); setBases(result.knowledge_bases ?? []) } catch (cause) { setMessage(cause instanceof Error ? cause.message : String(cause)) } }; useEffect(() => { void load() }, [])
  const select = async (base: KnowledgeBase) => { setSelected(base); try { const result = await backendClient.listDocuments(base.binding_id); setDocs(result.documents ?? []) } catch (cause) { setMessage(cause instanceof Error ? cause.message : String(cause)) } }
  const create = async () => { if (!name.trim()) return; try { await backendClient.saveKnowledge({ name, description: '', shop_bindings: [] }); setName(''); setMessage('知识库已创建'); await load() } catch (cause) { setMessage(cause instanceof Error ? cause.message : String(cause)) } }
  const saveDoc = async () => { if (!selected || !question.trim() || !answer.trim()) return; try { await backendClient.saveDocument(selected.binding_id, { question, answer, enabled: true, keywords: [] }); setQuestion(''); setAnswer(''); setMessage('问答已保存'); await select(selected) } catch (cause) { setMessage(cause instanceof Error ? cause.message : String(cause)) } }
  return <PageFrame eyebrow="知识库" title="问答知识管理"><div className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr]"><aside className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} className="h-9 min-w-0 flex-1 rounded border border-slate-200 px-2 text-xs" placeholder="新建知识库" /><button onClick={() => void create()} className="rounded bg-blue-600 px-2 text-xs text-white">新增</button></div><div className="mt-3 space-y-1">{bases.map((base) => <button key={base.binding_id} onClick={() => void select(base)} className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm ${selected?.binding_id === base.binding_id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}><BookOpen className="h-4 w-4" />{base.name}</button>)}{!bases.length && <p className="p-3 text-xs text-slate-400">暂无知识库</p>}</div></aside><section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-violet-500" /><h3 className="text-sm font-semibold text-slate-700">{selected?.name ?? '选择一个知识库'}</h3></div>{selected && <><div className="mt-5 grid gap-3"><input value={question} onChange={(event) => setQuestion(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" placeholder="用户可能会问什么？" /><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-24 rounded-lg border border-slate-200 p-3 text-sm" placeholder="输入标准回答" /><button onClick={() => void saveDoc()} className="w-fit rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white">保存问答</button></div><div className="mt-6 space-y-2">{docs.map((doc, index) => <div className="rounded-lg border border-slate-100 bg-slate-50 p-3" key={doc.document_id ?? index}><p className="text-sm font-medium text-slate-700">{doc.question}</p><p className="mt-1 text-xs leading-5 text-slate-500">{doc.answer}</p></div>)}</div></>}{message && <p className="mt-4 text-xs text-slate-500">{message}</p>}</section></div></PageFrame>
}

function LogsPage() { const [logs, setLogs] = useState<import('@aichat/contracts').LogEntry[]>([]); useEffect(() => { void window.workbench?.invoke({ type: 'logs' }).then((value) => setLogs(value as import('@aichat/contracts').LogEntry[])); const stop = window.workbench?.subscribe((entry) => setLogs((current) => [...current, entry].slice(-200))); return () => stop?.() }, []); return <PageFrame eyebrow="运行日志" title="平台任务与窗口日志"><div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="max-h-[560px] overflow-auto p-3 font-mono text-xs">{logs.map((log) => <div key={log.id} className="flex gap-3 border-b border-slate-50 py-2"><span className="text-slate-400">{new Date(log.time).toLocaleTimeString()}</span><span className={log.level === 'error' ? 'text-rose-600' : 'text-emerald-600'}>{log.message}</span></div>)}{!logs.length && <p className="p-10 text-center text-slate-400">暂无日志</p>}</div></div></PageFrame> }
