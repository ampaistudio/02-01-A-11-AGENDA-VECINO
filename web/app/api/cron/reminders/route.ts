import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import { sendTelegramMessage, formatReadableDateTime } from '../../../../lib/notifications';
import { findChatIdByUserId } from '../../../../lib/telegram';
import { logStructured } from '../../../../lib/runtime-security';
import { withApiObservability } from '../../../../lib/api-observability';
import { verifyCronBearer } from '../../../../lib/cron-auth';

type NotificationRow = {
  id: string;
  entity_id: string | null;
  recipient_user_id: string | null;
  template: string;
};

export const GET = withApiObservability('api.cron.reminders.get', async (request: NextRequest) => {
  const cronAuth = verifyCronBearer({
    bearer: request.headers.get('authorization'),
    secret: process.env.CRON_SECRET
  });
  if (!cronAuth.ok) {
    if (cronAuth.event) logStructured(cronAuth.event, {});
    return NextResponse.json({ error: cronAuth.error }, { status: cronAuth.status });
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const due = await supabase
    .from('notification_log')
    .select('id, entity_id, recipient_user_id, template')
    .eq('channel', 'telegram')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(100);

  if (due.error) {
    return NextResponse.json({ error: due.error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const row of (due.data ?? []) as NotificationRow[]) {
    if (!row.entity_id || !row.recipient_user_id) {
      await supabase.from('notification_log').update({ status: 'failed', last_error: 'invalid_notification_data' }).eq('id', row.id);
      failed += 1;
      continue;
    }

    const meeting = await supabase
      .from('meeting')
      .select('id, starts_at, location, request:citizen_request(citizen_name, topic)')
      .eq('id', row.entity_id)
      .maybeSingle();

    if (meeting.error || !meeting.data) {
      await supabase.from('notification_log').update({ status: 'failed', last_error: 'meeting_not_found' }).eq('id', row.id);
      failed += 1;
      continue;
    }

    const chatId = await findChatIdByUserId(row.recipient_user_id);
    const requestData = meeting.data.request as { citizen_name?: string; topic?: string } | null;

    const ok = await sendTelegramMessage(
      chatId ?? undefined,
      [
        row.template === 'meeting_reminder_24h' ? 'RECORDATORIO: FALTAN 24 HORAS' : 'RECORDATORIO: FALTAN 2 HORAS',
        `Con: ${requestData?.citizen_name ?? 'Sin nombre'}`,
        `Tema: ${requestData?.topic ?? 'Sin tema'}`,
        `Fecha y hora: ${formatReadableDateTime(meeting.data.starts_at)}`,
        `Lugar: ${meeting.data.location ?? 'Sin definir'}`
      ].join('\n')
    );

    const status = ok ? 'sent' : 'failed';
    const update = await supabase
      .from('notification_log')
      .update({ status, sent_at: ok ? new Date().toISOString() : null, last_error: ok ? null : 'telegram_send_failed' })
      .eq('id', row.id);

    if (update.error || !ok) failed += 1;
    else sent += 1;
  }

  logStructured('cron_reminders_run', { sent, failed, due: due.data?.length ?? 0 });
  return NextResponse.json({ sent, failed, due: due.data?.length ?? 0 });
});
