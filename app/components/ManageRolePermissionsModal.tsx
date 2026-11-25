'use client'

import { useState, useEffect } from 'react'
import { X, Save, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getRolePermissions, updateRolePermissions } from '@/app/actions/permissions'

export type Role = 'admin' | 'dentista' | 'recepcao' | 'financeiro'

interface Permission {
  id: string
  label: string
  description: string
  enabled: boolean
}

interface ManageRolePermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  role: Role | null
  roleName: string
}

export default function ManageRolePermissionsModal({
  isOpen,
  onClose,
  role,
  roleName,
}: ManageRolePermissionsModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Base state for permissions
  const [permissions, setPermissions] = useState<Permission[]>([
    { id: 'agenda', label: 'Acessar Agenda', description: 'Visualizar e gerenciar agendamentos de consultas', enabled: false },
    { id: 'pacientes', label: 'Gerenciar Pacientes', description: 'Criar, editar e visualizar prontuários de pacientes', enabled: false },
    { id: 'financeiro', label: 'Acesso Financeiro', description: 'Visualizar entradas, saídas, boletos e recebimentos', enabled: false },
    { id: 'configuracoes', label: 'Configurações do Sistema', description: 'Acesso às configurações da clínica e RBAC', enabled: false },
  ])

  useEffect(() => {
    if (isOpen && role) {
      const loadPermissions = async () => {
        setIsLoading(true)
        try {
          const result = await getRolePermissions(role)
          const data = result.data
          setPermissions([
            { id: 'agenda', label: 'Acessar Agenda', description: 'Visualizar e gerenciar agendamentos de consultas', enabled: !!data?.agenda },
            { id: 'pacientes', label: 'Gerenciar Pacientes', description: 'Criar, editar e visualizar prontuários de pacientes', enabled: !!data?.pacientes },
            { id: 'financeiro', label: 'Acesso Financeiro', description: 'Visualizar entradas, saídas, boletos e recebimentos', enabled: !!data?.financeiro },
            { id: 'configuracoes', label: 'Configurações do Sistema', description: 'Acesso às configurações da clínica e RBAC', enabled: !!data?.configuracoes },
          ])
        } catch (error) {
          toast.error('Erro ao carregar permissões do perfil.')
        } finally {
          setIsLoading(false)
        }
      }
      loadPermissions()
    } else {
      // Reset when closed
      setPermissions(p => p.map(x => ({ ...x, enabled: false })))
    }
  }, [isOpen, role])

  if (!isOpen || !role) return null

  const handleToggle = (id: string) => {
    // Prevent changing admin permissions to avoid locking out
    if (role === 'admin') {
      toast.error('As permissões de Administrador não podem ser alteradas.')
      return
    }

    setPermissions(permissions.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ))
  }

  const handleSave = async () => {
    if (!role) return
    setIsSaving(true)
    
    try {
      const permsPayload = {
        agenda: permissions.find(p => p.id === 'agenda')?.enabled ?? false,
        pacientes: permissions.find(p => p.id === 'pacientes')?.enabled ?? false,
        financeiro: permissions.find(p => p.id === 'financeiro')?.enabled ?? false,
        configuracoes: permissions.find(p => p.id === 'configuracoes')?.enabled ?? false,
      }
      
      const res = await updateRolePermissions(role, permsPayload)
      if (res.success) {
        toast.success(`Permissões para ${roleName} atualizadas com sucesso!`)
        onClose()
      } else {
        toast.error(res.error || 'Erro ao atualizar as permissões.')
      }
    } catch (error) {
      toast.error('Erro ao atualizar as permissões.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-surface)]">
      <div className="bg-[var(--bg-surface)] rounded-[24px] shadow-md w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-base)] dark:bg-[var(--bg-base)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-xl">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Editar Permissões</h2>
              <p className="text-sm font-semibold text-[var(--text-muted)]">{roleName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border)]/50 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin mb-4" />
              <p className="text-sm text-[var(--text-muted)] font-semibold">Carregando permissões...</p>
            </div>
          ) : (
            permissions.map((perm) => (
              <div key={perm.id} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
                <div>
                  <p className="font-bold text-[var(--text-primary)] text-sm">{perm.label}</p>
                  <p className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">{perm.description}</p>
                </div>
                
                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => handleToggle(perm.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:ring-offset-2 ${
                    perm.enabled ? 'bg-[var(--primary-fill)]' : 'bg-[var(--border)]'
                  } ${role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  role="switch"
                  aria-checked={perm.enabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--bg-surface)] shadow ring-0 transition duration-200 ease-in-out ${
                      perm.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-base)] dark:bg-[var(--bg-base)] shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]/50 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || role === 'admin'}
            className="flex items-center gap-2 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] disabled:bg-[var(--border-medium)] disabled:text-[var(--text-primary)] text-[var(--on-primary)] px-5 py-2.5 rounded-xl font-bold text-sm transition-all "
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-[var(--bg-surface)] border-t-transparent rounded-full animate-spin" />
                Salvando...
              </span>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
