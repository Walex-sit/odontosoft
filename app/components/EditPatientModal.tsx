'use client';

/**
 * app/components/EditPatientModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal de edição de dados cadastrais de pacientes com suporte a consentimento LGPD.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { updatePatient, type Paciente } from '@/app/actions/pacientes';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient: Paciente | null;
}

export default function EditPatientModal({ isOpen, onClose, onSuccess, patient }: EditPatientModalProps) {
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState<Partial<Paciente>>({});

  useEffect(() => {
    if (patient) {
      setFormData({
        ...patient,
        lgpd_aceite: Boolean(patient.lgpd_aceite),
        lgpd_aceite_em: patient.lgpd_aceite_em || null,
      });
    } else {
      setFormData({});
    }
  }, [patient]);

  if (!isOpen || !patient) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const hasCpf = Boolean(
    (formData.cpf_raw && formData.cpf_raw.trim() !== '') ||
    patient.cpf_mascarado
  );

  const handleLgpdToggle = (checked: boolean) => {
    if (checked && !hasCpf) {
      toast.warning('O preenchimento do CPF é obrigatório para registrar o aceite LGPD.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      lgpd_aceite: checked,
      lgpd_aceite_em: checked ? (prev.lgpd_aceite_em || new Date().toISOString()) : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'cpf_raw') {
        if (typeof value === 'string' && value.trim() !== '') {
          data.append('cpf_raw', value.trim());
        }
      } else if (value !== undefined && value !== null) {
        data.append(key, String(value));
      }
    });

    try {
      const res = await updatePatient(patient.id, data);
      if (res.success) {
        toast.success('Paciente atualizado com sucesso!');
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Erro ao atualizar paciente');
      }
    } catch {
      toast.error('Ocorreu um erro inesperado.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div 
        className="bg-[var(--bg-surface)] border border-[var(--border)] w-full max-w-2xl rounded-2xl shadow-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-base)] dark:bg-[var(--bg-base)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Editar Paciente</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Atualize os dados e a conformidade legal do paciente</p>
          </div>
          <button 
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]  transition-colors p-2 hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <form id="edit-patient-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Nome Completo *
              </label>
              <input
                required
                name="nome"
                value={formData.nome || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border-medium)]  rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                CPF
              </label>
              <input
                name="cpf_raw"
                placeholder="Deixe em branco para manter o atual"
                value={formData.cpf_raw || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border-medium)]  rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all text-sm placeholder-[var(--text-secondary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Telefone
              </label>
              <input
                name="telefone"
                value={formData.telefone || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border-medium)]  rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                E-mail
              </label>
              <input
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border-medium)]  rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Data de Nascimento
              </label>
              <input
                name="data_nascimento"
                type="date"
                value={formData.data_nascimento || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border-medium)]  rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all text-sm [color-scheme:light]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Endereço
              </label>
              <input
                name="endereco"
                value={formData.endereco || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border-medium)]  rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Convênio Odontológico
              </label>
              <input
                name="convenio"
                value={formData.convenio || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border-medium)]  rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all text-sm"
              />
            </div>

            {/* Seção de Consentimento LGPD */}
            <div className={`md:col-span-2 p-4 rounded-xl border transition-all ${
              formData.lgpd_aceite
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80'
                : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80'
            }`}>
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  {formData.lgpd_aceite ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="modal_lgpd_aceite" className={`flex items-center gap-2 font-bold text-sm text-[var(--text-primary)] ${!hasCpf ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      id="modal_lgpd_aceite"
                      name="lgpd_aceite"
                      disabled={!hasCpf}
                      checked={Boolean(formData.lgpd_aceite)}
                      onChange={(e) => handleLgpdToggle(e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--border-medium)]  text-[var(--primary)] focus:ring-[var(--primary)]/30 disabled:opacity-50"
                    />
                    <span>Aceite LGPD (Consentimento de Uso de Dados)</span>
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1">
                    Autorização para tratamento e armazenamento de dados pessoais e de saúde para fins de prontuário clínico e atendimento odontológico (Lei Federal nº 13.709/2018).
                  </p>
                  {!hasCpf ? (
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-1.5">
                      ⚠️ Identificação formal (CPF) é obrigatória para registrar o aceite LGPD. Preencha o CPF acima para habilitar.
                    </p>
                  ) : formData.lgpd_aceite && formData.lgpd_aceite_em ? (
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1.5">
                      ✓ Aceite registrado em: {new Date(formData.lgpd_aceite_em).toLocaleString('pt-BR')}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-1.5">
                      ⚠️ Paciente sem consentimento registrado. Marque a caixa para regularizar.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-base)] dark:bg-[var(--bg-base)] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-[var(--text-secondary)] bg-[var(--bg-base)] hover:bg-[var(--border)] border border-[var(--border)]  transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-patient-form"
            disabled={salvando}
            className="bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {salvando ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" />
            ) : null}
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
