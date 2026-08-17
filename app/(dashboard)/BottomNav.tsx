'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, Users, CircleDollarSign } from 'lucide-react';

// ─── RBAC — mesma lógica do Topbar ────────────────────────────────────────────
import { useAuth } from '../components/RequireAuth';
import { hasPermission } from '../lib/permissions';
import { UserRole } from '../components/RequireAuth';

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();

  // Espelha exatamente os allowedRoles definidos no navLinks do Topbar.tsx
  const navItems: { name: string; href: string; icon: any; allowedRoles?: UserRole[] }[] = [
    { name: 'Início',    href: '/overview',   icon: Home },
    { name: 'Agenda',    href: '/agenda',     icon: CalendarDays,      allowedRoles: ['admin', 'dentista', 'recepcao'] },
    { name: 'Pacientes', href: '/pacientes',  icon: Users,             allowedRoles: ['admin', 'dentista', 'recepcao'] },
    { name: 'Finanças',  href: '/financeiro', icon: CircleDollarSign,  allowedRoles: ['admin', 'financeiro'] },
  ];

  // Remove da lista quaisquer itens que o usuário não tem permissão de ver —
  // evita que botões "Acesso Negado" apareçam no menu inferior mobile.
  const visibleItems = navItems.filter(
    (item) => !item.allowedRoles || hasPermission(profile?.role, item.allowedRoles)
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
      <div className="flex justify-around items-center h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}