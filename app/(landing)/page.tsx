'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ShieldCheck, Lock, Activity } from 'lucide-react'

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const mockupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Animações de entrada minimalistas
    const ctx = gsap.context(() => {
      // Elementos do texto
      gsap.fromTo(
        '.gsap-fade-up',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          clearProps: 'all'
        }
      )

      // Animação suave do mockup do dashboard flutuando
      if (mockupRef.current) {
        gsap.fromTo(
          mockupRef.current,
          { y: 50, opacity: 0, scale: 0.98 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 1.2,
            delay: 0.2,
            ease: 'power3.out',
          }
        )

        // Movimento contínuo e extremamente suave de levitação
        gsap.to(mockupRef.current, {
          y: -15,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 1.4
        })
      }
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen bg-white relative overflow-hidden" ref={heroRef}>
      {/* Background sutil (nada escuro, nada de neon) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-50/50 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-50/30 blur-[150px]" />
      </div>

      {/* Header Minimalista */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-xl font-extrabold text-slate-800 tracking-tight">
            Odonto<span className="text-blue-600">SaaS</span>
          </span>
        </div>
        
        <Link 
          href="/login" 
          className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors px-4 py-2"
        >
          Acessar Sistema
        </Link>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 container mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/80 border border-blue-100 text-blue-700 text-xs font-semibold mb-8 gsap-fade-up shadow-sm">
          <Activity className="h-4 w-4" />
          O novo padrão em tecnologia clínica
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-tight mb-6 gsap-fade-up">
          A nova geração da <br className="hidden md:block" />
          <span className="text-blue-600">gestão odontológica</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mb-10 gsap-fade-up leading-relaxed">
          Um software médico premium projetado para clínicas que exigem velocidade, elegância e confiabilidade total em seus processos diários.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 gsap-fade-up">
          <Link 
            href="/login" 
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5"
          >
            Acessar Sistema
          </Link>
        </div>

        {/* Mockup Abstrato Premium do Dashboard */}
        <div 
          ref={mockupRef}
          className="w-full max-w-5xl bg-white rounded-2xl border border-slate-200/60 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative"
        >
          {/* Barra superior do mockup */}
          <div className="bg-slate-50 rounded-t-xl rounded-b-lg border border-slate-100 h-12 w-full flex items-center px-4 gap-2 mb-4">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="w-3 h-3 rounded-full bg-slate-300" />
            </div>
            <div className="mx-auto w-48 h-5 bg-white rounded-md border border-slate-200/50 shadow-sm" />
          </div>

          {/* Grid do mockup */}
          <div className="grid grid-cols-12 gap-4 px-2 pb-2 h-64 md:h-96">
            <div className="col-span-3 hidden md:flex flex-col gap-3">
              <div className="h-8 bg-slate-50 rounded-lg w-full" />
              <div className="h-8 bg-blue-50 border border-blue-100 rounded-lg w-full" />
              <div className="h-8 bg-slate-50 rounded-lg w-full" />
              <div className="h-8 bg-slate-50 rounded-lg w-3/4" />
            </div>
            <div className="col-span-12 md:col-span-9 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-24 bg-slate-50 border border-slate-100 rounded-xl" />
                <div className="h-24 bg-slate-50 border border-slate-100 rounded-xl" />
                <div className="h-24 bg-slate-50 border border-slate-100 rounded-xl" />
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl" />
            </div>
          </div>
        </div>

      </main>

      {/* Footer com Badges LGPD e Segurança */}
      <footer className="relative z-10 border-t border-slate-100 bg-white/50 backdrop-blur-sm mt-12 py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400 font-medium">
            © {new Date().getFullYear()} OdontoSaaS. Sistema de gestão clínica.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold">Em conformidade com a LGPD</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Lock className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium">Criptografia End-to-End</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
