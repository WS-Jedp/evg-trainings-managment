'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
    } else {
      router.refresh()
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Atmospheric background ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large centre glow */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.07) 0%, transparent 65%)' }}
        />
        {/* Top-left accent */}
        <div
          className="absolute -top-32 -left-32 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.05) 0%, transparent 70%)' }}
        />
        {/* Bottom-right accent */}
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.04) 0%, transparent 70%)' }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Card ── */}
      <div
        className="w-full max-w-md relative z-10 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(22,22,22,0.95) 0%, rgba(12,12,12,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Orange top stripe */}
        <div
          className="h-0.5 w-full"
          style={{ background: 'linear-gradient(90deg, transparent, #FF8C00 40%, #FF8C00 60%, transparent)' }}
        />

        <div className="px-8 pt-10 pb-10">

          {/* ── Logo ── */}
          <div className="flex flex-col items-center mb-10">
            <div
              className="relative w-36 h-36 rounded-2xl overflow-hidden mb-6 flex-shrink-0"
              style={{
                boxShadow: '0 0 40px rgba(255,140,0,0.18), 0 8px 32px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,140,0,0.15)',
              }}
            >
              <Image
                src="/evg_logo.jpg"
                alt="Team EVG"
                fill
                sizes="144px"
                className="object-cover"
                priority
              />
            </div>
            <p className="text-zinc-500 text-[11px] uppercase tracking-[0.35em] font-medium mb-1">
              Academia de Básquet
            </p>
            <h1
              className="font-varsity text-white leading-none tracking-wide"
              style={{ fontSize: 'clamp(2.2rem, 10vw, 3rem)' }}
            >
              Team EVG
            </h1>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-evg-orange/60" />
              <span className="text-evg-orange text-[10px] uppercase tracking-[0.3em] font-semibold">
                Portal de Gestión
              </span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-evg-orange/60" />
            </div>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email field */}
            <div className="relative group">
              <label className="block text-zinc-500 text-[10px] uppercase tracking-[0.25em] font-semibold mb-2 ml-1">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-evg-orange transition-colors duration-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="login-input pl-11"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="relative group">
              <label className="block text-zinc-500 text-[10px] uppercase tracking-[0.25em] font-semibold mb-2 ml-1">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-evg-orange transition-colors duration-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="login-input pl-11 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors duration-150"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="login-btn w-full mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Ingresando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2.5">
                  Ingresar
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-zinc-700 text-[11px] mt-8">
            By: Gio Muñoz · EVG Basketball Academy
          </p>
        </div>
      </div>
    </div>
  )
}
