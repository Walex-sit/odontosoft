import Topbar from '../components/Topbar'
import { TrialBanner } from '../components/TrialBanner'
import { AdminContextBanner } from '../components/AdminContextBanner'
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

        <div className="flex flex-col min-h-dvh w-full bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-clip">
          {/* Topbar 100% persistente e estática */}
          <Topbar />

          {/* Banner de Contexto Administrativo (Super Admin em Clínica Selecionada) */}
          <AdminContextBanner />

          {/* Banner de Aviso de Período de Avaliação (Trial 7 dias) */}
          <TrialBanner />

          {/* Feedback tátil imediato em navegação */}
          <NavigationProgress />

          <main className="flex flex-1 flex-col overflow-x-clip relative z-10 w-full h-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
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