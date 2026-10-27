'use client'

import { useState, useRef, useEffect } from 'react'

const features = [
  {
    id: 'agenda',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    title: 'Agenda Inteligente',
    description:
      'Reduza faltas com confirmações automáticas via WhatsApp e gerencie a cadeira de todos os dentistas.',
    highlights: [
      'Confirmação automática por WhatsApp',
      'Gestão multi-dentista e multi-cadeira',
      'Lembretes e reagendamento em 1 clique',
      'Sincronização em tempo real',
    ],
    accentColor: 'from-blue-500 to-cyan-500',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-600',
    previewContent: <AgendaPreview />,
  },
  {
    id: 'prontuario',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    title: 'Prontuário & Odontograma',
    description:
      'Evolução clínica detalhada e odontograma digital interativo para diagnósticos precisos.',
    highlights: [
      'Odontograma digital interativo',
      'Evolução clínica por sessão',
      'Prescrições e atestados digitais',
      'Histórico completo do paciente',
    ],
    accentColor: 'from-violet-500 to-purple-600',
    lightBg: 'bg-violet-50',
    textColor: 'text-violet-600',
    previewContent: <ProntuarioPreview />,
  },
  {
    id: 'financeiro',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    title: 'Gestão Financeira',
    description:
      'Controle de caixa, emissão de boletos e split de pagamento automático para dentistas associados.',
    highlights: [
      'Controle de caixa em tempo real',
      'Emissão de boletos integrada',
      'Split automático entre dentistas',
      'Relatórios financeiros completos',
    ],
    accentColor: 'from-emerald-500 to-teal-500',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    previewContent: <FinanceiroPreview />,
  },
]

function AgendaPreview() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">Outubro 2025</span>
        <div className="flex gap-1">
          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center cursor-pointer">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </div>
          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center cursor-pointer">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
      </div>
      {[
        { time: '08:00', name: 'Juliana Costa', type: 'Limpeza', status: 'confirmed', avatar: '#2563eb' },
        { time: '09:30', name: 'Roberto Alves', type: 'Extração', status: 'pending', avatar: '#7c3aed' },
        { time: '11:00', name: 'Fernanda Lima', type: 'Implante', status: 'confirmed', avatar: '#0e7490' },
        { time: '14:00', name: 'Pedro Martins', type: 'Canal', status: 'confirmed', avatar: '#059669' },
        { time: '15:30', name: 'Camila Santos', type: 'Clareamento', status: 'pending', avatar: '#dc2626' },
      ].map((apt) => (
        <div key={apt.time} className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-100 shadow-xs">
          <div className="text-xs font-mono font-semibold text-slate-400 w-10 shrink-0">{apt.time}</div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: apt.avatar }}>
            {apt.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-700 truncate">{apt.name}</div>
            <div className="text-[10px] text-slate-400">{apt.type}</div>
          </div>
          <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <span className={`w-1 h-1 rounded-full ${apt.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {apt.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
          </div>
        </div>
      ))}
    </div>
  )
}

function ProntuarioPreview() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Patient info */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold">M</div>
        <div>
          <div className="text-sm font-semibold text-slate-700">Maria Silva, 34 anos</div>
          <div className="text-xs text-slate-400">Última visita: 12/09/2025</div>
        </div>
      </div>
      {/* Odontograma digital */}
      <div className="rounded-xl border border-slate-100 bg-white p-3">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Odontograma Digital</div>
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 32 }).map((_, i) => {
            const isAffected = [3, 7, 12, 18, 24, 29].includes(i)
            const isTreated = [1, 5, 20].includes(i)
            return (
              <div
                key={i}
                className={`aspect-square rounded-md flex items-center justify-center text-[8px] font-bold border ${
                  isAffected
                    ? 'bg-red-100 border-red-200 text-red-600'
                    : isTreated
                    ? 'bg-emerald-100 border-emerald-200 text-emerald-600'
                    : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}
              >
                {i + 1}
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 mt-2">
          {[{ color: 'bg-red-400', label: 'Afetado' }, { color: 'bg-emerald-400', label: 'Tratado' }, { color: 'bg-slate-200', label: 'Saudável' }].map(l => (
            <div key={l.label} className="flex items-center gap-1 text-[9px] text-slate-500">
              <div className={`w-2 h-2 rounded-sm ${l.color}`} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
      {/* Última evolução */}
      <div className="rounded-xl border border-slate-100 bg-white p-3">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Última Evolução Clínica</div>
        <div className="text-xs text-slate-600 leading-relaxed">Paciente compareceu para procedimento de limpeza e raspagem supra-gengival. Sem intercorrências. Prescrito enxaguante...</div>
        <div className="text-[10px] text-slate-400 mt-1.5">Dr. Paulo Henrique — 12/09/2025 às 14:30</div>
      </div>
    </div>
  )
}

function FinanceiroPreview() {
  const months = ['Jul', 'Ago', 'Set', 'Out']
  const values = [38, 45, 42, 48]
  const max = 55

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 mb-1">
        {[
          { label: 'Receita do mês', value: 'R$ 48.200', trend: '+12%', up: true },
          { label: 'A receber', value: 'R$ 12.800', trend: '5 boletos', up: true },
          { label: 'Despesas', value: 'R$ 15.400', trend: '-3%', up: false },
          { label: 'Lucro líquido', value: 'R$ 32.800', trend: '+18%', up: true },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-100 bg-white p-2.5">
            <div className="text-[10px] text-slate-400 mb-0.5">{kpi.label}</div>
            <div className="text-sm font-bold text-slate-800">{kpi.value}</div>
            <div className={`text-[10px] font-semibold ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>{kpi.trend}</div>
          </div>
        ))}
      </div>
      {/* Bar chart */}
      <div className="rounded-xl border border-slate-100 bg-white p-3">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Receita Mensal (R$ mil)</div>
        <div className="flex items-end gap-2 h-20">
          {months.map((month, i) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-teal-400 transition-all"
                   style={{ height: `${(values[i] / max) * 100}%` }} />
              <div className="text-[9px] text-slate-400 font-medium">{month}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Split chart */}
      <div className="rounded-xl border border-slate-100 bg-white p-3">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Split de Pagamento</div>
        {[
          { name: 'Dr. Paulo Henrique', pct: 40, amount: 'R$ 19.280' },
          { name: 'Dra. Camila Rocha', pct: 35, amount: 'R$ 16.870' },
          { name: 'Clínica', pct: 25, amount: 'R$ 12.050' },
        ].map((item) => (
          <div key={item.name} className="mb-1.5 last:mb-0">
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-slate-600 font-medium">{item.name}</span>
              <span className="text-slate-400">{item.amount}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${item.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FeaturesSection() {
  const [active, setActive] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      { threshold: 0.05, rootMargin: '80px 0px' }
    )
    const el = sectionRef.current
    if (el) {
      el.querySelectorAll('[data-animate-feat]').forEach((child) => observer.observe(child))
    }
    return () => observer.disconnect()
  }, [])

  const current = features[active]

  return (
    <section
      ref={sectionRef}
      id="funcionalidades"
      className="py-24 px-6 bg-white"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div
          data-animate-feat
          className="opacity-0 translate-y-6 text-center mb-16"
          style={{ '--delay': '0ms' } as React.CSSProperties}
        >
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Funcionalidades
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-slate-900 mb-4">
            Tudo que sua clínica precisa
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Ferramentas pensadas por especialistas em gestão odontológica, para que você se concentre no que importa: o cuidado com seus pacientes.
          </p>
        </div>

        {/* Interactive feature tabs + preview */}
        <div
          data-animate-feat
          className="opacity-0 translate-y-8 grid md:grid-cols-5 gap-6"
          style={{ '--delay': '120ms' } as React.CSSProperties}
        >
          {/* Left tabs */}
          <div className="md:col-span-2 flex flex-col gap-3">
            {features.map((feat, i) => (
              <button
                key={feat.id}
                id={`feat-tab-${feat.id}`}
                onClick={() => setActive(i)}
                className={`group w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
                  active === i
                    ? 'bg-white border-slate-200 shadow-lg shadow-slate-100'
                    : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-100 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                      active === i
                        ? `bg-gradient-to-br ${feat.accentColor} shadow-sm`
                        : 'bg-slate-100 group-hover:bg-slate-200'
                    }`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={active === i ? 'white' : '#64748b'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={feat.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold text-sm transition-colors ${
                        active === i ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {feat.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {feat.description}
                    </div>
                    {active === i && (
                      <ul className="mt-3 space-y-1.5">
                        {feat.highlights.map((h) => (
                          <li key={h} className="flex items-center gap-2 text-xs text-slate-600">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Right preview */}
          <div className="md:col-span-3">
            <div
              key={active}
              className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden h-full min-h-[500px] flex flex-col feature-preview"
            >
              {/* Preview topbar */}
              <div className={`px-4 py-3 border-b border-slate-100 bg-gradient-to-r ${current.accentColor} flex items-center gap-2`}>
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                </div>
                <span className="text-xs font-semibold text-white/90 ml-1">{current.title}</span>
              </div>
              {/* Preview body */}
              <div className="flex-1 overflow-auto bg-slate-50">
                {current.previewContent}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        [data-animate-feat] {
          transition: opacity 0.7s ease, transform 0.7s ease;
          transition-delay: var(--delay, 0ms);
        }
        [data-animate-feat].animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .feature-preview {
          animation: fadeSlideIn 0.35s ease;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
