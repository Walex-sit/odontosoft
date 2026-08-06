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
      <div className="flex flex-col min-h-screen w-full bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans text-slate-800 dark:text-slate-200 relative transition-colors duration-200">
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