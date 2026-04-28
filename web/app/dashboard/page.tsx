import { DashboardClient } from '../../components/dashboard-client';
import { LocalDateTime } from '../../components/local-datetime';
import { getTrustedSupabaseRole, resolveRoleByEmailAndMetadata } from '../../lib/roles';
import { getSupabaseServerClient } from '../../lib/supabase-server';

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const role = resolveRoleByEmailAndMetadata({
    email: user?.email,
    adminEmail: process.env.APP_ADMIN_EMAIL,
    rawRole: getTrustedSupabaseRole(user)
  });
  const canManageStatus = role === 'admin' || role === 'lider';

  return (
    <main className="container">
      <div className="brand-wrap" style={{ justifyItems: 'start', marginBottom: 4 }}>
        <img className="brand-logo" src="/par-logo.jpg" alt="PAR - Partido Arraigo y Renovación" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <h1>Panel Operativo</h1>
        <p className="small">Sesión: {user?.email ?? 'sin sesión'}</p>
      </div>
      <LocalDateTime />
      <DashboardClient canManageStatus={canManageStatus} role={role} />
    </main>
  );
}
