import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressão - OdontoSoft',
  description: 'Documento para impressão',
}

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-white min-h-screen text-[var(--text-primary)] print:bg-white">
      {children}
    </div>
  )
}
