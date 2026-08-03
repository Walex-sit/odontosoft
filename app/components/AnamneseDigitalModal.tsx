'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardList, CheckCircle2, Circle, ChevronDown, ChevronUp, PenLine, X, Save } from 'lucide-react'

interface Anamnese {
  // Histórico Médico
  hipertensao: boolean
  diabetes: boolean
  cardiopatia: boolean
  doencaRespsiratoria: boolean
  doencaRenal: boolean
  gestante: boolean
  medicacaoContinua: string
  alergiaMedicamento: string
  alergiaLatex: boolean
  // Saúde Bucal
  doresDenteFrequentes: boolean
  sangramentoGengival: boolean
  rangerDentes: boolean
  sensibilidadeDentaria: boolean
  // Hábitos
  fuma: boolean
  bebeAlcool: boolean
  // Observações
  observacoes: string
  // Assinatura
  pacienteNome: string
  dataAssinatura: string
  assinado: boolean
}

const ANAMNESE_VAZIA: Anamnese = {
  hipertensao: false, diabetes: false, cardiopatia: false, doencaRespsiratoria: false, doencaRenal: false,
  gestante: false, medicacaoContinua: '', alergiaMedicamento: '', alergiaLatex: false,
  doresDenteFrequentes: false, sangramentoGengival: false, rangerDentes: false, sensibilidadeDentaria: false,
  fuma: false, bebeAlcool: false, observacoes: '', pacienteNome: '', dataAssinatura: '', assinado: false,
}

interface Props {
  pacienteNome?: string
  isOpen: boolean
  onClose: () => void
  onSave?: (data: Anamnese) => void
}

export default function AnamneseDigitalModal({ pacienteNome = '', isOpen, onClose, onSave }: Props) {
  const [form, setForm] = useState<Anamnese>({ ...ANAMNESE_VAZIA, pacienteNome })
  const [step, setStep] = useState<'formulario' | 'assinatura'>('formulario')

  if (!isOpen) return null

  const set = (field: keyof Anamnese, value: any) => setForm(p => ({ ...p, [field]: value }))

  const handleSave = () => {
    if (!form.pacienteNome) { toast.error('Informe o nome do paciente.'); return }
    const saved = { ...form, dataAssinatura: new Date().toLocaleDateString('pt-BR'), assinado: true }
    setForm(saved)
    onSave?.(saved)
    toast.success('Anamnese salva e assinatura registrada!')
    onClose()
  }

  const Checkbox = ({ label, field }: { label: string; field: keyof Anamnese }) => (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button type="button" onClick={() => set(field, !form[field])} className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${form[field] ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
        {form[field] && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
      </button>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  )

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><ClipboardList className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Anamnese Digital</h2>
              <p className="text-xs font-semibold text-slate-500">Ficha de saúde do paciente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Nome do Paciente */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nome Completo do Paciente</label>
            <input value={form.pacienteNome} onChange={e => set('pacienteNome', e.target.value)} placeholder="Digite o nome do paciente..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>

          {/* Histórico Médico */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Histórico Médico</h3>
            <p className="text-xs text-slate-500 font-semibold mb-4">Você possui ou já foi diagnosticado com alguma das condições abaixo?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Checkbox label="Hipertensão" field="hipertensao" />
              <Checkbox label="Diabetes" field="diabetes" />
              <Checkbox label="Cardiopatia / Problema no coração" field="cardiopatia" />
              <Checkbox label="Doença Respiratória (asma, bronquite)" field="doencaRespsiratoria" />
              <Checkbox label="Doença Renal" field="doencaRenal" />
              <Checkbox label="Gestante ou suspeita de gravidez" field="gestante" />
              <Checkbox label="Alergia ao Látex" field="alergiaLatex" />
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Medicação Contínua</label>
                <input value={form.medicacaoContinua} onChange={e => set('medicacaoContinua', e.target.value)} placeholder="Nenhuma" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Alergia a Medicamentos</label>
                <input value={form.alergiaMedicamento} onChange={e => set('alergiaMedicamento', e.target.value)} placeholder="Nenhuma" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* Saúde Bucal */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Saúde Bucal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Checkbox label="Dores de dente frequentes" field="doresDenteFrequentes" />
              <Checkbox label="Sangramento gengival" field="sangramentoGengival" />
              <Checkbox label="Range ou aperta os dentes" field="rangerDentes" />
              <Checkbox label="Sensibilidade dentária" field="sensibilidadeDentaria" />
            </div>
          </div>

          {/* Hábitos */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Hábitos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Checkbox label="Fumante" field="fuma" />
              <Checkbox label="Consumo de álcool" field="bebeAlcool" />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Observações e Informações Adicionais</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} placeholder="Alguma outra informação relevante..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
          </div>

          {/* Termo de Assinatura */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-blue-800 mb-2">📋 Declaração e Assinatura Digital (LGPD)</h3>
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              Declaro que as informações acima são verdadeiras e autorizo a clínica a utilizá-las para fins exclusivos de diagnóstico e tratamento odontológico, 
              conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Checkbox label="Concordo com os termos e assino digitalmente" field="assinado" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={!form.assinado} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
            <Save className="h-4 w-4" /> Salvar Anamnese
          </button>
        </div>
      </div>
    </div>
  )
}
