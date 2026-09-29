'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LegacyPatientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id

  useEffect(() => {
    if (id) {
      router.replace(`/pacientes/${id}`)
    } else {
      router.replace('/pacientes')
    }
  }, [router, id])

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 h-full">
      <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
    </div>
  )
}
