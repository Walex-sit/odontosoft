'use server'

import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Admin client — bypasses RLS so any authenticated user can read/write
// ---------------------------------------------------------------------------
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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
  /** Nome visual exibido na Topbar — desacoplado da Razão Social */
  nome_exibido: string | null
  updated_at: string
  clinica_id?: string | null
}

// ---------------------------------------------------------------------------
// fetchClinicaSettings — retorna a única linha da tabela clinica_settings
// ---------------------------------------------------------------------------
export async function fetchClinicaSettings(): Promise<{
  success: boolean
  data: ClinicaSettings | null
  error?: string
}> {
  try {
    const admin = getAdmin()
    const { data, error } = await admin
      .from('clinica_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[clinica] fetchClinicaSettings error:', error.message)
      return { success: false, data: null, error: error.message }
    }

    const settings = data as ClinicaSettings | null

    // Forçar a leitura da tabela `clinicas` que é a fonte da verdade atual
    if (settings) {
      let targetId = settings.clinica_id
      if (!targetId) {
        // Fallback: se não tiver linkado ainda
        const { data: fallback } = await admin.from('clinicas').select('*').limit(1).maybeSingle()
        if (fallback) {
          targetId = fallback.id
          await admin.from('clinica_settings').update({ clinica_id: targetId }).eq('id', settings.id)
        }
      }

      if (targetId) {
        const { data: realClinica } = await admin.from('clinicas').select('nome, cnpj, telefone, email, endereco').eq('id', targetId).maybeSingle()
        if (realClinica) {
          settings.nome = realClinica.nome
          settings.cnpj = realClinica.cnpj || settings.cnpj
          settings.telefone = realClinica.telefone || settings.telefone
          settings.email = realClinica.email || settings.email
          settings.endereco = realClinica.endereco || settings.endereco
        }
      }
    }

    return { success: true, data: settings }
  } catch (e: any) {
    console.error('[clinica] fetchClinicaSettings exception:', e.message)
    return { success: false, data: null, error: e.message }
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
  /** Nome visual exibido na Topbar — desacoplado da Razão Social */
  nome_exibido?: string | null
  target_clinica_id?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = getAdmin()
    const { id, target_clinica_id, ...fields } = payload

    // 1. Pega o clinica_id associado ao settings
    const { data: cs } = await admin.from('clinica_settings').select('clinica_id').eq('id', id).single()
    
    let targetClinicaId = target_clinica_id || cs?.clinica_id

    // Fallback agressivo: se o settings não tiver clinica_id linkado, pega a primeira clínica disponível
    if (!targetClinicaId) {
      const { data: fallbackClinica } = await admin.from('clinicas').select('id').limit(1).maybeSingle()
      if (fallbackClinica) {
        targetClinicaId = fallbackClinica.id
        // Conserta o link quebrado
        await admin.from('clinica_settings').update({ clinica_id: targetClinicaId }).eq('id', id)
      }
    }

    // 2. Se existe um ID alvo válido, atualiza a tabela 'clinicas' fortemente
    if (targetClinicaId) {
       const updateRes = await admin.from('clinicas').update({
         nome: fields.nome,
         cnpj: fields.cnpj,
         telefone: fields.telefone,
         email: fields.email,
         endereco: fields.endereco,
         atualizado_em: new Date().toISOString()
       }).eq('id', targetClinicaId)
       
       if (updateRes.error) {
         console.error('[clinica] Falha ao atualizar tabela clinicas:', updateRes.error)
       }
    }

    // 3. Atualiza também a tabela clinica_settings (para compatibilidade legada)
    const { error } = await admin
      .from('clinica_settings')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('[clinica] updateClinicaSettings error:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e: any) {
    console.error('[clinica] updateClinicaSettings exception:', e.message)
    return { success: false, error: e.message }
  }
}

// ---------------------------------------------------------------------------
// uploadClinicaLogo — faz upload da imagem para o bucket "clinic-logos"
// e atualiza logo_url na tabela clinica_settings
// ---------------------------------------------------------------------------
export async function uploadClinicaLogo(formData: FormData): Promise<{
  success: boolean
  logo_url?: string
  error?: string
}> {
  try {
    const file = formData.get('logo') as File | null
    const clinicaId = formData.get('clinicaId') as string | null

    if (!file || !clinicaId) {
      return { success: false, error: 'Arquivo ou ID da clínica não fornecido.' }
    }

    // Validação de tipo
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      return { success: false, error: 'Formato não suportado. Use PNG, JPG, WEBP ou SVG.' }
    }

    // Validação de tamanho (2 MB)
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'A imagem deve ter no máximo 2 MB.' }
    }

    const admin = getAdmin()
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `logo.${ext}` // nome fixo — sempre sobrescreve a logo anterior

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload para o bucket público "clinic-logos"
    const { error: uploadError } = await admin.storage
      .from('clinic-logos')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true, // sobrescreve se já existir
      })

    if (uploadError) {
      console.error('[clinica] uploadClinicaLogo upload error:', uploadError.message)
      return { success: false, error: uploadError.message }
    }

    // Gera a URL pública
    const { data: urlData } = admin.storage
      .from('clinic-logos')
      .getPublicUrl(path)

    // Adiciona timestamp para bustar cache do browser
    const logo_url = `${urlData.publicUrl}?t=${Date.now()}`

    // Persiste a URL na tabela
    const { error: updateError } = await admin
      .from('clinica_settings')
      .update({ logo_url, updated_at: new Date().toISOString() })
      .eq('id', clinicaId)

    if (updateError) {
      console.error('[clinica] uploadClinicaLogo update error:', updateError.message)
      return { success: false, error: updateError.message }
    }

    return { success: true, logo_url }
  } catch (e: any) {
    console.error('[clinica] uploadClinicaLogo exception:', e.message)
    return { success: false, error: e.message }
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
    const admin = getAdmin()

    // Tenta remover os arquivos do bucket (png, jpg, webp, svg)
    await admin.storage.from('clinic-logos').remove([
      'logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp', 'logo.svg'
    ])

    const { error } = await admin
      .from('clinica_settings')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', clinicaId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
