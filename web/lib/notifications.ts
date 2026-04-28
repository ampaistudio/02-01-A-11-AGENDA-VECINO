import { getSupabaseAdminClient } from './supabase-admin';
import { actorFromUser } from './permissions';
import { findChatIdByUserId, sendTelegramMessage as sendTelegramMessageRaw } from './telegram';
import type { ApiUser } from './api-auth';

export async function sendTelegramMessage(chatId: string | undefined, text: string): Promise<boolean> {
  return sendTelegramMessageRaw(chatId, text);
}

export async function sendAdminEmail(subject: string, html: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.APP_ADMIN_EMAIL;
  const sender = process.env.NOTIFICATION_SENDER_EMAIL ?? 'noreply@nodoai.agency';
  if (!resendApiKey || !adminEmail) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from: sender,
      to: [adminEmail],
      subject,
      html
    })
  });
}

export function formatReadableDateTime(iso: string): string {
  const dt = new Date(iso);
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dt);
}

export async function sendRequestChangeNotification(params: {
  userId: string;
  headline: string;
  topic: string;
  citizenName: string;
  locality: string | null;
  neighborhood: string | null;
  startsAt?: string | null;
  location?: string | null;
}): Promise<void> {
  const chatId = await findChatIdByUserId(params.userId);
  if (!chatId) return;

  const lines = [
    params.headline,
    `Con: ${params.citizenName}`,
    `Tema: ${params.topic}`,
    `Localidad: ${params.locality ?? 'Sin localidad'}`,
    `Barrio: ${params.neighborhood ?? 'Sin barrio'}`
  ];
  if (params.startsAt) lines.push(`Fecha y hora: ${formatReadableDateTime(params.startsAt)}`);
  lines.push(`Lugar: ${params.location ?? 'Sin definir'}`);
  await sendTelegramMessageRaw(chatId, lines.join('\n'));
}

export async function queueMeetingReminderNotifications(params: {
  meetingId: string;
  requestId: string;
  startsAt: string;
  recipientUserId: string | null;
  actor: ApiUser;
  traceId: string;
}): Promise<void> {
  if (!params.recipientUserId) return;

  const supabase = getSupabaseAdminClient();
  const startsAtMs = new Date(params.startsAt).getTime();
  const reminders = [
    { template: 'meeting_reminder_24h', offsetMs: 24 * 60 * 60 * 1000 },
    { template: 'meeting_reminder_2h', offsetMs: 2 * 60 * 60 * 1000 }
  ];

  for (const reminder of reminders) {
    const scheduledFor = new Date(startsAtMs - reminder.offsetMs).toISOString();
    const dedupeKey = `${params.meetingId}:${reminder.template}`;
    await supabase.from('notification_log').upsert(
      {
        entity_id: params.meetingId,
        recipient_user_id: params.recipientUserId,
        channel: 'telegram',
        template: reminder.template,
        scheduled_for: scheduledFor,
        status: 'pending',
        dedupe_key: dedupeKey,
        payload: { request_id: params.requestId, starts_at: params.startsAt },
        trace_id: params.traceId,
        created_by_agent_id: actorFromUser(params.actor)
      },
      { onConflict: 'dedupe_key' }
    );
  }
}
