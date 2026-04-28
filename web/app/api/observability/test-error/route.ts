import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '../../../../lib/api-auth';
import { can } from '../../../../lib/permissions';
import { withApiObservability } from '../../../../lib/api-observability';

export const POST = withApiObservability('api.observability.test_error.post', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;

  if (!can(auth, 'SYSTEM_ADMIN_ONLY')) {
    return NextResponse.json({ error: 'Solo ADMIN puede ejecutar prueba de observabilidad.' }, { status: 403 });
  }

  throw new Error('Sentry test error: controlled failure from /api/observability/test-error');
});
