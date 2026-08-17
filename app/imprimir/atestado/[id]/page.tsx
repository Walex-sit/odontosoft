'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { ClinicaSettings } from '../../../actions/clinica'

interface Atestado {
  id: string
  created_at: string
  data_inicio: string
  dias_afastamento: number
  motivo: string
  cid: string | null
  cid_descricao: string | null
  pacientes: {
    nome: string
    cpf: string | null
  }
  profiles: {
    full_name: string
    cro: string | null
  }
}

export default function ImprimirAtestado() {
  const { id } = useParams()
  const [atestado, setAtestado] = useState<Atestado | null>(null)
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

      // Buscar Atestado
      const { data: atestadoData } = await supabase
        .from('atestados')
        .select(`
          *,
          pacientes (nome, cpf),
          profiles:profissional_id (full_name, cro)
        `)
        .eq('id', id)
        .single()

      if (atestadoData) {
        setAtestado(atestadoData as any)
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
    return <div className="flex items-center justify-center min-h-screen text-slate-500">Preparando documento...</div>
  }

  if (!atestado) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">Atestado não encontrado.</div>
  }

  const dataAtestado = new Date(atestado.created_at)
  const dataFormatada = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(dataAtestado)
  
  // Tratar a data de início (pode vir no formato YYYY-MM-DD)
  const [ano, mes, dia] = atestado.data_inicio.split('-')
  const dataInicioFormatada = `${dia}/${mes}/${ano}`

  return (
    <div className="bg-white min-h-screen w-full text-slate-900 print:bg-white p-8 max-w-[210mm] mx-auto print:p-0 print:m-0 flex flex-col">
      
      {/* CABEÇALHO */}
      <header className="flex flex-col items-center justify-center text-center border-b-2 border-slate-200 pb-6 mb-12 mt-4 print:mt-0">
        {clinica?.logo_url && (
          <img 
            src={clinica.logo_url} 
            alt="Logo da Clínica" 
            className="h-20 object-contain mb-4" 
            crossOrigin="anonymous" 
          />
        )}
        <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">
          {clinica?.nome || 'Clínica Odontológica'}
        </h1>
        <div className="text-sm text-slate-500 mt-1 flex flex-col items-center gap-1">
          {clinica?.endereco && <span>{clinica.endereco}</span>}
          <div className="flex gap-4">
            {clinica?.telefone && <span>Tel: {clinica.telefone}</span>}
            {clinica?.cnpj && <span>CNPJ: {clinica.cnpj}</span>}
          </div>
        </div>
      </header>

      {/* TÍTULO */}
      <div className="text-center mb-16">
        <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 inline-block pb-1">
          Atestado Odontológico
        </h2>
      </div>

      {/* CORPO DO ATESTADO */}
      <section className="mb-12 flex-1 text-lg leading-relaxed text-justify px-4">
        <p className="indent-8">
          Atesto para os devidos fins que o(a) paciente <strong className="uppercase">{atestado.pacientes?.nome}</strong>
          {atestado.pacientes?.cpf ? `, inscrito(a) no CPF sob o nº ${atestado.pacientes.cpf}` : ''}, foi submetido(a) a tratamento odontológico 
          nesta data e necessita de <strong>{atestado.dias_afastamento}</strong> {atestado.dias_afastamento === 1 ? 'dia' : 'dias'} de repouso 
          a partir de <strong>{dataInicioFormatada}</strong>, por motivo de {atestado.motivo}.
        </p>
        
        {atestado.cid && (
          <p className="mt-8 font-medium">
            CID-10: {atestado.cid} {atestado.cid_descricao ? `- ${atestado.cid_descricao}` : ''}
          </p>
        )}
      </section>

      {/* RODAPÉ */}
      <footer className="mt-auto pt-20 pb-8">
        <div className="text-center text-slate-600 mb-16">
          Local e Data: ____________________________, {dataFormatada}
        </div>
        
        <div className="flex flex-col items-center justify-center">
          <div className="w-80 border-t border-slate-800 mb-2"></div>
          <div className="font-bold text-slate-800 text-lg">{atestado.profiles?.full_name || 'Dr(a).'}</div>
          {atestado.profiles?.cro && (
            <div className="text-base text-slate-500">CRO: {atestado.profiles.cro}</div>
          )}
        </div>
      </footer>
      
      {/* Oculto na impressão */}
      <div className="fixed top-4 right-4 print:hidden">
        <button 
          onClick={() => window.print()} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-colors"
        >
          Imprimir Novamente
        </button>
      </div>

    </div>
  )
}
