"use client";

// EditPatientForm.tsx – Clean SaaS styled form for editing a patient
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'sonner';
import { XCircle, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { mascaraCpf, validarCpf } from '@/app/lib/cpfUtils';
import { gerarPdfTermoLGPD } from '@/app/lib/gerarPdfTermoLGPD';

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
  /** cpf foi removido — CPF agora é armazenado como cpf_hash + cpf_encrypted */
  cpf_hash?: string;
  cpf_encrypted?: string;
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
  lgpd_aceite?: boolean | null;
  lgpd_aceite_em?: string | null;
}

interface Props {
  patient: Patient;
}

export default function EditPatientForm({ patient }: Props) {
  const router = useRouter();
  const [gerandoPdf, setGerandoPdf] = useState(false);
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
    // cpf_raw: campo de entrada para novo CPF. Começa SEMPRE vazio — o CPF real
    // está encriptado no banco e não desce para o frontend. Deixar em branco
    // no submit omite cpf_raw do payload, mantendo o valor encriptado existente.
    cpf_raw: '',
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
    cpf_responsavel_convenio: patient.cpf_responsavel_convenio || '',
    lgpd_aceite: Boolean(patient.lgpd_aceite),
    lgpd_aceite_em: patient.lgpd_aceite_em || null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // CPF digitado no campo atual (sem máscara) — validação matemática real
  const cpfDigitado = form.cpf_raw.trim();
  const cpfDigitadoValido = cpfDigitado !== '' && validarCpf(cpfDigitado);

  // O paciente já tem CPF criptografado no banco?
  const cpfNobanco = Boolean(patient.cpf_hash || patient.cpf_encrypted);

  // Permite aceite LGPD se: (a) CPF digitado agora é válido, ou (b) já existe CPF no banco
  const cpfHabilitaLgpd = cpfDigitadoValido || cpfNobanco;

  function handleCpfRawChange(e: React.ChangeEvent<HTMLInputElement>) {
    const mascara = mascaraCpf(e.target.value);
    setForm(prev => ({ ...prev, cpf_raw: mascara }));
    // Desmarca aceite LGPD se CPF ficou inválido
    if (!validarCpf(mascara) && form.lgpd_aceite) {
      setForm(prev => ({ ...prev, cpf_raw: mascara, lgpd_aceite: false, lgpd_aceite_em: null }));
    }
  }

  const handleLgpdToggle = (checked: boolean) => {
    if (checked && !cpfHabilitaLgpd) {
      toast.warning('O CPF deve ser válido para registrar o aceite LGPD.');
      return;
    }
    setForm(prev => ({
      ...prev,
      lgpd_aceite: checked,
      lgpd_aceite_em: checked ? (prev.lgpd_aceite_em || new Date().toISOString()) : null,
    }));
  };

  function handleGerarTermoPdf() {
    const nomeOk = form.nome.trim().length >= 3;
    const cpfOk = cpfDigitadoValido;
    if (!nomeOk || !cpfOk) {
      toast.warning('Preencha o nome e um CPF válido para gerar o termo LGPD.');
      return;
    }
    setGerandoPdf(true);
    try {
      gerarPdfTermoLGPD({
        pacienteNome: form.nome.trim(),
        pacienteCpf: form.cpf_raw,
      });
      toast.success('Termo LGPD gerado! Verifique seus downloads.');
    } catch {
      toast.error('Erro ao gerar o PDF.');
    } finally {
      setGerandoPdf(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lgpdAceiteEm = form.lgpd_aceite
      ? (form.lgpd_aceite_em || new Date().toISOString())
      : null;

    // Só inclui cpf_raw no payload se o utilizador digitou algo.
    // Se vazio, omite a chave para que o trigger não apague o hash/encrypted existente.
    const cpfPayload = form.cpf_raw.trim() !== ''
      ? { cpf_raw: form.cpf_raw.trim() }
      : {};

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
        ...cpfPayload,
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
        cpf_responsavel_convenio: form.cpf_responsavel_convenio,
        lgpd_aceite: form.lgpd_aceite,
        lgpd_aceite_em: lgpdAceiteEm,
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
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={(form as any)[name] ?? ''}
        onChange={handleChange}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border-slate-200 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800"
      />
    </div>
  );

  const Select = ({ label, name, options }: { label: string; name: string; options: string[] }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</label>
      <select
        name={name}
        value={(form as any)[name] ?? ''}
        onChange={handleChange}
        className="mt-1 block w-full rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Editar paciente</h2>
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
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">Dados Pessoais</h3>
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
                className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span>Paciente estrangeiro</span>
            </label>
          </div>
          {Input({ label: 'Data de nascimento', name: 'data_nascimento', type: 'date' })}
          {/* CPF com máscara e validação matemática */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              CPF {cpfNobanco && <span className="text-xs text-emerald-600 font-normal">(já cadastrado)</span>}
            </label>
            <input
              type="text"
              inputMode="numeric"
              name="cpf_raw"
              value={form.cpf_raw}
              onChange={handleCpfRawChange}
              maxLength={14}
              placeholder={cpfNobanco ? 'Novo CPF para substituir (opcional)' : 'Digite o CPF — 000.000.000-00'}
              className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 border ${
                form.cpf_raw && form.cpf_raw.replace(/\D/g, '').length === 11
                  ? cpfDigitadoValido
                    ? 'border-emerald-500'
                    : 'border-red-500'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            />
            {form.cpf_raw && form.cpf_raw.replace(/\D/g, '').length === 11 && (
              <p className={`mt-1 text-xs font-semibold ${ cpfDigitadoValido ? 'text-emerald-600' : 'text-red-500'}`}>
                {cpfDigitadoValido ? '✓ CPF matematicamente válido' : '✗ CPF inválido — verifique os dígitos'}
              </p>
            )}
          </div>
          {Input({ label: 'RG', name: 'rg' })}
          {/* Foto upload placeholder */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Adicionar foto</label>
            <input type="file" name="foto" className="mt-1 block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" disabled />
          </div>
          {Input({ label: 'Observações', name: 'observacoes', placeholder: 'Observações gerais' })}
        </div>
      </section>

      {/* Consentimento LGPD */}
      <section className="border border-slate-200 dark:border-slate-700 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-start justify-between mb-2 gap-4 flex-wrap">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Consentimento LGPD (Uso de Dados)</h3>
          {/* Botão Gerar Termo LGPD PDF */}
          <button
            type="button"
            data-testid="btn-gerar-termo-lgpd"
            onClick={handleGerarTermoPdf}
            disabled={!(form.nome.trim().length >= 3 && cpfDigitadoValido) || gerandoPdf}
            title="Gerar Termo de Consentimento LGPD em PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              enabled:border-emerald-500 enabled:text-emerald-700 dark:enabled:text-emerald-400 enabled:hover:bg-emerald-50 dark:enabled:hover:bg-emerald-950/30
              disabled:border-slate-300 dark:disabled:border-slate-700 disabled:text-slate-400"
          >
            {gerandoPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {gerandoPdf ? 'Gerando...' : 'Gerar Termo LGPD (PDF)'}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Autorização para tratamento e armazenamento de dados pessoais e de saúde conforme a Lei Geral de Proteção de Dados (LGPD — Lei Federal nº 13.709/2018).
          {!(form.nome.trim().length >= 3 && cpfDigitadoValido) && (
            <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ Digite o nome e um CPF válido para habilitar a geração do PDF.
            </span>
          )}
        </p>
        <div className={`flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-lg border transition-colors ${
          cpfHabilitaLgpd ? 'border-emerald-400/50 dark:border-emerald-700/50' : 'border-slate-200 dark:border-slate-700'
        }`}>
          <input
            type="checkbox"
            id="lgpd_aceite"
            name="lgpd_aceite"
            disabled={!cpfHabilitaLgpd}
            checked={form.lgpd_aceite}
            onChange={(e) => handleLgpdToggle(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <label htmlFor="lgpd_aceite" className={`text-sm text-slate-700 dark:text-slate-200 ${!cpfHabilitaLgpd ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
            <span className="font-bold block">Aceite LGPD (Consentimento de Uso de Dados)</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
              O paciente concorda com o uso de seus dados cadastrais e histórico clínico para prestação de serviços odontológicos.
            </span>
            {!cpfHabilitaLgpd ? (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mt-1.5">
                ⚠️ CPF válido é obrigatório para registrar o aceite LGPD.
                {cpfNobanco && ' (O CPF atual está criptografado — para revalidar, insira o CPF no campo acima.)'}
              </span>
            ) : form.lgpd_aceite && form.lgpd_aceite_em ? (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mt-1.5">
                ✓ Aceite registrado em: {new Date(form.lgpd_aceite_em).toLocaleString('pt-BR')}
              </span>
            ) : null}
          </label>
        </div>
      </section>

      {/* Categorias */}
      <section className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">Categorias</h3>
        {Select({ label: 'Categoria', name: 'categoria', options: ['Adulto', 'Criança', 'Sênior'] })}
      </section>

      {/* Contato de Emergência */}
      <section className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">Contato de Emergência</h3>
        {Input({ label: 'Nome', name: 'contato_emergencia_nome' })}
        {Input({ label: 'Telefone', name: 'contato_emergencia_telefone' })}
      </section>

      {/* Endereço */}
      <section className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">Endereço</h3>
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
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">Responsável (se menor/dependente)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Input({ label: 'Nome do responsável', name: 'responsavel_nome' })}
          {Input({ label: 'CPF do responsável', name: 'responsavel_cpf' })}
          {Input({ label: 'Data de nascimento', name: 'responsavel_nascimento', type: 'date' })}
        </div>
      </section>

      {/* Dados do Convênio */}
      <section className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">Dados do Convênio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Input({ label: 'Convênio', name: 'convenio' })}
          {Input({ label: 'Titular do convênio', name: 'titular_convenio' })}
          {Input({ label: 'Número da carteirinha', name: 'numero_carteirinha' })}
          {Input({ label: 'CPF do Responsável', name: 'cpf_responsavel_convenio' })}
        </div>
      </section>

      {/* Footer actions */}
      <div className="flex justify-between pt-4 border-t gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 flex items-center space-x-2"
        >
          <XCircle className="h-4 w-4" />
          <span>Cancelar</span>
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
