import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildImpactCsv, buildImpactPdf } from './impact-report';

const report = {
  generatedAt: '2026-04-28T18:00:00.000Z',
  totals: {
    requests: 12,
    pendingRequests: 3,
    scheduledMeetings: 5,
    syncedMeetings: 4,
    broadcastEvents: 2
  },
  topTopics: [
    { label: 'Seguridad', count: 4 },
    { label: 'Salud', count: 2 }
  ],
  topNeighborhoods: [{ label: 'Andorra', count: 3 }],
  topLocalities: [{ label: 'Ushuaia', count: 8 }],
  requestsByStatus: [{ label: 'pending', count: 3 }],
  upcomingMeetings: [
    {
      id: 'meeting-1',
      request_id: 'request-1',
      starts_at: '2026-05-01T10:00:00.000Z',
      ends_at: '2026-05-01T10:30:00.000Z',
      location: 'Centro vecinal',
      sync_status: 'synced'
    }
  ],
  recentRequests: [
    {
      id: 'request-1',
      citizen_name: 'Ana Perez',
      topic: 'Seguridad',
      locality: 'Ushuaia',
      neighborhood: 'Andorra',
      status: 'pending',
      created_at: '2026-04-28T17:00:00.000Z',
      preferred_datetime: '2026-05-01T10:00:00.000Z'
    }
  ]
};

test('impact csv export includes totals and data sections', () => {
  const csv = buildImpactCsv(report);
  assert.match(csv, /section,label,count/);
  assert.match(csv, /totals,solicitudes,12/);
  assert.match(csv, /recent_requests/);
  assert.match(csv, /upcoming_meetings/);
});

test('impact pdf export returns a pdf header', () => {
  const pdf = buildImpactPdf(report);
  assert.equal(Buffer.from(pdf).toString('utf8', 0, 8), '%PDF-1.4');
});
