"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
// Estou assumindo que você usa lucide-react para os ícones. 
// Caso use outra biblioteca (como react-icons), basta trocar as importações.
import { Home, CalendarDays, Users, CircleDollarSign } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  // Defina aqui as rotas principais do seu sistema
  const navItems = [
    { name: "Início", href: "/dashboard", icon: Home },
    { name: "Agenda", href: "/agenda", icon: CalendarDays },
    { name: "Pacientes", href: "/pacientes", icon: Users },
    { name: "Finanças", href: "/financeiro", icon: CircleDollarSign },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-surface)] border-t border-[var(--border)]">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive 
                  ? "text-[var(--primary)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}