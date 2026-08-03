'use client'

import Topbar from '../components/Topbar'
import RequireAuth from '../components/RequireAuth'
import RouteGuard from '../components/RouteGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireAuth>
      <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800 relative">
        <Topbar />
        
        <main className="flex flex-1 flex-col overflow-hidden relative z-10 w-full h-full">
          <RouteGuard>
            {children}
          </RouteGuard>
        </main>
      </div>
    </RequireAuth>
  )
}