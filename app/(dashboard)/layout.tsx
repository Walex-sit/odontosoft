import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import RequireAuth from '../components/RequireAuth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireAuth>
      <div className="h-screen w-full bg-slate-950 flex overflow-hidden text-slate-300">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-8 lg:px-12">
            <div className="max-w-7xl mx-auto pb-12">
              {children}
            </div>
          </main>
        </div>
      </div>
    </RequireAuth>
  )
}