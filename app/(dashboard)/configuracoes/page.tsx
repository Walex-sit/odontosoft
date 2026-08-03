'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, ShieldCheck, Cpu, Save, Sliders, Smartphone, Mail, Globe, UserPlus, Loader2, Pencil, Trash2, Percent } from 'lucide-react'
import { toast } from 'sonner'
import ManageRolePermissionsModal, { Role } from '@/app/components/ManageRolePermissionsModal'
import CreateUserModal from '@/app/components/CreateUserModal'
import EditUserModal from '@/app/components/EditUserModal'
import { fetchTeamMembers, deleteUserAccount } from '@/app/actions/users'
import CommissionModal from '@/app/components/CommissionModal'
import { fetchCommissions } from '@/app/actions/commissions'

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'perfil' | 'usuarios' | 'integracoes' | 'comissoes'>('perfil')
  const [salvando, setSalvando] = useState(false)

  // Estados para o Modal de Permissões
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedRoleName, setSelectedRoleName] = useState('')

  // Estados para Membros da Equipe
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<{ id: string; nome: string; email: string; role: string } | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  // Estados para Comissões
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false)
  const [commissions, setCommissions] = useState<any[]>([])
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(false)

  const loadCommissions = async () => {
    setIsLoadingCommissions(true)
    try {
      const res = await fetchCommissions()
      setCommissions(res.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingCommissions(false)
    }
  }

  const handleEditUser = (member: { id: string; nome: string; email: string; role: string }) => {
    setEditingUser(member)
    setIsEditUserModalOpen(true)
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação é irreversível.`)) return
    setDeletingUserId(userId)
    try {
      const res = await deleteUserAccount(userId)
      if (res.success) {
        toast.success('Usuário excluído com sucesso!')
        loadTeamMembers()
      } else {
        toast.error(res.error || 'Erro ao excluir o usuário.')
      }
    } catch {
      toast.error('Erro inesperado ao excluir o usuário.')
    } finally {
      setDeletingUserId(null)
    }
  }

  const loadTeamMembers = async () => {
    setIsLoadingMembers(true)
    try {
      const res = await fetchTeamMembers()
      // Sempre seta o array (mesmo vazio) — success:true com data:[] não é erro
      setTeamMembers(res.data ?? [])
      // Só mostra toast de erro se vier uma mensagem de erro explícita
      if (!res.success && res.error) {
        console.error('Falha ao carregar equipe:', res.error)
      }
    } catch (e) {
      console.error('Erro inesperado ao carregar equipe:', e)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'usuarios') {
      loadTeamMembers()
    } else if (activeTab === 'comissoes') {
      loadCommissions()
    }
  }, [activeTab])

  // Estado mock para o Perfil da Clínica
  const [clinica, setClinica] = useState({
    nome: 'OdontoSoft Clínica Odontológica Especializada',
    cnpj: '12.345.678/0001-90',
    telefone: '(11) 99999-8888',
    email: 'contato@odontosoft.com.br',
    croResponsavel: 'CRO-SP 123456',
    endereco: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    site: 'https://odontosoft.com.br'
  })

  // Estado mock de Integrações
  const [integracoes, setIntegracoes] = useState({
    whatsapp: true,
    nfe: false,
    googleCalendar: true,
    pagamentosPix: true
  })

  const handleSalvar = async () => {
    setSalvando(true)
    await new Promise(r => setTimeout(r, 600))
    setSalvando(false)
    toast.success('Configurações salvas com sucesso!')
  }

  return (
    <div className="flex flex-col w-full h-full bg-slate-50 text-slate-800 overflow-y-auto">
      {/* Header */}
      <header className="p-8 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Configurações do Sistema</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Gerencie os dados da sua clínica, permissões de usuários e integrações</p>
          </div>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 self-start md:self-auto disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

        {/* Abas */}
        <div className="max-w-6xl mx-auto flex items-center gap-2 mt-8 border-b border-slate-100 pb-0.5">
          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-b-2 ${
              activeTab === 'perfil'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Building2 className="h-4 w-4" /> Perfil da Clínica
          </button>
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-b-2 ${
              activeTab === 'usuarios'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" /> Usuários e Permissões
          </button>
          <button
            onClick={() => setActiveTab('comissoes')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-b-2 ${
              activeTab === 'comissoes'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Percent className="h-4 w-4" /> Comissões
          </button>
          <button
            onClick={() => setActiveTab('integracoes')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-b-2 ${
              activeTab === 'integracoes'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Cpu className="h-4 w-4" /> Integrações
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {/* ABA 1: PERFIL DA CLÍNICA */}
        {activeTab === 'perfil' && (
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Informações Cadastrais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Razão Social / Nome da Clínica</label>
                <input
                  type="text"
                  value={clinica.nome}
                  onChange={e => setClinica(p => ({ ...p, nome: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CNPJ</label>
                <input
                  type="text"
                  value={clinica.cnpj}
                  onChange={e => setClinica(p => ({ ...p, cnpj: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefone de Contato</label>
                <input
                  type="text"
                  value={clinica.telefone}
                  onChange={e => setClinica(p => ({ ...p, telefone: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail Comercial</label>
                <input
                  type="email"
                  value={clinica.email}
                  onChange={e => setClinica(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CRO do Responsável Técnico</label>
                <input
                  type="text"
                  value={clinica.croResponsavel}
                  onChange={e => setClinica(p => ({ ...p, croResponsavel: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Website</label>
                <input
                  type="text"
                  value={clinica.site}
                  onChange={e => setClinica(p => ({ ...p, site: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Endereço Completo</label>
              <input
                type="text"
                value={clinica.endereco}
                onChange={e => setClinica(p => ({ ...p, endereco: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* ABA 2: USUÁRIOS E PERMISSÕES */}
        {activeTab === 'usuarios' && (
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Perfis de Acesso (RBAC)</h3>
                <p className="text-sm text-slate-500 mt-0.5">Gerencie os papeis configurados no seu OdontoSoft</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => { setSelectedRole('admin'); setSelectedRoleName('Administrador'); setIsModalOpen(true); }}
                className="p-5 border border-slate-200 rounded-2xl bg-slate-50 flex items-start gap-4 cursor-pointer hover:bg-slate-100 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Administrador</h4>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Acesso total a todos os módulos, prontuários, financeiro e configurações.</p>
                </div>
              </div>

              <div 
                onClick={() => { setSelectedRole('dentista'); setSelectedRoleName('Dentista / Odontólogo'); setIsModalOpen(true); }}
                className="p-5 border border-slate-200 rounded-2xl bg-slate-50 flex items-start gap-4 cursor-pointer hover:bg-slate-100 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-green-100 text-green-700 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Dentista / Odontólogo</h4>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Acesso à agenda, lista de pacientes, prontuários e evolução médica.</p>
                </div>
              </div>

              <div 
                onClick={() => { setSelectedRole('recepcao'); setSelectedRoleName('Recepção'); setIsModalOpen(true); }}
                className="p-5 border border-slate-200 rounded-2xl bg-slate-50 flex items-start gap-4 cursor-pointer hover:bg-slate-100 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                  <Sliders className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Recepção</h4>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Agendamento de consultas, confirmações e cadastro inicial de pacientes.</p>
                </div>
              </div>

              <div 
                onClick={() => { setSelectedRole('financeiro'); setSelectedRoleName('Financeiro'); setIsModalOpen(true); }}
                className="p-5 border border-slate-200 rounded-2xl bg-slate-50 flex items-start gap-4 cursor-pointer hover:bg-slate-100 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Financeiro</h4>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Controle de entradas, saídas, emissão de boletos e relatórios orçamentários.</p>
                </div>
              </div>
            </div>

            {/* Nova Seção: Membros da Equipe */}
            <div className="mt-12">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Membros da Equipe</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Gerencie os usuários cadastrados no sistema</p>
                </div>
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Novo Usuário
                </button>
              </div>

              {isLoadingMembers ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
                  <p className="text-sm text-slate-500 font-semibold">Carregando membros...</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                        <th className="p-4">Nome Completo</th>
                        <th className="p-4">E-mail</th>
                        <th className="p-4">Função</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teamMembers.length > 0 ? (
                        teamMembers.map(member => (
                          <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-semibold text-slate-800">{member.nome}</td>
                            <td className="p-4 text-slate-600 text-sm">{member.email}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                member.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                member.role === 'dentista' ? 'bg-green-100 text-green-700' :
                                member.role === 'recepcao' ? 'bg-amber-100 text-amber-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEditUser(member)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(member.id, member.nome)}
                                  disabled={deletingUserId === member.id}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50" title="Excluir"
                                >
                                  {deletingUserId === member.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500 font-semibold">
                            Nenhum usuário encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 3: INTEGRAÇÕES */}
        {activeTab === 'integracoes' && (
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Serviços Conectados</h3>

            <div className="space-y-4">
              <div className="p-5 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">WhatsApp / Notificações Automáticas</h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Envio automático de lembretes e confirmações de consulta</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={integracoes.whatsapp}
                  onChange={e => setIntegracoes(p => ({ ...p, whatsapp: e.target.checked }))}
                  className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>

              <div className="p-5 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Google Calendar</h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Sincronização bidirecional das agendas da clínica</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={integracoes.googleCalendar}
                  onChange={e => setIntegracoes(p => ({ ...p, googleCalendar: e.target.checked }))}
                  className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>

              <div className="p-5 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Recebimento via PIX & Cartões (Gateway)</h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Geração de QR Code PIX dinâmico e conciliação bancária</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={integracoes.pagamentosPix}
                  onChange={e => setIntegracoes(p => ({ ...p, pagamentosPix: e.target.checked }))}
                  className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: COMISSÕES */}
        {activeTab === 'comissoes' && (
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Tabela de Comissões</h3>
                <p className="text-sm text-slate-500 mt-0.5">Defina a porcentagem de comissão por procedimento e dentista</p>
              </div>
              <button
                onClick={() => setIsCommissionModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-green-500/20 flex items-center gap-2"
              >
                <Percent className="h-4 w-4" />
                Nova Comissão
              </button>
            </div>

            {isLoadingCommissions ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
                <p className="text-sm text-slate-500 font-semibold">Carregando comissões...</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-4">Dentista</th>
                      <th className="p-4">Procedimento</th>
                      <th className="p-4">Porcentagem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commissions.length > 0 ? (
                      commissions.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-semibold text-slate-800">{c.dentista_nome}</td>
                          <td className="p-4 text-slate-600 text-sm">{c.procedimento_nome}</td>
                          <td className="p-4 text-slate-600 text-sm">{c.porcentagem}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-500 font-semibold">
                          Nenhuma comissão configurada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modais */}
      <ManageRolePermissionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role={selectedRole}
        roleName={selectedRoleName}
      />
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onSuccess={loadTeamMembers}
      />
      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => { setIsEditUserModalOpen(false); setEditingUser(null) }}
        onSuccess={loadTeamMembers}
        user={editingUser}
      />
      <CommissionModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
        onSuccess={loadCommissions}
      />
    </div>
  )
}
