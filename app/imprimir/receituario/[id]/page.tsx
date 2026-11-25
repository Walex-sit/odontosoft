'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { ClinicaSettings } from '../../../actions/clinica'

interface ReceitaItem {
  id: string
  medicamento: string
  concentracao?: string | null
  forma_farm?: string | null
  quantidade?: string | null
  posologia?: string | null
  instrucoes?: string | null
  ordem?: number | null
}

interface Receita {
  id: string
  created_at: string
  tipo_receituario?: string | null
  observacoes?: string | null
  pacientes?: {
    nome: string
    cpf_mascarado?: string | null
    data_nascimento?: string | null
  } | null
  profiles?: {
    nome: string
  } | null
}

export default function ImprimirReceituario() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id as string
  const [receita, setReceita] = useState<Receita | null>(null)
  const [itens, setItens] = useState<ReceitaItem[]>([])
  const [clinica, setClinica] = useState<ClinicaSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!id) return

      // Buscar Clínica
      const { data: clinicaData } = await supabase
        .from('clinica_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      
      setClinica(clinicaData)

      // Buscar Receita
      const { data: receitaData, error: receitaError } = await supabase
        .from('receitas')
        .select(`
          *,
          pacientes (nome, cpf_mascarado, data_nascimento),
          profiles:profissional_id (nome)
        `)
        .eq('id', id)
        .maybeSingle()

      if (receitaError) {
        console.error('[imprimir/receituario] Erro ao buscar receita:', receitaError.message, receitaError)
      }

      if (receitaData) {
        setReceita(receitaData as any)
      }

      // Buscar Itens
      const { data: itensData } = await supabase
        .from('receita_itens')
        .select('*')
        .eq('receita_id', id)
        .order('ordem', { ascending: true })

      if (itensData) {
        setItens(itensData)
      }

      setLoading(false)

      // Após carregar, dispara o print
      setTimeout(() => {
        window.print()
      }, 500)
    }

    fetchData()
  }, [id])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-[var(--text-muted)]">Preparando documento...</div>
  }

  if (!receita) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-500 gap-2">
        <p className="font-bold text-lg">Receita não encontrada.</p>
        <p className="text-sm text-[var(--text-muted)]">ID consultado: {id}</p>
        <p className="text-xs text-[var(--text-secondary)]">Se o erro persistir, aguarde alguns segundos e recarregue a página.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)]"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const dataReceita = new Date(receita.created_at)
  const dataFormatada = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(dataReceita)

  return (
    <div className="bg-white min-h-screen w-full text-[var(--text-primary)] print:bg-white p-8 max-w-[210mm] mx-auto print:p-0 print:m-0">
      
      {/* CABEÇALHO */}
      <header className="flex flex-col items-center justify-center text-center border-b-2 border-[var(--border)] pb-6 mb-8 mt-4 print:mt-0">
        {clinica?.logo_url && (
          <img 
            src={clinica.logo_url} 
            alt="Logo da Clínica" 
            className="h-20 object-contain mb-4" 
            crossOrigin="anonymous" 
          />
        )}
        <h1 className="text-2xl font-bold text-[var(--text-primary)] uppercase tracking-wide">
          {clinica?.nome_exibido || clinica?.nome || 'Clínica Odontológica'}
        </h1>
        <div className="text-sm text-[var(--text-muted)] mt-1 flex flex-col items-center gap-1">
          {clinica?.endereco && <span>{clinica.endereco}</span>}
          <div className="flex gap-4">
            {clinica?.telefone && <span>Tel: {clinica.telefone}</span>}
            {clinica?.cnpj && <span>CNPJ: {clinica.cnpj}</span>}
          </div>
        </div>
      </header>

      {/* IDENTIFICAÇÃO DO PACIENTE */}
      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-[var(--border)] pb-2 mb-4 text-[var(--text-secondary)]">IDENTIFICAÇÃO DO PACIENTE</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-[var(--text-muted)]">Nome: </span>
            <span className="font-medium text-[var(--text-primary)]">{receita.pacientes?.nome}</span>
          </div>
          {receita.pacientes?.cpf_mascarado && (
            <div>
              <span className="font-semibold text-[var(--text-muted)]">CPF: </span>
              <span className="font-medium text-[var(--text-primary)]">{receita.pacientes.cpf_mascarado}</span>
            </div>
          )}
        </div>
      </section>

      {/* PRESCRIÇÃO (CORPO) */}
      <section className="mb-12 flex-1">
        <h2 className="text-lg font-bold border-b border-[var(--border)] pb-2 mb-6 text-[var(--text-secondary)] text-center uppercase">Receituário {receita.tipo_receituario === 'especial_azul' || receita.tipo_receituario === 'especial_branco' ? 'Controle Especial' : ''}</h2>
        
        <div className="space-y-6">
          {itens.map((item, index) => (
            <div key={item.id} className="text-sm">
              <div className="flex justify-between items-baseline mb-1">
                <div className="font-bold text-base text-[var(--text-primary)]">
                  {index + 1}. {item.medicamento} {item.concentracao && `- ${item.concentracao}`}
                </div>
                <div className="font-bold text-[var(--text-primary)]">
                  ------------------------- {item.quantidade} {item.forma_farm}
                </div>
              </div>
              
              <div className="pl-6 text-[var(--text-secondary)] mt-2">
                <span className="font-semibold block mb-1">Posologia:</span>
                <p>{item.posologia}</p>
                
                {item.instrucoes && (
                  <p className="mt-2 text-[var(--text-muted)] italic">Obs: {item.instrucoes}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {receita.observacoes && (
          <div className="mt-8 p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm print:bg-transparent print:border-none print:p-0">
            <span className="font-bold text-[var(--text-secondary)] mb-1 block">Observações:</span>
            <p className="text-[var(--text-secondary)]">{receita.observacoes}</p>
          </div>
        )}
      </section>

      {/* RODAPÉ */}
      <footer className="mt-auto pt-20">
        <div className="text-center text-[var(--text-secondary)] text-sm mb-12">
          Local e Data: ____________________________, {dataFormatada}
        </div>
        
        <div className="flex flex-col items-center justify-center">
          <div className="w-64 border-t border-[var(--border)] mb-2"></div>
          <div className="font-bold text-[var(--text-primary)] text-base">{receita.profiles?.nome || 'Dr(a).'}</div>
          {clinica?.cro_responsavel && (
            <div className="text-sm text-[var(--text-muted)]">CRO: {clinica.cro_responsavel}</div>
          )}
        </div>
      </footer>
      
      {/* Oculto na impressão, apenas na tela caso o auto-print falhe */}
      <div className="fixed top-4 right-4 print:hidden">
        <button 
          onClick={() => window.print()} 
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] px-4 py-2 rounded-lg shadow-lg font-medium transition-colors"
        >
          Imprimir Novamente
        </button>
      </div>

    </div>
  )
}
