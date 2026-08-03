import React from 'react';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

export default function FormSection({ title, children }: FormSectionProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-[24px] p-6 mb-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">{title}</h2>
      {children}
    </section>
  );
}
