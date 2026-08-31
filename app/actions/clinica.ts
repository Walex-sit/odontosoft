'use server'

/**
 * app/actions/clinica.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerenciamento de configurações da clínica e upload de logotipo.
 *
 * Segurança (T001):
 *  ✅ Usa createServerClient() — autenticado via JWT/cookie → RLS ativo.
 *  ✅ Leitura e atualização são escopadas pela clínica do usuário autenticado.
 *  ✅ Apenas 'admin' pode alterar configurações cadastrais da clínica.
 *  ✅ Sem service_role para operações de leitura/escrita regulares.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ClinicaSettings {
  id: string
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  cro_responsavel: string | null
  endereco: string | null
  site: string | null
  logo_url: string | null
  nome_exibido: string | null
  updated_at: string
  clinica_id?: string | null
}

// ---------------------------------------------------------------------------
// fetchClinicaSettings — busca as configurações da clínica do usuário logado
// ---------------------------------------------------------------------------
export async function fetchClinicaSettings(): Promise<{
  success: boolean
  data: ClinicaSettings | null
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, data: null, error: 'Não autorizado.' }
    }

    // Busca o perfil para identificar a clinica_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    const clinicaId = profile?.clinica_id

    // Busca settings
    let query = supabase.from('clinica_settings').select('*')
    if (clinicaId) {
      query = query.eq('clinica_id', clinicaId)
    }
    const { data: settingsData, error: settingsError } = await query.limit(1).maybeSingle()

    if (settingsError) {
      console.error('[clinica] fetchClinicaSettings error:', settingsError.message)
      return { success: false, data: null, error: settingsError.message }
    }

    let settings = settingsData as ClinicaSettings | null

    // Se temos clinica_id, sincroniza com os dados mais recentes da tabela clinicas
    if (clinicaId) {
      const { data: realClinica } = await supabase
        .from('clinicas')
        .select('id, nome, cnpj, telefone, email, endereco')
        .eq('id', clinicaId)
        .maybeSingle()

      if (realClinica) {
        if (!settings) {
          settings = {
            id: realClinica.id,
            nome: realClinica.nome,
            cnpj: realClinica.cnpj,
            telefone: realClinica.telefone,
            email: realClinica.email,
            cro_responsavel: null,
            endereco: realClinica.endereco,
            site: null,
            logo_url: null,
            nome_exibido: realClinica.nome,
            updated_at: new Date().toISOString(),
            clinica_id: realClinica.id,
          }
        } else {
          settings.nome = realClinica.nome || settings.nome
          settings.cnpj = realClinica.cnpj || settings.cnpj
          settings.telefone = realClinica.telefone || settings.telefone
          settings.email = realClinica.email || settings.email
          settings.endereco = realClinica.endereco || settings.endereco
        }
      }
    }

    return { success: true, data: settings }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[clinica] fetchClinicaSettings exception:', msg)
    return { success: false, data: null, error: msg }
  }
}

// ---------------------------------------------------------------------------
// updateClinicaSettings — atualiza os campos cadastrais da clínica
// ---------------------------------------------------------------------------
export async function updateClinicaSettings(payload: {
  id: string
  nome?: string
  cnpj?: string
  telefone?: string
  email?: string
  cro_responsavel?: string
  endereco?: string
  site?: string
  logo_url?: string | null
  nome_exibido?: string | null
  target_clinica_id?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Não autorizado.' }
    }

    // RBAC: apenas admin pode alterar configurações da clínica
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('clinica_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Apenas administradores podem alterar as configurações da clínica.' }
    }

    const { id, target_clinica_id, ...fields } = payload
    const targetClinicaId = profile.clinica_id || target_clinica_id

    // 1. Atualiza a tabela clinicas se clinica_id estiver definido
    if (targetClinicaId) {
      const updateClinicaPayload: {
        atualizado_em: string
        nome?: string
        cnpj?: string | null
        telefone?: string | null
        email?: string | null
        endereco?: string | null
      } = {
        atualizado_em: new Date().toISOString(),
      }
      if (fields.nome !== undefined) updateClinicaPayload.nome = fields.nome
      if (fields.cnpj !== undefined) updateClinicaPayload.cnpj = fields.cnpj
      if (fields.telefone !== undefined) updateClinicaPayload.telefone = fields.telefone
      if (fields.email !== undefined) updateClinicaPayload.email = fields.email
      if (fields.endereco !== undefined) updateClinicaPayload.endereco = fields.endereco

      const { error: clinicaErr } = await supabase
        .from('clinicas')
        .update(updateClinicaPayload)
        .eq('id', targetClinicaId)

      if (clinicaErr) {
        console.error('[clinica] Erro ao atualizar tabela clinicas:', clinicaErr.message)
      }
    }

    // 2. Atualiza a tabela clinica_settings
    const updateSettingsPayload: {
      nome?: string
      cnpj?: string | null
      telefone?: string | null
      email?: string | null
      cro_responsavel?: string | null
      endereco?: string | null
      site?: string | null
      logo_url?: string | null
      nome_exibido?: string | null
      updated_at: string
    } = {
      ...fields,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('clinica_settings')
      .update(updateSettingsPayload)
      .eq('id', id)

    if (error) {
      console.error('[clinica] updateClinicaSettings error:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[clinica] updateClinicaSettings exception:', msg)
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// uploadClinicaLogo — upload da logo para o storage
// ---------------------------------------------------------------------------
export async function uploadClinicaLogo(formData: FormData): Promise<{
  success: boolean
  logo_url?: string
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Não autorizado.' }
    }

    const file = formData.get('logo') as File | null
    const clinicaId = formData.get('clinicaId') as string | null

    if (!file || !clinicaId) {
      return { success: false, error: 'Arquivo ou ID da clínica não fornecido.' }
    }

    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      return { success: false, error: 'Formato não suportado. Use PNG, JPG, WEBP ou SVG.' }
    }

    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'A imagem deve ter no máximo 2 MB.' }
    }

    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${clinicaId}/logo.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('clinic-logos')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('[clinica] uploadClinicaLogo upload error:', uploadError.message)
      return { success: false, error: uploadError.message }
    }

    const { data: urlData } = supabase.storage
      .from('clinic-logos')
      .getPublicUrl(path)

    const logo_url = `${urlData.publicUrl}?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from('clinica_settings')
      .update({ logo_url, updated_at: new Date().toISOString() })
      .eq('id', clinicaId)

    if (updateError) {
      console.error('[clinica] uploadClinicaLogo update error:', updateError.message)
    }

    return { success: true, logo_url }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[clinica] uploadClinicaLogo exception:', msg)
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// removeClinicaLogo — remove a logo e limpa logo_url
// ---------------------------------------------------------------------------
export async function removeClinicaLogo(clinicaId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Não autorizado.' }
    }

    await supabase.storage.from('clinic-logos').remove([
      `${clinicaId}/logo.png`,
      `${clinicaId}/logo.jpg`,
      `${clinicaId}/logo.jpeg`,
      `${clinicaId}/logo.webp`,
      `${clinicaId}/logo.svg`,
      'logo.png',
      'logo.jpg',
      'logo.jpeg',
      'logo.webp',
      'logo.svg',
    ])

    const { error } = await supabase
      .from('clinica_settings')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', clinicaId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return { success: false, error: msg }
  }
}
