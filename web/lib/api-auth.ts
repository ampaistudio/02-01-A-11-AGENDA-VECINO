import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from './supabase-admin';
import { getTrustedSupabaseRole, resolveRoleByEmailAndMetadata } from './roles';

export interface ApiUser {
  id: string;
  email: string;
  role: 'admin' | 'lider' | 'usuario';
  sourceRole: 'admin' | 'lider' | 'usuario' | 'referente';
}

export async function requireApiUser(authHeader: string | null): Promise<ApiUser | NextResponse> {
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user || !data.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userEmail = data.user.email.toLowerCase();

  // Support comma-separated list of admin emails (multi-admin setup)
  const adminEmails = (process.env.APP_ADMIN_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const allowedEmails = (process.env.INTERNAL_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isConfiguredAdmin = adminEmails.includes(userEmail);

  if (allowedEmails.length > 0 && !allowedEmails.includes(userEmail) && !isConfiguredAdmin) {
    return NextResponse.json({ error: 'User is not in internal allowlist' }, { status: 403 });
  }

  const sourceRole = getTrustedSupabaseRole(data.user) ?? 'usuario';
  // Pass the matched admin email so resolveRoleByEmailAndMetadata can grant admin role correctly
  const adminEmailForRole = isConfiguredAdmin ? userEmail : (adminEmails[0] ?? undefined);
  const role = resolveRoleByEmailAndMetadata({ email: userEmail, adminEmail: adminEmailForRole, rawRole: sourceRole });

  if (role === 'admin' && adminEmails.length > 0 && !isConfiguredAdmin) {
    return NextResponse.json({ error: 'Only configured admin email can use admin role' }, { status: 403 });
  }

  return { id: data.user.id, email: data.user.email, role, sourceRole };
}

export function hasRole(user: ApiUser, allowed: ApiUser['role'][]): boolean {
  return allowed.includes(user.role);
}
