import EditPatientForm from '@/components/EditPatientForm';
import { getPatientById } from '@/app/actions/pacientes';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || id === 'undefined') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-base)] dark:bg-[var(--bg-base)] p-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">ID de Paciente Inválido</h2>
        <p className="text-[var(--text-muted)] mb-6">O ID fornecido para edição não é válido.</p>
        <Link href="/pacientes" className="px-6 py-2 bg-[var(--primary-fill)] text-[var(--on-primary)] font-semibold rounded-lg hover:bg-[var(--primary-fill-hover)] transition-colors">
          Voltar para Lista
        </Link>
      </div>
    );
  }

  const res = await getPatientById(id);
  const patient = res.success ? res.data : null;
  
  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-base)] dark:bg-[var(--bg-base)] p-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Paciente não encontrado</h2>
        <p className="text-[var(--text-muted)] mb-6">Não foi possível carregar os dados deste paciente. Verifique se o ID está correto.</p>
        <Link href="/pacientes" className="px-6 py-2 bg-[var(--primary-fill)] text-[var(--on-primary)] font-semibold rounded-lg hover:bg-[var(--primary-fill-hover)] transition-colors">
          Voltar para Lista
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)] dark:bg-[var(--bg-base)] p-8">
      <EditPatientForm patient={patient as any} />
    </div>
  );
}
