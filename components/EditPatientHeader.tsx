import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface EditPatientHeaderProps {
  patientId: string;
}

export default function EditPatientHeader({ patientId }: EditPatientHeaderProps) {
  const fillFormUrl = `/public/paciente/${patientId}/preencher`;
  return (
    <header className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-slate-800">Editar paciente</h1>
      <Link
        href={fillFormUrl}
        target="_blank"
        className="inline-flex items-center gap-2 px-4 py-2 bg-royal-blue text-white rounded-xl hover:bg-royal-blue/90 transition"
      >
        <span>Link para o paciente preencher</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </header>
  );
}
