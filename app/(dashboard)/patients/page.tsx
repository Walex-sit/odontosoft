'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LegacyPatientsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/pacientes')
  }, [router])

  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--bg-base)] dark:bg-[var(--bg-base)] h-full">
      <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin" />
    </div>
  )
}