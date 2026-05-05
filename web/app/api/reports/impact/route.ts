import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '../../../../lib/api-auth';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { can } from '../../../../lib/permissions';
import { withApiObservability } from '../../../../lib/api-observability';
import { buildImpactCsv, buildImpactPdf, fetchImpactReportData } from '../../../../lib/impact-report';

function buildFilename(extension: 'csv' | 'pdf'): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `impact-report-${stamp}.${extension}`;
}

export const GET = withApiObservability('api.reports.impact.get', async (request: NextRequest) => {
  const auth = await requireApiUser(request.headers.get('authorization'));
  if (auth instanceof NextResponse) return auth;

  if (!can(auth, 'OPS_ADMIN_TL')) {
    return NextResponse.json({ error: 'Solo admin o lider pueden exportar reportes.' }, { status: 403 });
  }

  const format = request.nextUrl.searchParams.get('format') ?? 'json';
  const supabase = getSupabaseAdminClient();
  const report = await fetchImpactReportData(supabase);

  if (format === 'csv') {
    return new NextResponse(buildImpactCsv(report), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${buildFilename('csv')}"`
      }
    });
  }

  if (format === 'pdf') {
    return new NextResponse(Buffer.from(buildImpactPdf(report)), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${buildFilename('pdf')}"`
      }
    });
  }

  return NextResponse.json({ data: report });
});
