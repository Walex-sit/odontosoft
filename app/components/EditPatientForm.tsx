"use client";

// EditPatientForm.tsx – Clean SaaS styled form for editing a patient
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'sonner';
import { Pencil, XCircle, CheckCircle } from 'lucide-react';

// Define a minimal Patient type covering requested fields
export interface Patient {
  id: string;
  nome?: string;
  celular?: string;
  ddi?: string;
  lembrete_automatico?: string;
  email?: string;
  telefone_fixo?: string;
  como_conheceu?: string;
  profissao?: string;
  genero?: string;
  estrangeiro?: boolean;
  data_nascimento?: string;
  cpf?: string;
  rg?: string;
  observacoes?: string;
  categoria?: string;
  contato_emergencia_nome?: string;
  contato_emergencia_telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_nascimento?: string;
  convenio?: string;
  titular_convenio?: string;
  numero_carteirinha?: string;
  cpf_responsavel_convenio?: string;
}

interface Props {
  patient: Patient;
}

export default function EditPatientForm({ patient }: Props) {
  const router = useRouter();
  // Create local state for each field – start with patient values
  const [form, setForm] = useState({
    nome: patient.nome || '',
    celular: patient.celular || '',
    ddi: patient.ddi || '+55',
    lembrete_automatico: patient.lembrete_automatico || '',
    email: patient.email || '',
    telefone_fixo: patient.telefone_fixo || '',
    como_conheceu: patient.como_conheceu || '',
    profissao: patient.profissao || '',
    genero: patient.genero || '',
    estrangeiro: patient.estrangeiro || false,
    data_nascimento: patient.data_nascimento || '',
    cpf: patient.cpf || '',
    rg: patient.rg || '',
    observacoes: patient.observacoes || '',
    categoria: patient.categoria || '',
    contato_emergencia_nome: patient.contato_emergencia_nome || '',
    contato_emergencia_telefone: patient.contato_emergencia_telefone || '',
    cep: patient.cep || '',
    endereco: patient.endereco || '',
    numero: patient.numero || '',
    complemento: patient.complemento || '',
    bairro: patient.bairro || '',
    cidade: patient.cidade || '',
    estado: patient.estado || '',
    responsavel_nome: patient.responsavel_nome || '',
    responsavel_cpf: patient.responsavel_cpf || '',
    responsavel_nascimento: patient.responsavel_nascimento || '',
    convenio: patient.convenio || '',
    titular_convenio: patient.titular_convenio || '',
    numero_carteirinha: patient.numero_carteirinha || '',
    cpf_responsavel_convenio: patient.cpf_responsavel_convenio || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('pacientes')
      .update({
        nome: form.nome,
        celular: form.celular,
        ddi: form.ddi,
        lembrete_automatico: form.lembrete_automatico,
        email: form.email,
        telefone_fixo: form.telefone_fixo,
        como_conheceu: form.como_conheceu,
        profissao: form.profissao,
        genero: form.genero,
        estrangeiro: form.estrangeiro,
        data_nascimento: form.data_nascimento,
        cpf: form.cpf,
        rg: form.rg,
        observacoes: form.observacoes,
        categoria: form.categoria,
        contato_emergencia_nome: form.contato_emergencia_nome,
        contato_emergencia_telefone: form.contato_emergencia_telefone,
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
        cpf_responsavel_convenio: form.cpf_responsavel_convenio
      })
      .eq('id', patient.id);
    if (error) {
      toast.error('Erro ao atualizar paciente: ' + error.message);
    } else {
      toast.success('Paciente atualizado com sucesso');
      router.push(`/pacientes/${patient.id}`);
    }
  };

  // Reusable input component
  const Input = ({ label, name, type = 'text', placeholder }: { label: string; name: string; type?: string; placeholder?: string }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={(form as any)[name] ?? ''}
        onChange={handleChange}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"
      />
    </div>
  );

  const Select = ({ label, name, options }: { label: string; name: string; options: string[] }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        name={name}
        value={(form as any)[name] ?? ''}
        onChange={handleChange}
        className="mt-1 block w-full rounded-md border-slate-200 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
      >
        <option value="">Selecione...</option>
        {options.map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800">Editar paciente</h2>
        <a
          href={`/pacientes/${patient.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          Ver perfil
        </a>
      </div>

      {/* Dados Pessoais */}
      <section className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Dados Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Input({ label: 'Nome completo', name: 'nome' })}
          <div className="flex space-x-2">
            {Input({ label: 'DDI', name: 'ddi', placeholder: '+55' })}
            {Input({ label: 'Celular', name: 'celular', placeholder: '11999999999' })}
          </div>
          {Select({ label: 'Lembretes automáticos', name: 'lembrete_automatico', options: ['Nenhum', 'SMS', 'Email'] })}
          {Input({ label: 'E-mail', name: 'email', type: 'email' })}
          {Input({ label: 'Telefone fixo', name: 'telefone_fixo' })}
          {Input({ label: 'Como conheceu a clínica', name: 'como_conheceu' })}
          {Input({ label: 'Profissão', name: 'profissao' })}
          {Select({ label: 'Gênero', name: 'genero', options: ['Masculino', 'Feminino', 'Outro'] })}
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                name="estrangeiro"
                checked={form.estrangeiro}
                onChange={handleChange}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Paciente estrangeiro</span>
            </label>
          </div>
          {Input({ label: 'Data de nasci mento', name: 'data_nascimento', type: 'date' })}
          {Input({ label: 'CPF', name: 'cpf' })}
          {Input({ label: 'RG', name: 'rg' })}
          {/* Foto upload placeholder */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Adicionar foto</label>
            <input type="file" name="foto" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" disabled />
          </div>
          {Input({ label: 'Observações', name: 'observacoes', placeholder: 'Observações gerais' })}
        </div>
      </section>

      {/* Categorias */}
      <section className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Categorias</h3>
        {Select({ label: 'Categoria', name: 'categoria', options: ['Adulto', 'Criança', 'Sênior'] })}
      </section>

      {/* Contato de Emergência */}
      <section className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Contato de Emergência</h3>
        {Input({ label: 'Nome', name: 'contato_emergencia_nome' })}
        {Input({ label: 'Telefone', name: 'contato_emergencia_telefone' })}
      </section>

      {/* Endereço */}
      <section className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Input({ label: 'CEP', name: 'cep' })}
          {Input({ label: 'Endereço', name: 'endereco' })}
          {Input({ label: 'Número', name: 'numero' })}
          {Input({ label: 'Complemento', name: 'complemento' })}
          {Input({ label: 'Bairro', name: 'bairro' })}
          {Input({ label: 'Cidade', name: 'cidade' })}
          {Input({ label: 'Estado', name: 'estado' })}
        </div>
      </section>

      {/* Responsável */}
      <section className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Responsável (se menor/dependente)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Input({ label: 'Nome do responsável', name: 'responsavel_nome' })}
          {Input({ label: 'CPF do responsável', name: 'responsavel_cpf' })}
          {Input({ label: 'Data de nascimento', name: 'responsavel_nascimento', type: 'date' })}
        </div>
      </section>

      {/* Dados do Convênio */}
      <section className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Dados do Convênio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Input({ label: 'Convênio', name: 'convenio' })}
          {Input({ label: 'Titular do convênio', name: 'titular_convenio' })}
          {Input({ label: 'Número da carteirinha', name: 'numero_carteirinha' })}
          {Input({ label: 'CPF do Responsável', name: 'cpf_responsavel_convenio' })}
        </div>
      </section>

      {/* Footer actions */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 flex items-center space-x-2"
        >
          <XCircle className="h-4 w-4" />
          <span>Excluir</span>
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center space-x-2"
        >
          <CheckCircle className="h-4 w-4" />
          <span>Atualizar paciente</span>
        </button>
      </div>
    </form>
  );
}
