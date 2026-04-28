import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from './supabase-server';
import { getTrustedSupabaseRole, resolveRoleByEmailAndMetadata } from './roles';

export interface SessionUser {
  id: string;
  email: string;
  role: 'admin' | 'usuario' | 'lider';
}

export async function requireSessionUser(): Promise<SessionUser | NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = resolveRoleByEmailAndMetadata({
    email: user.email,
    adminEmail: process.env.APP_ADMIN_EMAIL,
    rawRole: getTrustedSupabaseRole(user)
  });

  return { id: user.id, email: user.email, role };
}
