import type { ApiUser } from './api-auth';

export type PermissionAction =
  | 'SYSTEM_ADMIN_ONLY'
  | 'OPS_ADMIN_TL'
  | 'USER_SELF_SERVICE'
  | 'CALENDAR_FULL_VIEW'
  | 'CALENDAR_MINE_VIEW'
  | 'EVENT_PUBLISH';

const matrix: Record<PermissionAction, ApiUser['role'][]> = {
  SYSTEM_ADMIN_ONLY: ['admin'],
  OPS_ADMIN_TL: ['admin', 'lider'],
  USER_SELF_SERVICE: ['admin', 'lider', 'usuario'],
  CALENDAR_FULL_VIEW: ['admin', 'lider'],
  CALENDAR_MINE_VIEW: ['admin', 'lider', 'usuario'],
  EVENT_PUBLISH: ['admin', 'lider']
};

export function can(user: ApiUser, action: PermissionAction): boolean {
  return matrix[action].includes(user.role);
}

export function actorFromUser(user: Pick<ApiUser, 'id'>): string {
  return `supabase-auth:${user.id}`;
}

export function isOwnerByAgent(actorAgentId: string | null | undefined, user: Pick<ApiUser, 'id'>): boolean {
  return actorAgentId === actorFromUser(user);
}
