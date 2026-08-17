// app/components/ProtectedRoute.tsx
import React, { ReactNode } from 'react';
import { useAuth, UserRole } from './RequireAuth';
import { hasPermission } from '../lib/permissions';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { profile } = useAuth();
  
  if (!hasPermission(profile?.role, allowedRoles)) {
    return null; // Regra de Ouro UX: Não renderiza nada se não tem permissão
  }
  
  return <>{children}</>;
}