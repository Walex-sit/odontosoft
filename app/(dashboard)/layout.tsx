import Topbar from '../components/Topbar'
import RequireAuth from '../components/RequireAuth'
import RouteGuard from '../components/RouteGuard'
import { BottomNav } from './BottomNav'
import { ClinicaProvider } from '../contexts/ClinicaContext'
import RoutePrefetcher from '../components/RoutePrefetcher'
import NavigationProgress from '../components/NavigationProgress'
import ContentTransition from '../components/ContentTransition'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireAuth>
      <ClinicaProvider>
        {/* Pré-carregador de rotas e dados de alta frequência em idle */}
        <RoutePrefetcher />

        <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
          {/* Topbar 100% persistente e estática */}
          <Topbar />

          {/* Feedback tátil imediato em navegação */}
          <NavigationProgress />

          <main className="flex flex-1 flex-col overflow-hidden relative z-10 w-full h-full pb-16 md:pb-0">
            <RouteGuard>
              <ContentTransition>
                {children}
              </ContentTransition>
            </RouteGuard>
          </main>

          {/* Barra de navegação móvel persistente */}
          <BottomNav />
        </div>
      </ClinicaProvider>
    </RequireAuth>
  )
}