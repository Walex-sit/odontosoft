'use client'

import { useState } from 'react'
import { CreditCard, CheckCircle2, Download, ExternalLink, ShieldCheck, Zap, Search } from 'lucide-react'
import { toast } from 'sonner'
import ModalAlterarCartao from '@/app/components/ModalAlterarCartao'
import ModalPagamentoFatura from '@/app/components/ModalPagamentoFatura'

// Dados Mockados para a página de Assinatura
const faturas = [
  { id: 'FAT-001', data: '2023-10-05', valor: 199.90, status: 'PAGO' },
  { id: 'FAT-002', data: '2023-11-05', valor: 199.90, status: 'PAGO' },
  { id: 'FAT-003', data: '2023-12-05', valor: 199.90, status: 'PENDENTE' },
]

export default function AssinaturaPage() {
  const [alterarCartaoOpen, setAlterarCartaoOpen] = useState(false)
  const [pagamentoOpen, setPagamentoOpen] = useState(false)
  const [faturaSelecionada, setFaturaSelecionada] = useState<{id: string, valor: number} | null>(null)

  function handleDownloadRecibo(faturaId: string) {
    toast.success(`Download do recibo ${faturaId} iniciado com sucesso.`)
  }

  function handlePagarFatura(fatura: {id: string, valor: number}) {
    setFaturaSelecionada(fatura)
    setPagamentoOpen(true)
  }

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Column 2: Context/Filters */}
      <aside className="w-72 border-r border-slate-600 bg-slate-700/50 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-600 bg-slate-700">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Assinatura</h2>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-1">
              Plano Pro
              <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                Ativo
              </span>
            </h3>
            <p className="text-xs font-medium text-slate-300">R$ 199,90 / mês</p>
          </div>

          <div className="mb-6 pt-5 border-t border-slate-600">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Próximo Vencimento</p>
            <p className="text-sm font-bold text-slate-100 mb-4">05 de Dezembro</p>
            <button 
              onClick={() => setAlterarCartaoOpen(true)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-md transition-colors"
            >
              Alterar Pagamento
            </button>
          </div>

          <div className="pt-5 border-t border-slate-600">
            <p className="text-xs text-slate-400 leading-relaxed">
              Acesso completo a todas as ferramentas, incluindo prontuários eletrônicos ilimitados, agendamentos avançados e módulo financeiro.
            </p>
          </div>
        </div>
      </aside>

      {/* Column 3: Main Workspace */}
      <main className="flex-1 flex flex-col h-full bg-slate-800 relative">
        <header className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0 gap-4">
          <Search className="h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar faturas..." 
            className="bg-transparent border-none focus:outline-none text-sm text-slate-100 w-full placeholder-slate-400" 
          />
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4">
            <h1 className="text-lg font-bold text-slate-100">Histórico de Faturas</h1>
            <p className="text-xs text-slate-400 mt-0.5">Acompanhe seus pagamentos e faça o download de recibos.</p>
          </div>
          
          <div className="border border-slate-600 rounded-md overflow-hidden bg-slate-700">
            <table className="w-full text-left text-sm border-collapse min-w-[600px]">
              <thead className="bg-slate-700/50 border-b border-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">Fatura</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">Valor</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {faturas.map((fatura) => (
                  <tr key={fatura.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-300 font-medium">
                      {new Date(fatura.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400 font-mono">
                      {fatura.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-100">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fatura.valor)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        fatura.status === 'PAGO' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {fatura.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {fatura.status === 'PAGO' ? (
                        <button 
                          onClick={() => handleDownloadRecibo(fatura.id)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-300 hover:text-slate-100 bg-slate-700 hover:bg-slate-200 px-2.5 py-1.5 rounded-md border border-slate-600 transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          Recibo
                        </button>
                      ) : (
                        <button 
                          onClick={() => handlePagarFatura(fatura)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md border border-blue-200 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <ModalAlterarCartao 
        isOpen={alterarCartaoOpen} 
        onClose={() => setAlterarCartaoOpen(false)} 
      />

      <ModalPagamentoFatura 
        isOpen={pagamentoOpen} 
        onClose={() => setPagamentoOpen(false)} 
        fatura={faturaSelecionada}
      />
    </div>
  )
}
