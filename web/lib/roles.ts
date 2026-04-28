export type SourceRole = 'admin' | 'lider' | 'referente' | 'usuario' | null | undefined;
export type AppRole = 'admin' | 'lider' | 'usuario';

export interface SupabaseRoleCarrier {
  app_metadata?: unknown;
  user_metadata?: unknown;
}

export function isSourceRole(value: unknown): value is Exclude<SourceRole, null | undefined> {
  return value === 'admin' || value === 'lider' || value === 'referente' || value === 'usuario';
}

export function normalizeRawRole(value: unknown): SourceRole {
  if (typeof value !== 'string') return undefined;
  const role = value.trim().toLowerCase();
  return isSourceRole(role) ? role : undefined;
}

function readMetadataRole(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== 'object') return undefined;
  return (metadata as { role?: unknown }).role;
}

export function getTrustedSupabaseRole(user: SupabaseRoleCarrier | null | undefined): SourceRole {
  return normalizeRawRole(readMetadataRole(user?.app_metadata)) ?? normalizeRawRole(readMetadataRole(user?.user_metadata));
}

export function normalizeRole(rawRole: SourceRole): AppRole {
  if (rawRole === 'admin') return 'admin';
  if (rawRole === 'lider' || rawRole === 'referente') return 'lider';
  return 'usuario';
}

export function resolveRoleByEmailAndMetadata(params: {
  email: string | null | undefined;
  adminEmail: string | null | undefined;
  rawRole: SourceRole;
}): AppRole {
  const email = params.email?.trim().toLowerCase();
  const adminEmail = params.adminEmail?.trim().toLowerCase();
  if (email && adminEmail && email === adminEmail) return 'admin';
  return normalizeRole(params.rawRole);
}
