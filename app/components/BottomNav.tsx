'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Users, CircleDollarSign } from "lucide-react";

// 1. Importamos o contexto e nossa nova função utilitária
import { useAuth } from "./RequireAuth";
import { hasPermission } from "../lib/permissions";

// 2. Definimos as roles (se não tiver exportado do RequireAuth)
type UserRole = 'admin' | 'dentista' | 'recepcao' | 'financeiro';

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth(); // 3. Puxamos o perfil do usuário logado

  // 4. Adicionamos a tipagem opcional 'allowedRoles' na lista
  const navItems: { name: string; href: string; icon: any; allowedRoles?: UserRole[] }[] = [
    { name: "Início", href: "/overview", icon: Home }, // <- Alterado de "/" para "/overview"
    { name: "Agenda", href: "/agenda", icon: CalendarDays, allowedRoles: ['admin', 'dentista', 'recepcao'] },
    { name: "Pacientes", href: "/pacientes", icon: Users, allowedRoles: ['admin', 'dentista', 'recepcao'] },
    { 
      name: "Finanças", 
      href: "/financeiro", 
      icon: CircleDollarSign,
      allowedRoles: ['admin', 'financeiro'] // 5. Bloqueio aplicado aqui!
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems
          // 6. O FITRO INTELIGENTE: Remove da tela o que o usuário não pode ver ANTES do map
          .filter(item => !item.allowedRoles || hasPermission(profile?.role, item.allowedRoles))
          .map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
        })}
      </div>
    </nav>
  );
}