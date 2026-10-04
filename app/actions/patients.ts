'use server'

/**
 * app/actions/patients.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Proxy tipado para pacientes.ts (T001 — Consolidação).
 * Funções async explícitas para compatibilidade total com Next.js Turbopack 'use server'.
 *
 * ⚠️  DEPRECAÇÃO: Prefira importar diretamente de '@/app/actions/pacientes'.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as pacientesService from './pacientes'
export type { Paciente, ConformidadeConsentimento, TermoPrivacidade } from './pacientes'

export async function createPatient(
  payload: Parameters<typeof pacientesService.createPatient>[0]
) {
  return pacientesService.createPatient(payload)
}

export async function fetchPatients() {
  return pacientesService.fetchPatients()
}

export async function getPatientById(id: string) {
  return pacientesService.getPatientById(id)
}

export async function updatePatient(id: string, formData: FormData) {
  return pacientesService.updatePatient(id, formData)
}

export async function deletePatient(
  id: string,
  actorId?: string,
  actorNome?: string
) {
  return pacientesService.deletePatient(id, actorId, actorNome)
}

export async function getConformidadeConsentimentos(pacienteId: string) {
  return pacientesService.getConformidadeConsentimentos(pacienteId)
}

export async function getTermosPrivacidade() {
  return pacientesService.getTermosPrivacidade()
}

export async function registrarConsentimento(
  payload: Parameters<typeof pacientesService.registrarConsentimento>[0]
) {
  return pacientesService.registrarConsentimento(payload)
}

export async function revogarConsentimento(
  consentimentoId: string,
  pacienteId?: string,
  userId?: string,
  userNome?: string
) {
  return pacientesService.revogarConsentimento(consentimentoId, pacienteId, userId, userNome)
}

