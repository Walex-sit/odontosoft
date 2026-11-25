'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function HeroSection() {
  const heroRef = useRef<HTMLElement>(null)
  const [mockupView, setMockupView] = useState<'agenda' | 'dashboard'>('agenda')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      { threshold: 0.05, rootMargin: '50px 0px' }
    )

    const el = heroRef.current
    if (el) {
      el.querySelectorAll('[data-animate]').forEach((child) =>
        observer.observe(child)
      )
    }
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-base)] px-6 pt-24 pb-16"
      id="hero"
    >

      {/* Badge pill */}
      <div
        data-animate
        className="opacity-0 translate-y-4 mb-6"
        style={{ '--delay': '0ms' } as React.CSSProperties}
      >
        <div className="inline-flex items-center gap-2 bg-[var(--primary-subtle)] border border-[var(--primary)]/40 text-[var(--primary)] text-xs font-semibold px-4 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
          Novo: Odontograma digital interativo
        </div>
      </div>

      {/* Headline */}
      <h1
        data-animate
        className="opacity-0 translate-y-6 max-w-3xl text-center text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-[var(--text-primary)] leading-[1.12] tracking-tight"
        style={{ '--delay': '80ms' } as React.CSSProperties}
      >
        A gestão da sua clínica odontológica,{' '}
        <span className="text-transparent bg-clip-text bg-[var(--primary)]">
          simples e previsível.
        </span>
      </h1>

      {/* Subheadline */}
      <p
        data-animate
        className="opacity-0 translate-y-6 mt-6 max-w-2xl text-center text-lg text-[var(--text-muted)] leading-relaxed"
        style={{ '--delay': '160ms' } as React.CSSProperties}
      >
        Agendamentos inteligentes, prontuário eletrônico completo e controle financeiro
        em um só lugar. Foque nos seus pacientes, nós cuidamos da gestão.
      </p>

      {/* CTA buttons */}
      <div
        data-animate
        className="opacity-0 translate-y-6 mt-10 flex flex-col sm:flex-row items-center gap-4"
        style={{ '--delay': '240ms' } as React.CSSProperties}
      >
        <Link
          href="/register"
          id="hero-cta-primary"
          className="inline-flex items-center gap-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] font-semibold px-8 py-3.5 rounded-2xl transition-all duration-200 active:scale-95 text-base"
        >
          Testar OdontoSoft Grátis
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
        <a
          href="#funcionalidades"
          id="hero-cta-secondary"
          className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium text-base transition-colors"
        >
          Ver funcionalidades
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </a>
      </div>

      {/* Demonstração técnica & portfólio notice */}
      <div
        data-animate
        className="mt-8 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--bg-base)] border border-[var(--border)]/80 shadow-2xs"
        style={{ '--delay': '300ms' } as React.CSSProperties}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
          Ambiente de demonstração técnica e portfólio.
        </p>
      </div>

      {/* Hero Dashboard Mockup — fiel ao sistema real */}
      <div
        data-animate
        className="opacity-0 translate-y-10 relative mt-14 sm:mt-16 w-full max-w-6xl"
        style={{ '--delay': '360ms' } as React.CSSProperties}
      >
        {/* Floating Badge Superior Direita - Multi-tenant Security */}
        <div className="hidden md:flex absolute -top-5 right-6 z-20 items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm px-3.5 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Isolamento Seguro Multi-Tenant & LGPD</span>
        </div>

        {/* Moldura de browser moderno */}
        <div className="relative rounded-2xl sm:rounded-[28px] border border-[var(--border)]/90 bg-white shadow-[0_25px_70px_-15px_rgba(15,23,42,0.18)] overflow-hidden">

          {/* ── Chrome / Window Bar ── */}
          <div className="flex items-center justify-between px-4 py-2.5 sm:py-3 border-b border-[var(--border)]/70 bg-[var(--bg-base)] select-none">
            {/* Window control buttons */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-400/80 border border-rose-500/30" />
              <div className="w-3 h-3 rounded-full bg-amber-400/80 border border-amber-500/30" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/80 border border-emerald-500/30" />
            </div>

            {/* URL bar com SSL & Status */}
            <div className="flex-1 max-w-md mx-3 sm:mx-6 h-6 sm:h-7 rounded-lg bg-white border border-[var(--border)]/80 shadow-2xs flex items-center justify-between px-3">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-[11px] font-mono text-[var(--text-secondary)] font-medium">app.odontosoft.com.br</span>
                <span className="text-[11px] font-mono text-[var(--primary)] font-semibold">/{mockupView}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-[var(--text-muted)] font-medium">v2.4 Live</span>
              </div>
            </div>

            {/* View Switcher Tabs: Interativo na Landing Page */}
            <div className="flex items-center bg-[var(--border)]/70 p-0.5 rounded-lg border border-[var(--border)]/90 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMockupView('agenda')}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                  mockupView === 'agenda'
                    ? 'bg-white text-[var(--primary)] shadow-2xs font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                aria-label="Ver Agenda Multicadeira"
              >
                Agenda
              </button>
              <button
                type="button"
                onClick={() => setMockupView('dashboard')}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                  mockupView === 'dashboard'
                    ? 'bg-white text-[var(--primary)] shadow-2xs font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                aria-label="Ver Dashboard Financeiro"
              >
                Métricas
              </button>
            </div>
          </div>

          {/* ── Topbar OdontoSoft Real — Replicando Topbar.tsx ── */}
          <div className="h-14 sm:h-15 w-full flex items-center justify-between px-3 sm:px-6 border-b border-[var(--border)]/80 bg-white shrink-0 select-none">
            {/* Esquerda: Logo + Clínica Selecionada + Nav */}
            <div className="flex items-center gap-3 sm:gap-6">
              {/* Logo OdontoSoft */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center text-[var(--on-primary)] ">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C8.5 2 6 4.5 6 8c0 3.5 1.5 6.5 2.5 10 .5 1.8 1.5 4 3.5 4s3-2.2 3.5-4c1-3.5 2.5-6.5 2.5-10 0-3.5-2.5-6-6-6z" />
                    <path d="M9 9c1-1 2.5-1.5 3-1.5s2 .5 3 1.5" />
                  </svg>
                </div>
                <div className="hidden xs:flex flex-col">
                  <span className="text-sm font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">OdontoSoft</span>
                  <span className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-wider">Cloud Suite</span>
                </div>
              </div>

              {/* Seletor de Clínica (Multi-Tenant Badge) */}
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-[var(--text-primary)]">Clínica Sorriso & Arte</span>
                <span className="px-1.5 py-0.2 rounded bg-[var(--primary-subtle)] text-[10px] font-extrabold text-[var(--primary)]">ADMIN</span>
                <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Abas de Navegação Primária */}
              <nav className="hidden sm:flex items-center gap-1">
                {[
                  { id: 'agenda', label: 'Agenda' },
                  { id: 'pacientes', label: 'Pacientes' },
                  { id: 'dashboard', label: 'Financeiro' },
                  { id: 'estoque', label: 'Estoque' },
                ].map((item) => {
                  const isActive = (item.id === 'agenda' && mockupView === 'agenda') ||
                                   (item.id === 'dashboard' && mockupView === 'dashboard')
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'agenda') setMockupView('agenda')
                        if (item.id === 'dashboard') setMockupView('dashboard')
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[var(--primary-subtle)] text-[var(--primary)] font-extrabold shadow-2xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Direita: Busca Global + WhatsApp Bot + Notificações + Avatar */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Barra de busca rápida com atalho ⌘K */}
              <div className="hidden lg:flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border)] px-3 py-1.5 rounded-xl text-xs text-[var(--text-muted)] w-52">
                <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                </svg>
                <span className="flex-1 truncate">Buscar paciente, CPF...</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] font-bold">⌘K</kbd>
              </div>

              {/* Status do WhatsApp Bot */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold">WhatsApp Ativo</span>
              </div>

              {/* Sino de Notificações com Badge */}
              <div className="relative p-2 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[var(--bg-surface)] text-[9px] text-white flex items-center justify-center font-bold">3</span>
              </div>

              {/* Avatar do Dentista / Administrador */}
              <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-[var(--border)]">
                <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center text-[var(--on-primary)] text-xs font-extrabold shadow-sm">
                  BS
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">Dra. Beatriz Santos</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Resp. Técnica</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Conteúdo do Mockup: Alternância entre Agenda e Dashboard ── */}
          {mockupView === 'agenda' ? (
            /* ================= VIEW 1: AGENDA MULTICADEIRA ================= */
            <div className="flex flex-col p-4 sm:p-6 gap-5 bg-[var(--bg-base)] min-h-[460px]">

              {/* Header da Agenda com Filtros & Ações */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] tracking-tight">Agenda Clínica</h2>
                    <span className="hidden xs:inline-block px-2.5 py-0.5 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] text-[10px] font-bold">
                      Multicadeira
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                    Terça-feira, 27 de Outubro • 18 pacientes agendados
                  </p>
                </div>

                {/* Controles de visualização e botão de novo agendamento */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Seletor de visualização */}
                  <div className="hidden xs:flex items-center bg-white border border-[var(--border)] rounded-xl p-0.5 text-xs font-semibold shadow-2xs">
                    {['Dia', 'Semana', 'Mês'].map((v, i) => (
                      <span
                        key={v}
                        className={`px-2.5 py-1 rounded-lg text-[11px] ${
                          i === 1 ? 'bg-[var(--primary)] text-[var(--on-primary)] font-bold' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {v}
                      </span>
                    ))}
                  </div>

                  {/* Filtro de Profissionais */}
                  <div className="hidden sm:flex items-center gap-1.5 bg-white border border-[var(--border)] px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] shadow-2xs">
                    <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Dra. Beatriz & Dr. Rafael</span>
                    <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </div>

                  {/* Botão Novo Agendamento */}
                  <div className="flex items-center gap-1.5 bg-[var(--primary)] text-[var(--on-primary)] rounded-xl px-3.5 py-1.5 text-xs font-bold shrink-0 cursor-default">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Novo Agendamento
                  </div>
                </div>
              </div>

              {/* 4 Cards de Indicadores / KPIs Diários (Design Shadcn/Tailwind) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                {[
                  {
                    label: 'Consultas Hoje',
                    value: '18',
                    sub: '14 confirmadas • 2 em espera',
                    badge: '+3 vs média',
                    color: 'text-[var(--primary)]',
                    bg: 'bg-[var(--primary-subtle)]',
                    dot: 'bg-[var(--primary)]',
                    icon: (
                      <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Confirmação WhatsApp',
                    value: '94.4%',
                    sub: '17 confirmados via bot',
                    badge: 'Automação Ativa',
                    color: 'text-emerald-700',
                    bg: 'bg-emerald-50',
                    dot: 'bg-emerald-500',
                    icon: (
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Sala de Espera',
                    value: '2 pacientes',
                    sub: 'Tempo médio: 6 min',
                    badge: 'No Horário',
                    color: 'text-amber-700',
                    bg: 'bg-amber-50',
                    dot: 'bg-amber-500',
                    icon: (
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Faturamento Previsto',
                    value: 'R$ 6.840',
                    sub: '100% dos procedimentos',
                    badge: '+18% vs ontem',
                    color: 'text-[var(--primary)]',
                    bg: 'bg-[var(--primary)]',
                    dot: 'bg-[var(--primary)]',
                    icon: (
                      <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="bg-white rounded-2xl border border-[var(--border)]/80 p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{card.label}</span>
                      <div className={`p-1.5 rounded-lg ${card.bg}`}>{card.icon}</div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight leading-none">{card.value}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${card.bg} ${card.color}`}>
                          <span className={`w-1 h-1 rounded-full ${card.dot}`} />
                          {card.badge}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bloco Central: Mini-Semana + Lista de Consultas com visual de Sistema Clínico Real */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">

                {/* Coluna Principal da Agenda (2/3 da largura) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--border)]/80 shadow-2xs overflow-hidden flex flex-col">
                  {/* Fita de Calendário Semanal */}
                  <div className="border-b border-[var(--border)] p-3 bg-[var(--bg-base)]">
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {[
                        { day: 'SEG', num: '26', count: 14, active: false },
                        { day: 'TER', num: '27', count: 18, active: true },
                        { day: 'QUA', num: '28', count: 16, active: false },
                        { day: 'QUI', num: '29', count: 15, active: false },
                        { day: 'SEX', num: '30', count: 19, active: false },
                        { day: 'SÁB', num: '31', count: 8, active: false },
                        { day: 'DOM', num: '01', count: 0, active: false },
                      ].map((item) => (
                        <div
                          key={item.day}
                          className={`rounded-xl py-2 px-1 flex flex-col items-center gap-1 transition-all ${
                            item.active
                              ? 'bg-[var(--primary)] text-[var(--on-primary)] '
                              : 'bg-white border border-[var(--border)]/60 text-[var(--text-secondary)] hover:bg-[var(--bg-base)]'
                          }`}
                        >
                          <span className={`text-[9px] font-bold ${item.active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                            {item.day}
                          </span>
                          <span className="text-xs sm:text-sm font-extrabold leading-none">{item.num}</span>
                          {item.count > 0 && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                item.active ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'bg-[var(--primary-subtle)] text-[var(--primary)]'
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Consultas em Tempo Real */}
                  <div className="p-3 sm:p-4 space-y-2.5 divide-y divide-[var(--border)]/60">
                    {[
                      {
                        time: '08:30 – 09:30',
                        patient: 'Mariana Silva Duarte',
                        record: '#1042',
                        procedure: 'Profilaxia & Raspagem Ultrassônica',
                        specialty: 'Clínica Geral',
                        dentist: 'Dra. Beatriz Santos',
                        chair: 'Cadeira 1',
                        status: 'Confirmado WhatsApp',
                        statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
                        statusDot: 'bg-emerald-500',
                        value: 'R$ 220',
                        avatar: 'MS',
                        avatarBg: 'bg-[var(--primary)]',
                      },
                      {
                        time: '09:45 – 11:00',
                        patient: 'Carlos Alberto Ramos',
                        record: '#0893',
                        procedure: 'Instalação de Prótese & Implante',
                        specialty: 'Reabilitação Oral',
                        dentist: 'Dr. Rafael Duarte',
                        chair: 'Cadeira 2',
                        status: 'Em Atendimento',
                        statusColor: 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]/30',
                        statusDot: 'bg-[var(--primary)] animate-ping',
                        value: 'R$ 1.850',
                        avatar: 'CR',
                        avatarBg: 'bg-[var(--primary-hover)]',
                      },
                      {
                        time: '11:15 – 12:00',
                        patient: 'Ana Clara Vasconcelos',
                        record: '#1205',
                        procedure: 'Manutenção de Aparelho Ortodôntico',
                        specialty: 'Ortodontia',
                        dentist: 'Dra. Beatriz Santos',
                        chair: 'Cadeira 1',
                        status: 'Aguardando Recepção',
                        statusColor: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/30',
                        statusDot: 'bg-[var(--warning)]',
                        value: 'R$ 180',
                        avatar: 'AC',
                        avatarBg: 'bg-[var(--warning)]',
                      },
                      {
                        time: '14:00 – 15:15',
                        patient: 'Lucas Fernandes Mendes',
                        record: '#0744',
                        procedure: 'Clareamento Dental a Laser',
                        specialty: 'Dentística Estética',
                        dentist: 'Dra. Beatriz Santos',
                        chair: 'Cadeira 1',
                        status: 'Confirmado',
                        statusColor: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/30',
                        statusDot: 'bg-[var(--success)]',
                        value: 'R$ 890',
                        avatar: 'LM',
                        avatarBg: 'bg-[var(--success)]',
                      },
                    ].map((slot, index) => (
                      <div
                        key={slot.patient}
                        className={`pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl p-2 hover:bg-[var(--bg-base)] transition-colors ${
                          index === 1 ? 'bg-[var(--primary-subtle)]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Horário */}
                          <div className="w-20 shrink-0 text-left">
                            <span className="text-xs font-bold text-[var(--text-primary)] font-mono block">{slot.time.split('–')[0]}</span>
                            <span className="text-[10px] text-[var(--text-secondary)] font-mono">até {slot.time.split('–')[1]}</span>
                          </div>

                          {/* Avatar com Iniciais */}
                          <div className={`w-8 h-8 rounded-xl ${slot.avatarBg} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                            {slot.avatar}
                          </div>

                          {/* Nome do Paciente & Procedimento */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">{slot.patient}</span>
                              <span className="text-[10px] text-[var(--text-muted)] font-mono">{slot.record}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)] truncate">
                              <span className="font-medium text-[var(--text-secondary)]">{slot.procedure}</span>
                              <span>•</span>
                              <span className="text-[var(--text-muted)]">{slot.dentist} ({slot.chair})</span>
                            </div>
                          </div>
                        </div>

                        {/* Status do Agendamento + Valor */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-12 sm:pl-0">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${slot.statusColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${slot.statusDot}`} />
                            {slot.status}
                          </span>
                          <span className="text-xs font-extrabold text-[var(--text-primary)] font-mono">{slot.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coluna Lateral: Sala de Espera ao Vivo & Bot WhatsApp */}
                <div className="flex flex-col gap-3.5">
                  {/* Widget: Sala de Espera Ao Vivo */}
                  <div className="bg-white rounded-2xl border border-[var(--border)]/80 p-4 shadow-2xs flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Sala de Espera (Ao Vivo)</h3>
                      </div>
                      <span className="text-[11px] font-extrabold text-[var(--text-muted)] bg-[var(--bg-base)] px-2 py-0.5 rounded-md">2 na fila</span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/50 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                            AC
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[var(--text-primary)]">Ana Clara V.</div>
                            <div className="text-[10px] text-amber-700 font-medium">Chegou há 6 min • Cadeira 1</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 bg-white px-2 py-0.5 rounded shadow-2xs">Pronto</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)]/60 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[var(--border-medium)] text-white flex items-center justify-center text-[10px] font-bold">
                            RD
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[var(--text-primary)]">Roberto Dias</div>
                            <div className="text-[10px] text-[var(--text-muted)]">Chegou há 2 min • Recepção</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text-muted)]">Aguardando</span>
                      </div>
                    </div>
                  </div>

                  {/* Widget: WhatsApp Bot em Tempo Real */}
                  <div className="bg-[var(--success)] text-white rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Lembretes via WhatsApp</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/40 text-[9px] font-extrabold">98% Eficácia</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">Confirmação via WhatsApp</h4>
                      <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                        Envie lembretes de consulta via WhatsApp em 1 clique. Reduza faltas e mantenha a agenda cheia.
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-emerald-500/40 flex items-center justify-between text-xs">
                      <span className="font-medium text-emerald-100">Disparos hoje: 18</span>
                      <span className="font-bold text-white bg-emerald-500/40 px-2 py-0.5 rounded">0 faltas</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* ================= VIEW 2: DASHBOARD GERENCIAL / FINANCEIRO ================= */
            <div className="flex flex-col p-4 sm:p-6 gap-5 bg-[var(--bg-base)] min-h-[460px]">

              {/* Header do Dashboard Financeiro */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] tracking-tight">Dashboard Gerencial</h2>
                    <span className="hidden xs:inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      DRE em Tempo Real
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                    Visão consolidada de faturamento, custos e lucratividade líquida da clínica
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-white border border-[var(--border)] px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] shadow-2xs flex items-center gap-1.5">
                    <span>Mês: Outubro / 2026</span>
                    <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  <div className="bg-[var(--primary)] text-[var(--on-primary)] px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Exportar Relatório
                  </div>
                </div>
              </div>

              {/* 4 Cards Financeiros Executivos */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                {[
                  {
                    label: 'Faturamento Bruto',
                    value: 'R$ 58.420',
                    badge: '+18.4% vs mês ant.',
                    sub: 'Receitas confirmadas',
                    color: 'text-emerald-700',
                    bg: 'bg-emerald-50',
                  },
                  {
                    label: 'Despesas & Custos',
                    value: 'R$ 16.890',
                    badge: '-3.2% economia',
                    sub: 'Insumos, lab & prótese',
                    color: 'text-rose-700',
                    bg: 'bg-rose-50',
                  },
                  {
                    label: 'Lucro Líquido Real',
                    value: 'R$ 41.530',
                    badge: 'Margem 71.1%',
                    sub: 'Split de parceiros calculado',
                    color: 'text-[var(--primary)]',
                    bg: 'bg-[var(--primary-subtle)]',
                  },
                  {
                    label: 'Novos Pacientes',
                    value: '42 novos',
                    badge: '+12% crescimento',
                    sub: 'Ticket médio: R$ 850',
                    color: 'text-[var(--primary)]',
                    bg: 'bg-[var(--primary)]',
                  },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-2xl border border-[var(--border)]/80 p-3.5 sm:p-4 shadow-2xs">
                    <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{card.label}</div>
                    <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight mt-1.5 leading-none">{card.value}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${card.bg} ${card.color}`}>
                        {card.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Gráficos Gerenciais: Fluxo de Caixa Mensal + Distribuição de Procedimentos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">

                {/* Gráfico de Barras: Comparativo Receitas x Despesas */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--border)]/80 p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">Evolução do Fluxo de Caixa (Últimos 6 meses)</h3>
                      <p className="text-[11px] text-[var(--text-muted)]">Receitas operacionais versus despesas da clínica</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                      <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[var(--primary)]" />
                        Receita
                      </div>
                      <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[var(--border-medium)]" />
                        Despesa
                      </div>
                    </div>
                  </div>

                  {/* Barras SVG elegantes */}
                  <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2 border-b border-[var(--border)]">
                    {[
                      { mes: 'MAI', rec: 65, desp: 25, val: 'R$ 38k' },
                      { mes: 'JUN', rec: 72, desp: 28, val: 'R$ 42k' },
                      { mes: 'JUL', rec: 78, desp: 30, val: 'R$ 46k' },
                      { mes: 'AGO', rec: 85, desp: 31, val: 'R$ 50k' },
                      { mes: 'SET', rec: 90, desp: 29, val: 'R$ 53k' },
                      { mes: 'OUT', rec: 100, desp: 32, val: 'R$ 58k', active: true },
                    ].map((col) => (
                      <div key={col.mes} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="text-[9px] font-extrabold text-[var(--primary)] opacity-0 group-hover:opacity-100">{col.val}</span>
                        <div className="w-full flex items-end justify-center gap-1 h-32">
                          <div
                            style={{ height: `${col.rec}%` }}
                            className={`w-1/2 rounded-t-md transition-all ${
                              col.active
                                ? 'bg-[var(--primary)] '
                                : 'bg-[var(--primary)]/80 hover:bg-[var(--primary)]'
                            }`}
                          />
                          <div
                            style={{ height: `${col.desp}%` }}
                            className="w-1/2 bg-[var(--border-medium)] hover:bg-[var(--text-secondary)] rounded-t-md transition-all"
                          />
                        </div>
                        <span className={`text-[10px] font-bold ${col.active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                          {col.mes}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 text-[11px] text-[var(--text-muted)] font-medium">
                    <span>Média de crescimento: <strong className="text-emerald-600">+14.2% ao mês</strong></span>
                    <span className="text-[var(--text-muted)]">Previsão Nov: R$ 62.000</span>
                  </div>
                </div>

                {/* Distribuição por Especialidade */}
                <div className="bg-white rounded-2xl border border-[var(--border)]/80 p-4 shadow-2xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">Receita por Especialidade</h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Top procedimentos mais lucrativos</p>

                    <div className="mt-4 space-y-3">
                      {[
                        { name: 'Ortodontia & Alinhadores', pct: 38, value: 'R$ 22.199', color: 'bg-[var(--primary)]' },
                        { name: 'Implantes & Próteses', pct: 28, value: 'R$ 16.357', color: 'bg-[var(--primary-subtle)]' },
                        { name: 'Dentística & Clareamento', pct: 22, value: 'R$ 12.852', color: 'bg-[var(--primary)]' },
                        { name: 'Clínica Geral & Prevenção', pct: 12, value: 'R$ 7.012', color: 'bg-emerald-500' },
                      ].map((item) => (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[var(--text-secondary)] truncate">{item.name}</span>
                            <span className="font-bold text-[var(--text-primary)] font-mono">{item.value}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[var(--bg-base)] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.color}`}
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)] font-medium">Procedimentos realizados:</span>
                    <span className="font-extrabold text-[var(--text-primary)]">146 no mês</span>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Floating Card Inferior Esquerda — Automação WhatsApp Live */}
        <div className="hidden sm:flex absolute -bottom-6 -left-4 z-20 items-center gap-3 bg-white/95 border border-[var(--border)]/90 shadow-xl px-4 py-3 rounded-2xl max-w-sm animate-pulse [animation-duration:5s]">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <span>Lembrete via WhatsApp</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
              &quot;Olá Mariana! Sua consulta está confirmada para hoje às 08:30.&quot;
            </div>
          </div>
        </div>

      </div>

      <style>{`
        [data-animate] {
          transition: opacity 0.6s ease, transform 0.6s ease;
          transition-delay: var(--delay, 0ms);
        }
        [data-animate].animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </section>
  )
}

