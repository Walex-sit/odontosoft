'use client'

import { CreditCard, CheckCircle2, Download, ExternalLink, ShieldCheck, Zap } from 'lucide-react'

// Dados Mockados para a página de Assinatura
const faturas = [
  { id: 'FAT-001', data: '2023-10-05', valor: 199.90, status: 'PAGO' },
  { id: 'FAT-002', data: '2023-11-05', valor: 199.90, status: 'PAGO' },
  { id: 'FAT-003', data: '2023-12-05', valor: 199.90, status: 'PENDENTE' },
]

export default function AssinaturaPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <ShieldCheck className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Assinatura & Plano</h1>
          <p className="text-slate-500 mt-1">Gerencie a sua assinatura do OdontoSoft e acesse seu histórico de faturas.</p>
        </div>
      </div>

      {/* Resumo do Plano */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden mb-8 relative">
        {/* Efeito Glow visual (padrão Dark Slate) */}
        <div className="absolute top-0 right-0 p-32 bg-blue-500/10 blur-[100px] pointer-events-none rounded-full" />
        
        <div className="p-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Zap className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    Plano Pro
                    <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <CheckCircle2 className="h-3 w-3" />
                      Ativo
                    </span>
                  </h2>
                  <p className="text-slate-400 text-sm font-medium mt-0.5">R$ 199,90 / mês</p>
                </div>
              </div>
              <p className="text-slate-500 mt-4 max-w-lg text-sm leading-relaxed">
                Acesso completo a todas as ferramentas do OdontoSoft, incluindo prontuários eletrônicos ilimitados, agendamentos avançados e o módulo financeiro completo da clínica.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 min-w-[240px]">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Próximo Vencimento</p>
              <p className="text-2xl font-bold text-slate-100 mb-4">05 de Dezembro</p>
              <button className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-500 px-4 py-2.5 rounded-xl shadow-sm shadow-blue-500/20 transition-all active:scale-95">
                Alterar Método de Pagamento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Faturas */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-700/50 flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-slate-400" />
          <h3 className="text-base font-bold text-slate-100">Histórico de Faturas</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Data</th>
                <th className="px-6 py-4 font-semibold">Fatura</th>
                <th className="px-6 py-4 font-semibold">Valor</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {faturas.map(fatura => (
                <tr key={fatura.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 text-slate-300 font-medium">
                    {new Date(fatura.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{fatura.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-200">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fatura.valor)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider ${
                      fatura.status === 'PAGO' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {fatura.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {fatura.status === 'PAGO' ? (
                      <button className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors bg-slate-700/30 hover:bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                        <Download className="h-3.5 w-3.5" />
                        Recibo
                      </button>
                    ) : (
                      <button className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Pagar Agora
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
