"use client";
import { supabase } from '@/app/lib/supabaseClient';
import { useState } from 'react';
import { toast } from 'sonner';
import SaveDeleteButtons from '@/components/SaveDeleteButtons';
import EditPatientHeader from '@/components/EditPatientHeader';
import FormSection from '@/components/FormSection';
import { useRouter } from 'next/navigation';

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
}

export default function EditPatientForm({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...patient });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('pacientes').update({
      nome: form.nome,
      celular: form.celular,
      // Add all other fields here
      ddd: form.ddd,
      lembretes: form.lembretes,
      email: form.email,
      telefone_fixo: form.telefone_fixo,
      como_conheceu: form.como_conheceu,
      profissao: form.profissao,
      genero: form.genero,
      estrangeiro: form.estrangeiro,
      data_nascimento: form.data_nascimento,
      cpf: form.cpf,
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <EditPatientHeader patientId={patient.id} />

      {/* Dados Pessoais */}
      <FormSection title="Dados Pessoais">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="nome"
            value={form.nome || ''}
            onChange={handleChange}
            placeholder="Nome completo"
            className="bg-white border border-slate-200 rounded-[12px] p-2"
            required
          />
          <div className="flex gap-2">
            <select name="ddd" value={form.ddd || ''} onChange={handleChange} className="bg-white border border-slate-200 rounded-[12px] p-2 w-24">
              <option value="">DDI</option>
              <option value="+55">+55</option>
              <option value="+1">+1</option>
            </select>
            <input
              name="celular"
              value={form.celular || ''}
              onChange={handleChange}
              placeholder="Celular"
              className="bg-white border border-slate-200 rounded-[12px] p-2 flex-1"
            />
          </div>
          <select name="lembretes" value={form.lembretes || ''} onChange={handleChange} className="bg-white border border-slate-200 rounded-[12px] p-2">
            <option value="">Lembretes automáticos</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
          <input name="email" type="email" value={form.email || ''} onChange={handleChange} placeholder="E-mail" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="telefone_fixo" value={form.telefone_fixo || ''} onChange={handleChange} placeholder="Telefone fixo" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="como_conheceu" value={form.como_conheceu || ''} onChange={handleChange} placeholder="Como conheceu a clínica" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="profissao" value={form.profissao || ''} onChange={handleChange} placeholder="Profissão" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <select name="genero" value={form.genero || ''} onChange={handleChange} className="bg-white border border-slate-200 rounded-[12px] p-2">
            <option value="">Gênero</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
            <option value="outro">Outro</option>
          </select>
          <label className="flex items-center space-x-2">
            <input type="checkbox" name="estrangeiro" checked={form.estrangeiro} onChange={handleChange} />
            <span>Paciente estrangeiro</span>
          </label>
          <input type="date" name="data_nascimento" value={form.data_nascimento?.substring(0,10) || ''} onChange={handleChange} className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="cpf" value={form.cpf || ''} onChange={handleChange} placeholder="CPF" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="rg" value={form.rg || ''} onChange={handleChange} placeholder="RG" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="foto_url" value={form.foto_url || ''} onChange={handleChange} placeholder="URL da foto" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <textarea name="observacoes" value={form.observacoes || ''} onChange={handleChange} placeholder="Observações" className="bg-white border border-slate-200 rounded-[12px] p-2 md:col-span-2" rows={3} />
        </div>
      </FormSection>

      {/* Categorias */}
      <FormSection title="Categorias">
        <select name="categoria_id" value={form.categoria_id || ''} onChange={handleChange} className="bg-white border border-slate-200 rounded-[12px] p-2 w-full">
          <option value="">Selecione a categoria</option>
          {/* TODO: Populate categories dynamically */}
        </select>
      </FormSection>

      {/* Contato de Emergência */}
      <FormSection title="Contato de Emergência">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="contato_emerg_nome" value={form.contato_emerg_nome || ''} onChange={handleChange} placeholder="Nome" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="contato_emerg_telefone" value={form.contato_emerg_telefone || ''} onChange={handleChange} placeholder="Telefone" className="bg-white border border-slate-200 rounded-[12px] p-2" />
        </div>
      </FormSection>

      {/* Endereço */}
      <FormSection title="Endereço">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="cep" value={form.cep || ''} onChange={handleChange} placeholder="CEP" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="endereco" value={form.endereco || ''} onChange={handleChange} placeholder="Endereço" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="numero" value={form.numero || ''} onChange={handleChange} placeholder="Número" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="complemento" value={form.complemento || ''} onChange={handleChange} placeholder="Complemento" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="bairro" value={form.bairro || ''} onChange={handleChange} placeholder="Bairro" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="cidade" value={form.cidade || ''} onChange={handleChange} placeholder="Cidade" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="estado" value={form.estado || ''} onChange={handleChange} placeholder="Estado" className="bg-white border border-slate-200 rounded-[12px] p-2" />
        </div>
      </FormSection>

      {/* Responsável */}
      <FormSection title="Responsável (se menor/dependente)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="responsavel_nome" value={form.responsavel_nome || ''} onChange={handleChange} placeholder="Nome do responsável" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="responsavel_cpf" value={form.responsavel_cpf || ''} onChange={handleChange} placeholder="CPF" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input type="date" name="responsavel_nascimento" value={form.responsavel_nascimento?.substring(0,10) || ''} onChange={handleChange} className="bg-white border border-slate-200 rounded-[12px] p-2" />
        </div>
      </FormSection>

      {/* Dados do Convênio */}
      <FormSection title="Dados do Convênio">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="convenio" value={form.convenio || ''} onChange={handleChange} placeholder="Convênio" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="titular_convenio" value={form.titular_convenio || ''} onChange={handleChange} placeholder="Titular do convênio" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="numero_carteirinha" value={form.numero_carteirinha || ''} onChange={handleChange} placeholder="Número da carteirinha" className="bg-white border border-slate-200 rounded-[12px] p-2" />
          <input name="cpf_responsavel_convenio" value={form.cpf_responsavel_convenio || ''} onChange={handleChange} placeholder="CPF do Responsável" className="bg-white border border-slate-200 rounded-[12px] p-2" />
        </div>
      </FormSection>

      <SaveDeleteButtons onDelete={handleDelete} loading={loading} />
    </form>
  );
}
