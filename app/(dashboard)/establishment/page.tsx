'use client'

import { useState } from 'react'
import { CreditCard, CheckCircle2, Download, ExternalLink, ShieldCheck, Zap, Search } from 'lucide-react'
import { toast } from 'sonner'
import ModalAlterarCartao from '@/app/components/ModalAlterarCartao'
import ModalPagamentoFatura from '@/app/components/ModalPagamentoFatura'

// Faturas serão carregadas via Stripe Billing API / webhook.
// Por enquanto, estado vazio até integração com Stripe Customer Portal.
type Fatura = { id: string; data: string; valor: number; status: string }

export default function AssinaturaPage() {
  const [alterarCartaoOpen, setAlterarCartaoOpen] = useState(false)
  const [pagamentoOpen, setPagamentoOpen] = useState(false)
  const [faturaSelecionada, setFaturaSelecionada] = useState<{id: string, valor: number} | null>(null)
  // Faturas dinâmicas — integração futura com Stripe Billing
  const [faturas] = useState<Fatura[]>([])

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
      <aside className="w-72 border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-surface)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">Assinatura</h2>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-1">
              Plano Pro
              <span className="bg-green-100 text-green-700 border border-green-200 text-xs font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                Ativo
              </span>
            </h3>
            <p className="text-xs font-medium text-[var(--text-secondary)]">R$ 199,90 / mês</p>
          </div>

          <div className="mb-6 pt-5 border-t border-[var(--border)]">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Próximo Vencimento</p>
            <p className="text-sm font-bold text-[var(--text-primary)] mb-4">05 de Dezembro</p>
            <button 
              onClick={() => setAlterarCartaoOpen(true)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-[var(--on-primary)] bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] px-3 py-2 rounded-md transition-colors"
            >
              Alterar Pagamento
            </button>
          </div>

          <div className="pt-5 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Acesso completo a todas as ferramentas, incluindo prontuários eletrônicos ilimitados, agendamentos avançados e módulo financeiro.
            </p>
          </div>
        </div>
      </aside>

      {/* Column 3: Main Workspace */}
      <main className="flex-1 flex flex-col h-full bg-[var(--bg-surface)] relative">
        <header className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0 gap-4">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Buscar faturas..." 
            className="bg-transparent border-none focus:outline-none text-sm text-[var(--text-primary)] w-full placeholder-[var(--text-secondary)]" 
          />
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4">
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Histórico de Faturas</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Acompanhe seus pagamentos e faça o download de recibos.</p>
          </div>
          
          <div className="border border-[var(--border)] rounded-md overflow-hidden bg-[var(--bg-surface)]">
            <table className="w-full text-left text-sm border-collapse min-w-[600px]">
              <thead className="bg-[var(--bg-surface)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider">Fatura</th>
                  <th className="px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider">Valor</th>
                  <th className="px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {faturas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                      Nenhuma fatura disponível. O histórico de cobranças aparecerá aqui após a integração com o Stripe.
                    </td>
                  </tr>
                )}
                {faturas.map((fatura) => (
                  <tr key={fatura.id} className="hover:bg-[var(--bg-surface)] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-[var(--text-secondary)] font-medium">
                      {new Date(fatura.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-[var(--text-muted)] font-mono">
                      {fatura.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-[var(--text-primary)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fatura.valor)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${
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
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--border)] px-2.5 py-1.5 rounded-md border border-[var(--border)] transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          Recibo
                        </button>
                      ) : (
                        <button 
                          onClick={() => handlePagarFatura(fatura)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:text-[var(--primary)] bg-[var(--primary-subtle)] hover:bg-[var(--primary-subtle)] px-2.5 py-1.5 rounded-md border border-[var(--primary)]/40 transition-colors"
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
