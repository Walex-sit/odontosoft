import EditPatientForm from '@/components/EditPatientForm';
import { getPatientById } from '@/app/(dashboard)/pacientes/[id]/edit/actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || id === 'undefined') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">ID de Paciente Inválido</h2>
        <p className="text-slate-500 mb-6">O ID fornecido para edição não é válido.</p>
        <Link href="/pacientes" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          Voltar para Lista
        </Link>
      </div>
    );
  }

  const patient = await getPatientById(id);
  
  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Paciente não encontrado</h2>
        <p className="text-slate-500 mb-6">Não foi possível carregar os dados deste paciente. Verifique se o ID está correto.</p>
        <Link href="/pacientes" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          Voltar para Lista
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 p-8">
      <EditPatientForm patient={patient} />
    </div>
  );
}
