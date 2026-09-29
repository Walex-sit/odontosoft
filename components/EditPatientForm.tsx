"use client";
import { supabase } from '@/app/lib/supabaseClient';
import { useState } from 'react';
import { toast } from 'sonner';
import SaveDeleteButtons from '@/components/SaveDeleteButtons';
import EditPatientHeader from '@/components/EditPatientHeader';
import FormSection from '@/components/FormSection';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertCircle } from 'lucide-react';

// Types for patient fields (match Supabase schema)
export interface Patient {
  id: string;
  nome: string;
  celular: string | null;
  ddd: string | null; // DDI selector value
  lembretes: string | null;
  email: string | null;
  telefone_fixo: string | null;
  como_conheceu: string | null;
  profissao: string | null;
  genero: string | null;
  estrangeiro: boolean;
  data_nascimento: string | null; // ISO date
  cpf: string | null;
  rg: string | null;
  foto_url: string | null;
  observacoes: string | null;
  categoria_id: string | null;
  contato_emerg_nome: string | null;
  contato_emerg_telefone: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  responsavel_nome: string | null;
  responsavel_cpf: string | null;
  responsavel_nascimento: string | null;
  convenio: string | null;
  titular_convenio: string | null;
  numero_carteirinha: string | null;
  cpf_responsavel_convenio: string | null;
  lgpd_aceite?: boolean | null;
  lgpd_aceite_em?: string | null;
}

export default function EditPatientForm({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...patient,
    lgpd_aceite: Boolean(patient.lgpd_aceite),
    lgpd_aceite_em: patient.lgpd_aceite_em || null,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleLgpdToggle = (checked: boolean) => {
    setForm(prev => ({
      ...prev,
      lgpd_aceite: checked,
      lgpd_aceite_em: checked ? (prev.lgpd_aceite_em || new Date().toISOString()) : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const lgpdAceiteEm = form.lgpd_aceite
      ? (form.lgpd_aceite_em || new Date().toISOString())
      : null;

    const { error } = await supabase.from('pacientes').update({
      nome: form.nome,
      celular: form.celular,
      ddd: form.ddd,
      lembretes: form.lembretes,
      email: form.email,
      telefone_fixo: form.telefone_fixo,
      como_conheceu: form.como_conheceu,
      profissao: form.profissao,
      genero: form.genero,
      estrangeiro: form.estrangeiro,
      data_nascimento: form.data_nascimento,
      cpf_raw: form.cpf,
      rg: form.rg,
      foto_url: form.foto_url,
      observacoes: form.observacoes,
      categoria_id: form.categoria_id,
      contato_emerg_nome: form.contato_emerg_nome,
      contato_emerg_telefone: form.contato_emerg_telefone,
      cep: form.cep,
      endereco: form.endereco,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,
      responsavel_nome: form.responsavel_nome,
      responsavel_cpf: form.responsavel_cpf,
      responsavel_nascimento: form.responsavel_nascimento,
      convenio: form.convenio,
      titular_convenio: form.titular_convenio,
      numero_carteirinha: form.numero_carteirinha,
      cpf_responsavel_convenio: form.cpf_responsavel_convenio,
      lgpd_aceite: form.lgpd_aceite,
      lgpd_aceite_em: lgpdAceiteEm,
    }).eq('id', patient.id);

    setLoading(false);
    if (error) {
      toast.error('Erro ao atualizar paciente: ' + error.message);
    } else {
      toast.success('Paciente atualizado com sucesso');
      router.push(`/pacientes/${patient.id}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Excluir este paciente? Esta ação não pode ser desfeita.')) return;
    setLoading(true);
    const { error } = await supabase.from('pacientes').delete().eq('id', patient.id);
    setLoading(false);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
    } else {
      toast.success('Paciente excluído');
      router.push('/pacientes');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto w-full">
      <EditPatientHeader patientId={patient.id} />

      {/* Dados Pessoais */}
      <FormSection title="Dados Pessoais">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="nome"
            value={form.nome || ''}
            onChange={handleChange}
            placeholder="Nome completo"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm"
            required
          />
          <div className="flex gap-2">
            <select name="ddd" value={form.ddd || ''} onChange={handleChange} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm w-24">
              <option value="">DDI</option>
              <option value="+55">+55</option>
              <option value="+1">+1</option>
            </select>
            <input
              name="celular"
              value={form.celular || ''}
              onChange={handleChange}
              placeholder="Celular"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm flex-1"
            />
          </div>
          <select name="lembretes" value={form.lembretes || ''} onChange={handleChange} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm">
            <option value="">Lembretes automáticos</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
          <input name="email" type="email" value={form.email || ''} onChange={handleChange} placeholder="E-mail" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="telefone_fixo" value={form.telefone_fixo || ''} onChange={handleChange} placeholder="Telefone fixo" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="como_conheceu" value={form.como_conheceu || ''} onChange={handleChange} placeholder="Como conheceu a clínica" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="profissao" value={form.profissao || ''} onChange={handleChange} placeholder="Profissão" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <select name="genero" value={form.genero || ''} onChange={handleChange} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm">
            <option value="">Gênero</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
            <option value="outro">Outro</option>
          </select>
          <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" name="estrangeiro" checked={form.estrangeiro} onChange={handleChange} className="rounded" />
            <span>Paciente estrangeiro</span>
          </label>
          <input type="date" name="data_nascimento" value={form.data_nascimento?.substring(0,10) || ''} onChange={handleChange} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="cpf" value={form.cpf || ''} onChange={handleChange} placeholder="CPF" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="rg" value={form.rg || ''} onChange={handleChange} placeholder="RG" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="foto_url" value={form.foto_url || ''} onChange={handleChange} placeholder="URL da foto" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <textarea name="observacoes" value={form.observacoes || ''} onChange={handleChange} placeholder="Observações" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm md:col-span-2" rows={3} />
        </div>
      </FormSection>

      {/* Conformidade e Consentimento LGPD */}
      <FormSection title="Consentimento LGPD (Uso de Dados)">
        <div className={`p-4 rounded-2xl border transition-all ${
          form.lgpd_aceite
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              {form.lgpd_aceite ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="flex-1">
              <label className="flex items-center gap-2.5 cursor-pointer font-bold text-sm text-slate-800 dark:text-slate-100">
                <input
                  type="checkbox"
                  name="lgpd_aceite"
                  checked={form.lgpd_aceite}
                  onChange={(e) => handleLgpdToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Aceite LGPD (Consentimento de Uso de Dados)</span>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                O paciente autoriza o tratamento de seus dados pessoais e sensíveis para fins de atendimento odontológico e prontuário clínico, conforme a Lei Geral de Proteção de Dados (LGPD — Lei Federal nº 13.709/2018).
              </p>
              {form.lgpd_aceite && form.lgpd_aceite_em && (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-2">
                  ✓ Consentimento registrado em: {new Date(form.lgpd_aceite_em).toLocaleString('pt-BR')}
                </p>
              )}
              {!form.lgpd_aceite && (
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-2">
                  ⚠️ Paciente sem consentimento registrado. Marque a caixa acima para regularizar a conformidade LGPD.
                </p>
              )}
            </div>
          </div>
        </div>
      </FormSection>

      {/* Categorias */}
      <FormSection title="Categorias">
        <select name="categoria_id" value={form.categoria_id || ''} onChange={handleChange} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm w-full">
          <option value="">Selecione a categoria</option>
        </select>
      </FormSection>

      {/* Contato de Emergência */}
      <FormSection title="Contato de Emergência">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="contato_emerg_nome" value={form.contato_emerg_nome || ''} onChange={handleChange} placeholder="Nome" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="contato_emerg_telefone" value={form.contato_emerg_telefone || ''} onChange={handleChange} placeholder="Telefone" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
        </div>
      </FormSection>

      {/* Endereço */}
      <FormSection title="Endereço">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="cep" value={form.cep || ''} onChange={handleChange} placeholder="CEP" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="endereco" value={form.endereco || ''} onChange={handleChange} placeholder="Endereço" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="numero" value={form.numero || ''} onChange={handleChange} placeholder="Número" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="complemento" value={form.complemento || ''} onChange={handleChange} placeholder="Complemento" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="bairro" value={form.bairro || ''} onChange={handleChange} placeholder="Bairro" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="cidade" value={form.cidade || ''} onChange={handleChange} placeholder="Cidade" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="estado" value={form.estado || ''} onChange={handleChange} placeholder="Estado" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
        </div>
      </FormSection>

      {/* Responsável */}
      <FormSection title="Responsável (se menor/dependente)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="responsavel_nome" value={form.responsavel_nome || ''} onChange={handleChange} placeholder="Nome do responsável" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="responsavel_cpf" value={form.responsavel_cpf || ''} onChange={handleChange} placeholder="CPF" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input type="date" name="responsavel_nascimento" value={form.responsavel_nascimento?.substring(0,10) || ''} onChange={handleChange} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
        </div>
      </FormSection>

      {/* Dados do Convênio */}
      <FormSection title="Dados do Convênio">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="convenio" value={form.convenio || ''} onChange={handleChange} placeholder="Convênio" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="titular_convenio" value={form.titular_convenio || ''} onChange={handleChange} placeholder="Titular do convênio" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="numero_carteirinha" value={form.numero_carteirinha || ''} onChange={handleChange} placeholder="Número da carteirinha" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
          <input name="cpf_responsavel_convenio" value={form.cpf_responsavel_convenio || ''} onChange={handleChange} placeholder="CPF do Responsável" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-[12px] p-2.5 text-sm" />
        </div>
      </FormSection>

      <SaveDeleteButtons onDelete={handleDelete} loading={loading} />
    </form>
  );
}
