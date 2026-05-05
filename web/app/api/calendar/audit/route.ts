import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '../../../../lib/api-auth';
import { can } from '../../../../lib/permissions';
import { verifyGoogleCalendarAccess } from '../../../../lib/google-calendar';
import { withApiObservability } from '../../../../lib/api-observability';

export const GET = withApiObservability('api.calendar.audit.get', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;

  if (!can(auth, 'OPS_ADMIN_TL')) {
    return NextResponse.json({ error: 'Solo admin o lider pueden auditar Google Calendar.' }, { status: 403 });
  }

  const result = await verifyGoogleCalendarAccess();

  return NextResponse.json({
    data: result,
    recommendations: result.ready
      ? []
      : [
          'Confirmar que GOOGLE_CALENDAR_ID exista y esté compartido con la Service Account.',
          'Verificar que la Service Account tenga permisos de edición sobre el calendario.',
          'Revisar que la private key no tenga saltos de línea dañados en variables de entorno.'
        ]
  });
});
