import { UserRole } from '../components/RequireAuth';

export function hasPermission(userRole: string | undefined | null, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole as UserRole);
}