import type { SupabaseClient } from '@supabase/supabase-js';

export type ImpactRequestRow = {
  id: string;
  citizen_name: string;
  topic: string;
  locality: string | null;
  neighborhood: string | null;
  status: string;
  created_at: string;
  preferred_datetime: string | null;
};

export type ImpactMeetingRow = {
  id: string;
  request_id: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  sync_status: string;
};

export type ImpactEventRow = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
};

export type ImpactReportData = {
  generatedAt: string;
  totals: {
    requests: number;
    pendingRequests: number;
    scheduledMeetings: number;
    syncedMeetings: number;
    broadcastEvents: number;
  };
  topTopics: Array<{ label: string; count: number }>;
  topNeighborhoods: Array<{ label: string; count: number }>;
  topLocalities: Array<{ label: string; count: number }>;
  requestsByStatus: Array<{ label: string; count: number }>;
  upcomingMeetings: ImpactMeetingRow[];
  recentRequests: ImpactRequestRow[];
};

function rankMap(input: Record<string, number>, limit = 5): Array<{ label: string; count: number }> {
  return Object.entries(input)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function escapeCsv(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function sanitizePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export async function fetchImpactReportData(supabase: SupabaseClient): Promise<ImpactReportData> {
  const [requestsResult, meetingsResult, eventsResult] = await Promise.all([
    supabase
      .from('citizen_request')
      .select('id, citizen_name, topic, locality, neighborhood, status, created_at, preferred_datetime')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('meeting')
      .select('id, request_id, starts_at, ends_at, location, sync_status')
      .order('starts_at', { ascending: true })
      .limit(500),
    supabase.from('broadcast_event').select('id, title, starts_at, location').order('starts_at', { ascending: false }).limit(200)
  ]);

  if (requestsResult.error) throw new Error(requestsResult.error.message);
  if (meetingsResult.error) throw new Error(meetingsResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);

  const requests = (requestsResult.data ?? []) as ImpactRequestRow[];
  const meetings = (meetingsResult.data ?? []) as ImpactMeetingRow[];
  const events = (eventsResult.data ?? []) as ImpactEventRow[];

  const topics: Record<string, number> = {};
  const neighborhoods: Record<string, number> = {};
  const localities: Record<string, number> = {};
  const statuses: Record<string, number> = {};
  const now = Date.now();

  for (const request of requests) {
    topics[request.topic] = (topics[request.topic] ?? 0) + 1;
    neighborhoods[request.neighborhood || 'Sin definir'] = (neighborhoods[request.neighborhood || 'Sin definir'] ?? 0) + 1;
    localities[request.locality || 'Sin definir'] = (localities[request.locality || 'Sin definir'] ?? 0) + 1;
    statuses[request.status] = (statuses[request.status] ?? 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      requests: requests.length,
      pendingRequests: requests.filter((request) => request.status.includes('pending')).length,
      scheduledMeetings: meetings.length,
      syncedMeetings: meetings.filter((meeting) => meeting.sync_status === 'synced').length,
      broadcastEvents: events.length
    },
    topTopics: rankMap(topics),
    topNeighborhoods: rankMap(neighborhoods),
    topLocalities: rankMap(localities),
    requestsByStatus: rankMap(statuses),
    upcomingMeetings: meetings.filter((meeting) => new Date(meeting.starts_at).getTime() >= now).slice(0, 10),
    recentRequests: requests.slice(0, 10)
  };
}

export function buildImpactCsv(report: ImpactReportData): string {
  const lines: string[] = [];
  lines.push('section,label,count');
  lines.push(`totals,solicitudes,${report.totals.requests}`);
  lines.push(`totals,solicitudes_pendientes,${report.totals.pendingRequests}`);
  lines.push(`totals,reuniones_agendadas,${report.totals.scheduledMeetings}`);
  lines.push(`totals,reuniones_sincronizadas,${report.totals.syncedMeetings}`);
  lines.push(`totals,eventos_difusion,${report.totals.broadcastEvents}`);

  for (const item of report.topTopics) {
    lines.push(`top_topics,${escapeCsv(item.label)},${item.count}`);
  }
  for (const item of report.topNeighborhoods) {
    lines.push(`top_neighborhoods,${escapeCsv(item.label)},${item.count}`);
  }
  for (const item of report.topLocalities) {
    lines.push(`top_localities,${escapeCsv(item.label)},${item.count}`);
  }
  for (const item of report.requestsByStatus) {
    lines.push(`request_statuses,${escapeCsv(item.label)},${item.count}`);
  }

  lines.push('');
  lines.push('recent_requests,id,citizen_name,topic,status,locality,neighborhood,preferred_datetime,created_at');
  for (const item of report.recentRequests) {
    lines.push(
      [
        'recent_requests',
        escapeCsv(item.id),
        escapeCsv(item.citizen_name),
        escapeCsv(item.topic),
        escapeCsv(item.status),
        escapeCsv(item.locality),
        escapeCsv(item.neighborhood),
        escapeCsv(item.preferred_datetime),
        escapeCsv(item.created_at)
      ].join(',')
    );
  }

  lines.push('');
  lines.push('upcoming_meetings,id,request_id,starts_at,ends_at,location,sync_status');
  for (const item of report.upcomingMeetings) {
    lines.push(
      [
        'upcoming_meetings',
        escapeCsv(item.id),
        escapeCsv(item.request_id),
        escapeCsv(item.starts_at),
        escapeCsv(item.ends_at),
        escapeCsv(item.location),
        escapeCsv(item.sync_status)
      ].join(',')
    );
  }

  return `${lines.join('\n')}\n`;
}

export function buildImpactPdf(report: ImpactReportData): Uint8Array {
  const lines = [
    'Reporte de Impacto - Agenda Reuniones Vecinos',
    `Generado: ${report.generatedAt}`,
    '',
    `Solicitudes totales: ${report.totals.requests}`,
    `Solicitudes pendientes: ${report.totals.pendingRequests}`,
    `Reuniones agendadas: ${report.totals.scheduledMeetings}`,
    `Reuniones sincronizadas: ${report.totals.syncedMeetings}`,
    `Eventos de difusion: ${report.totals.broadcastEvents}`,
    '',
    'Temas mas recurrentes:',
    ...report.topTopics.map((item) => `- ${item.label}: ${item.count}`),
    '',
    'Barrios con mayor demanda:',
    ...report.topNeighborhoods.map((item) => `- ${item.label}: ${item.count}`),
    '',
    'Localidades con mayor demanda:',
    ...report.topLocalities.map((item) => `- ${item.label}: ${item.count}`)
  ];

  const contentLines = lines.map((line, index) => `BT /F1 11 Tf 50 ${780 - index * 16} Td (${sanitizePdfText(line)}) Tj ET`);
  const content = contentLines.join('\n');
  const contentLength = Buffer.byteLength(content, 'utf8');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${contentLength} >> stream\n${content}\nendstream endobj`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
