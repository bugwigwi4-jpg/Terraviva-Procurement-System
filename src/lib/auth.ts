import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ]);
  const roles: string[] = (roleRows ?? []).map((r: { role: string }) => r.role);
  return { user, profile, roles };
});

export const APPROVER_ROLES = ['admin', 'department_head', 'finance_officer', 'approver'];
export const SUPPLIER_VIEW_ROLES = [
  'admin', 'procurement_officer', 'finance_officer', 'approver',
  'program_manager', 'auditor', 'store_keeper', 'department_head',
];
export const hasAny = (roles: string[], wanted: string[]) => roles.some((r) => wanted.includes(r));

export const ROLE_GROUPS = {
  admin: ['admin'],
  procurement: ['admin', 'procurement_officer'],
  finance: ['admin', 'finance_officer'],
  store: ['admin', 'procurement_officer', 'store_keeper'],
  readAll: ['admin', 'procurement_officer', 'finance_officer', 'approver', 'program_manager', 'auditor'],
  oversight: ['admin', 'auditor', 'procurement_officer', 'finance_officer'],
  programs: ['admin', 'program_manager'],
} as const;

export const can = (roles: string[], group: keyof typeof ROLE_GROUPS) => hasAny(roles, [...ROLE_GROUPS[group]]);
