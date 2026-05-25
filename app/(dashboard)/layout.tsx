'use client'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import RequireAuth from '../components/RequireAuth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <RequireAuth>
      <div className="h-screen w-full flex overflow-hidden relative" style={{background:'#0e1420', color:'#f0f4ff'}}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col h-full overflow-hidden" style={{background:'#0e1420'}}>
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 overflow-y-auto px-2 py-4 sm:p-6 md:p-8 lg:px-12 relative">
            <div className="max-w-7xl mx-auto pb-12">
              {children}
            </div>
          </main>
        </div>
      </div>
    </RequireAuth>
  )
}