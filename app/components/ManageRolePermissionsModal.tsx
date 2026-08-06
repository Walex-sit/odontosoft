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
          const fetchedPerms = await getRolePermissions(role)
          setPermissions([
            { id: 'agenda', label: 'Acessar Agenda', description: 'Visualizar e gerenciar agendamentos de consultas', enabled: !!fetchedPerms?.agenda },
            { id: 'pacientes', label: 'Gerenciar Pacientes', description: 'Criar, editar e visualizar prontuários de pacientes', enabled: !!fetchedPerms?.pacientes },
            { id: 'financeiro', label: 'Acesso Financeiro', description: 'Visualizar entradas, saídas, boletos e recebimentos', enabled: !!fetchedPerms?.financeiro },
            { id: 'configuracoes', label: 'Configurações do Sistema', description: 'Acesso às configurações da clínica e RBAC', enabled: !!fetchedPerms?.configuracoes },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Editar Permissões</h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{roleName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Carregando permissões...</p>
            </div>
          ) : (
            permissions.map((perm) => (
              <div key={perm.id} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-white dark:bg-slate-800">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{perm.label}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{perm.description}</p>
                </div>
                
                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => handleToggle(perm.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                    perm.enabled ? 'bg-blue-600' : 'bg-slate-200'
                  } ${role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  role="switch"
                  aria-checked={perm.enabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-800 shadow ring-0 transition duration-200 ease-in-out ${
                      perm.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 dark:bg-slate-950 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-100 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || role === 'admin'}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
