import Topbar from '../components/Topbar'
import RequireAuth from '../components/RequireAuth'
import RouteGuard from '../components/RouteGuard'
import { BottomNav } from './BottomNav' // <-- 1. Importe a BottomNav aqui
import { ClinicaProvider } from '../contexts/ClinicaContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireAuth>
      <ClinicaProvider>
        <div className="flex flex-col min-h-screen w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
          <Topbar />
          
          <main className="flex flex-1 flex-col overflow-hidden relative z-10 w-full h-full pb-16 md:pb-0"> 
            {/* Note que adicionamos 'pb-16 md:pb-0' acima para que o rodapé fixo não tape o final do conteúdo da página */}
            <RouteGuard>
              {children}
            </RouteGuard>
          </main>

          <BottomNav /> {/* <-- 2. Insira a BottomNav aqui */}
        </div>
      </ClinicaProvider>
    </RequireAuth>
  )
}