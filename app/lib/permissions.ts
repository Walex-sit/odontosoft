import { UserRole } from '../components/RequireAuth';

export function hasPermission(userRole: string | undefined | null, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  const isUserAdmin = userRole === 'admin' || userRole === 'admin_clinica';
  const allowsAdmin = allowedRoles.includes('admin') || allowedRoles.includes('admin_clinica');
  if (isUserAdmin && allowsAdmin) return true;
  return allowedRoles.includes(userRole as UserRole);
}

export function isAdminRole(userRole: string | undefined | null): boolean {
  return userRole === 'admin' || userRole === 'admin_clinica';
}