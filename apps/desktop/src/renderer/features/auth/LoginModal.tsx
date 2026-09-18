import { useState } from 'react'
import { Eye, EyeOff, Loader2, X } from 'lucide-react'

import { backendClient } from '../../lib/backend'
import { useSessionStore } from '../../lib/session-store'
import { useUiStore } from '../../lib/ui-store'

export function LoginModal() {
  const open = useUiStore((state) => state.loginModalOpen)
  const close = useUiStore((state) => state.closeLogin)
  const login = useSessionStore((state) => state.login)
  const phoneLogin = useSessionStore((state) => state.phoneLogin)
  const status = useSessionStore((state) => state.status)
  const error = useSessionStore((state) => state.error)
  const [mode, setMode] = useState<'password' | 'code'>('password')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [invitationCode, setInvitationCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (!open) return null
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      if (mode === 'password') await login(backendClient, { phone, password, rememberMe: true })
      else await phoneLogin(backendClient, { phone, code, invitationCode: invitationCode || undefined })
      close()
    } catch {
      // The session store exposes the translated backend error in the modal.
    }
  }

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="登录小二智客"><div className="relative w-full max-w-md animate-float-in rounded-2xl bg-white p-7 shadow-2xl"><button type="button" aria-label="关闭登录窗口" onClick={close} className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button><div className="text-center"><img src="/assets/images/icon.png" alt="小二智客" className="mx-auto h-12 w-12 rounded-xl" /><h2 className="mt-3 text-xl font-semibold text-slate-700">登录小二智客</h2><p className="mt-1 text-xs text-slate-400">连接抖店客服工作台</p></div><div className="mt-6 flex border-b border-slate-200"><button type="button" onClick={() => setMode('password')} className={`flex-1 border-b-2 py-2 text-sm ${mode === 'password' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>密码登录</button><button type="button" onClick={() => setMode('code')} className={`flex-1 border-b-2 py-2 text-sm ${mode === 'code' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>验证码登录 / 注册</button></div><form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">手机号</span><input required value={phone} onChange={(event) => setPhone(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="请输入手机号" /></label>{mode === 'password' ? <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">密码</span><span className="relative block"><input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="请输入密码" /><button type="button" aria-label={showPassword ? '隐藏密码' : '显示密码'} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label> : <><label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">验证码</span><input required value={code} onChange={(event) => setCode(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="请输入短信验证码" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">邀请码（可选）</span><input value={invitationCode} onChange={(event) => setInvitationCode(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="请输入邀请码" /></label></>}{error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}<button disabled={status === 'loading'} type="submit" className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 text-sm font-medium text-white shadow-sm transition hover:from-blue-600 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-60">{status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}登录</button><p className="text-center text-[11px] text-slate-400">登录即代表同意用户协议和隐私政策</p></form></div></div>
}
