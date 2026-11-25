'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, Users, CircleDollarSign, Building2, CreditCard, ShieldCheck } from 'lucide-react';

// ─── RBAC — mesma lógica do Topbar ────────────────────────────────────────────
import { useAuth } from '../components/RequireAuth';
import { useClinica } from '../contexts/ClinicaContext';
import { hasPermission } from '../lib/permissions';
import { UserRole } from '../components/RequireAuth';

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { isSuperAdminContext } = useClinica();

  const isSuper = profile?.role === 'super_admin';

  let visibleItems: { name: string; href: string; icon: any }[] = [];

  if (isSuper) {
    if (!isSuperAdminContext) {
      visibleItems = [
        { name: 'Geral',       href: '/admin',             icon: ShieldCheck },
        { name: 'Clínicas',    href: '/admin/clinicas',    icon: Building2 },
        { name: 'Usuários',    href: '/admin/usuarios',    icon: Users },
        { name: 'Assinaturas', href: '/admin/assinaturas', icon: CreditCard },
      ];
    } else {
      visibleItems = [
        { name: 'Agenda',    href: '/agenda',     icon: CalendarDays },
        { name: 'Pacientes', href: '/pacientes',  icon: Users },
        { name: 'Finanças',  href: '/financeiro', icon: CircleDollarSign },
        { name: 'Global',    href: '/admin',      icon: ShieldCheck },
      ];
    }
  } else {
    const navItems: { name: string; href: string; icon: any; allowedRoles?: UserRole[] }[] = [
      { name: 'Início',    href: '/overview',   icon: Home },
      { name: 'Agenda',    href: '/agenda',     icon: CalendarDays,      allowedRoles: ['admin', 'dentista', 'recepcao'] },
      { name: 'Pacientes', href: '/pacientes',  icon: Users,             allowedRoles: ['admin', 'dentista', 'recepcao'] },
      { name: 'Finanças',  href: '/financeiro', icon: CircleDollarSign,  allowedRoles: ['admin', 'financeiro'] },
    ];

    visibleItems = navItems.filter(
      (item) => !item.allowedRoles || hasPermission(profile?.role, item.allowedRoles)
    );
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-surface)] border-t border-[var(--border)]">
      <div className="flex justify-around items-center h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:scale-95 ${
                isActive
                  ? 'text-[var(--primary)] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
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