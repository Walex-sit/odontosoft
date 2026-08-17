import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressão - OdontoSaaS',
  description: 'Documento para impressão',
}

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-white min-h-screen text-slate-900 print:bg-white">
      {children}
    </div>
  )
}
