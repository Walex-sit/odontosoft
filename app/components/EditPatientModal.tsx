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

  const handleLgpdToggle = (checked: boolean) => {
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
      if (value !== undefined && value !== null) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/30">
          <h2 className="text-xl font-bold text-slate-100">Editar Paciente</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-2 hover:bg-slate-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <form id="edit-patient-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Nome Completo *
              </label>
              <input
                required
                name="nome"
                value={formData.nome || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                CPF *
              </label>
              <input
                required
                name="cpf"
                value={formData.cpf || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Telefone
              </label>
              <input
                name="telefone"
                value={formData.telefone || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                E-mail
              </label>
              <input
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Data de Nascimento
              </label>
              <input
                name="data_nascimento"
                type="date"
                value={formData.data_nascimento || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Endereço
              </label>
              <input
                name="endereco"
                value={formData.endereco || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Convênio Odontológico
              </label>
              <input
                name="convenio"
                value={formData.convenio || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Seção de Consentimento LGPD */}
            <div className={`md:col-span-2 p-4 rounded-xl border transition-all ${
              formData.lgpd_aceite
                ? 'bg-emerald-950/30 border-emerald-800/80'
                : 'bg-amber-950/30 border-amber-800/80'
            }`}>
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  {formData.lgpd_aceite ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="modal_lgpd_aceite" className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-100">
                    <input
                      type="checkbox"
                      id="modal_lgpd_aceite"
                      name="lgpd_aceite"
                      checked={Boolean(formData.lgpd_aceite)}
                      onChange={(e) => handleLgpdToggle(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Aceite LGPD (Consentimento de Uso de Dados)</span>
                  </label>
                  <p className="text-xs text-slate-400 mt-1">
                    Autorização para tratamento e armazenamento de dados pessoais e de saúde para fins de prontuário clínico e atendimento odontológico (Lei Federal nº 13.709/2018).
                  </p>
                  {formData.lgpd_aceite && formData.lgpd_aceite_em && (
                    <p className="text-xs font-semibold text-emerald-400 mt-1.5">
                      ✓ Aceite registrado em: {new Date(formData.lgpd_aceite_em).toLocaleString('pt-BR')}
                    </p>
                  )}
                  {!formData.lgpd_aceite && (
                    <p className="text-xs font-semibold text-amber-400 mt-1.5">
                      ⚠️ Paciente sem consentimento registrado. Marque a caixa para regularizar.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-700/50 bg-slate-900/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-patient-form"
            disabled={salvando}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
