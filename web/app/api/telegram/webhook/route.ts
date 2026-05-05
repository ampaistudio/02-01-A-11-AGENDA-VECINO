import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import {
  getTelegramFileBuffer,
  resolveTelegramRoleByUserId,
  sendTelegramMessage,
  transcribeAudioIfConfigured,
  uploadVoiceNoteToStorage,
  verifyTelegramWebhookSecret
} from '../../../../lib/telegram';
import { createGoogleEvent } from '../../../../lib/google-calendar';
import { queueMeetingReminderNotifications } from '../../../../lib/notifications';
import { assertMeetingSlotAvailable } from '../../../../lib/meeting-slot';
import { enforceRateLimit, logStructured, safeTraceId } from '../../../../lib/runtime-security';
import { withApiObservability } from '../../../../lib/api-observability';
import { actorFromUser } from '../../../../lib/permissions';
import { encodeReasonWithEventType, getEventTypeLabel, getEventTypeLocationFallback, normalizeEventType, type EventType } from '../../../../lib/event-type';
import { parseTelegramAgendaMessage, type ParsedTelegramAgenda } from '../../../../lib/telegram-parser';

type TelegramUpdate = {
  message?: {
    message_id?: number;
    text?: string;
    caption?: string;
    voice?: { file_id: string };
    from?: { id?: number; username?: string };
    chat?: { id?: number };
  };
};

function parseEntityReference(text: string | null | undefined): { requestId: string | null; meetingId: string | null } {
  const source = text ?? '';
  const requestMatch = source.match(/#request:([0-9a-fA-F-]{36})/);
  const meetingMatch = source.match(/#meeting:([0-9a-fA-F-]{36})/);
  return {
    requestId: requestMatch?.[1] ?? null,
    meetingId: meetingMatch?.[1] ?? null
  };
}

function isCalendarLoadIntent(text: string | null | undefined): boolean {
  const source = (text ?? '').toLowerCase();
  if (!source) return false;
  if (source.includes('#request:') || source.includes('#meeting:')) return true;
  return /(evento|reunion|reunión|llamado|recordatorio|agenda|calendario)/i.test(source);
}

// Parser implementation moved to web/lib/telegram-parser.ts

export const POST = withApiObservability('api.telegram.webhook.post', async (request: NextRequest) => {
  const rate = enforceRateLimit({
    key: `telegram-webhook:${request.headers.get('x-forwarded-for') ?? 'unknown'}`,
    limit: 120,
    windowMs: 60_000,
    message: 'Telegram webhook rate limit exceeded'
  });
  if (rate) return rate;

  const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
  if (!verifyTelegramWebhookSecret(secretHeader)) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;
  const chatId = message?.chat?.id ? String(message.chat.id) : null;
  if (!message || !chatId) {
    return NextResponse.json({ ok: true });
  }

  const traceId = safeTraceId(request.headers.get('x-trace-id'));
  const supabase = getSupabaseAdminClient();

  const identity = await supabase
    .from('telegram_identity')
    .select('user_id')
    .eq('chat_id', chatId)
    .eq('active', true)
    .maybeSingle();

  if (identity.error || !identity.data?.user_id) {
    logStructured('telegram_identity_not_found', { chatId, traceId });
    return NextResponse.json({ ok: true });
  }

  const userId = identity.data.user_id;
  const text = message.text?.trim() || null;
  const caption = message.caption?.trim() || null;
  const fullText = text ?? caption;
  const role = await resolveTelegramRoleByUserId(userId);

  if (role === 'usuario') {
    await sendTelegramMessage(chatId, 'Canal solo informativo: este Telegram es solo para recibir notificaciones.');
    await supabase.from('audit_log').insert({
      entity_name: 'telegram_webhook',
      entity_id: null,
      action: 'inbound_rejected_readonly_user',
      payload: { reason: 'readonly_channel', role },
      actor_user_id: null,
      actor_agent_id: `supabase-auth:${userId}`,
      trace_id: traceId
    });
    return NextResponse.json({ ok: true });
  }

  const refs = parseEntityReference(text ?? caption);

  if (!refs.requestId && !refs.meetingId) {
    await sendTelegramMessage(
      chatId,
      'Recibido. Para guardar una nota en la app, incluye #request:<uuid> o #meeting:<uuid> en el mensaje.'
    );
    await supabase.from('audit_log').insert({
      entity_name: 'telegram_webhook',
      entity_id: null,
      action: 'inbound_without_reference',
      payload: { role, has_text: Boolean(fullText), has_voice: Boolean(message.voice?.file_id) },
      actor_user_id: null,
      actor_agent_id: `supabase-auth:${userId}`,
      trace_id: traceId
    });
    return NextResponse.json({ ok: true });
  }

  if (isCalendarLoadIntent(fullText) && role !== 'admin' && role !== 'lider') {
    await sendTelegramMessage(
      chatId,
      'No autorizado: solo TL o ADMIN pueden cargar eventos, reuniones, llamados o recordatorios por Telegram.'
    );
    await supabase.from('audit_log').insert({
      entity_name: 'telegram_webhook',
      entity_id: null,
      action: 'calendar_intent_rejected',
      payload: { reason: 'role_forbidden', role, request_id: refs.requestId, meeting_id: refs.meetingId },
      actor_user_id: null,
      actor_agent_id: `supabase-auth:${userId}`,
      trace_id: traceId
    });
    return NextResponse.json({ ok: true });
  }

  let audioUrl: string | null = null;
  let transcript: string | null = null;

  if (message.voice?.file_id) {
    const telegramFile = await getTelegramFileBuffer(message.voice.file_id);
    if (telegramFile) {
      audioUrl = await uploadVoiceNoteToStorage({
        chatId,
        filePath: telegramFile.filePath,
        content: telegramFile.buffer
      });
      transcript = await transcribeAudioIfConfigured({
        filename: telegramFile.filePath.split('/').pop() ?? 'voice.ogg',
        buffer: telegramFile.buffer,
        mimeType: 'audio/ogg'
      });
    }
  }

  const noteText = text ?? caption ?? transcript ?? '[voice_note]';
  const parsedAgenda = parseTelegramAgendaMessage(noteText);

  if (parsedAgenda && (role === 'admin' || role === 'lider')) {
    try {
      await assertMeetingSlotAvailable(parsedAgenda.startsAt, parsedAgenda.endsAt);
    } catch (error) {
      await sendTelegramMessage(chatId, `No pude agendar ${getEventTypeLabel(parsedAgenda.eventType).toLowerCase()}: ${(error as Error).message}`);
      return NextResponse.json({ ok: true });
    }

    const actor = actorFromUser({ id: userId });
    const topic = getEventTypeLabel(parsedAgenda.eventType);
    const locality = parsedAgenda.locality ?? 'Ushuaia';
    const neighborhood = locality;

    const requestInsert = await supabase
      .from('citizen_request')
      .insert({
        citizen_name: parsedAgenda.citizenName,
        citizen_phone: null,
        topic,
        topic_option: topic,
        topic_other: null,
        locality,
        neighborhood,
        reason: encodeReasonWithEventType(parsedAgenda.detail ? `${parsedAgenda.reason}\nDetalle: ${parsedAgenda.detail}` : parsedAgenda.reason, parsedAgenda.eventType),
        priority: 3,
        status: 'scheduled',
        created_by_user_id: null,
        created_by_agent_id: actor,
        updated_by_user_id: null,
        updated_by_agent_id: actor,
        trace_id: traceId
      })
      .select('id, citizen_name, citizen_phone, topic, locality, neighborhood, reason')
      .single();

    if (requestInsert.error || !requestInsert.data) {
      return NextResponse.json({ error: requestInsert.error?.message ?? 'No se pudo crear solicitud desde Telegram.' }, { status: 500 });
    }

    let googleEventId: string | null = null;
    let syncStatus = 'pending';

    try {
      googleEventId = await createGoogleEvent({
        summary: `${getEventTypeLabel(parsedAgenda.eventType)} con ${parsedAgenda.citizenName}`,
        description: `${getEventTypeLabel(parsedAgenda.eventType)}\nTema: ${parsedAgenda.reason}${parsedAgenda.detail ? `\nDetalle: ${parsedAgenda.detail}` : ''}\n\nTexto original:\n${parsedAgenda.originalText}`,
        startsAt: parsedAgenda.startsAt,
        endsAt: parsedAgenda.endsAt,
        location: parsedAgenda.location ?? getEventTypeLocationFallback(parsedAgenda.eventType)
      });
      syncStatus = 'synced';
    } catch {
      syncStatus = 'failed';
    }

    const meetingInsert = await supabase
      .from('meeting')
      .insert({
        request_id: requestInsert.data.id,
        starts_at: parsedAgenda.startsAt,
        ends_at: parsedAgenda.endsAt,
        location: parsedAgenda.location ?? getEventTypeLocationFallback(parsedAgenda.eventType),
        google_event_id: googleEventId,
        sync_status: syncStatus,
        created_by_user_id: null,
        created_by_agent_id: actor,
        trace_id: traceId
      })
      .select('id')
      .single();

    if (meetingInsert.error || !meetingInsert.data) {
      return NextResponse.json({ error: meetingInsert.error?.message ?? 'No se pudo crear evento desde Telegram.' }, { status: 500 });
    }

    await supabase.from('meeting_registry').insert({
      request_id: requestInsert.data.id,
      requester_name: requestInsert.data.citizen_name,
      requester_phone: requestInsert.data.citizen_phone ?? '',
      topic: requestInsert.data.topic,
      locality: requestInsert.data.locality,
      neighborhood: requestInsert.data.neighborhood,
      starts_at: parsedAgenda.startsAt,
      ends_at: parsedAgenda.endsAt,
      location: parsedAgenda.location ?? getEventTypeLocationFallback(parsedAgenda.eventType),
      status: 'scheduled',
      created_by_agent_id: actor
    });

    await queueMeetingReminderNotifications({
      meetingId: meetingInsert.data.id,
      requestId: requestInsert.data.id,
      startsAt: parsedAgenda.startsAt,
      recipientUserId: userId,
      actor: { id: userId, email: '', role, sourceRole: role },
      traceId
    });

    await supabase.from('audit_log').insert([
      {
        entity_name: 'citizen_request',
        entity_id: requestInsert.data.id,
        action: 'create_from_telegram_agenda',
        payload: { event_type: parsedAgenda.eventType, source: 'telegram', sync_status: syncStatus },
        actor_user_id: null,
        actor_agent_id: actor,
        trace_id: traceId
      },
      {
        entity_name: 'meeting',
        entity_id: meetingInsert.data.id,
        action: 'schedule_from_telegram_agenda',
        payload: { event_type: parsedAgenda.eventType, google_event_id: googleEventId, sync_status: syncStatus },
        actor_user_id: null,
        actor_agent_id: actor,
        trace_id: traceId
      }
    ]);

    await sendTelegramMessage(
      chatId,
      `${getEventTypeLabel(parsedAgenda.eventType)} agendado.\n${parsedAgenda.citizenName}\n${parsedAgenda.startsAt}\n${parsedAgenda.location ?? getEventTypeLocationFallback(parsedAgenda.eventType)}`
    );

    return NextResponse.json({ ok: true, created: 'scheduled_from_telegram' });
  }

  const insert = await supabase.from('meeting_note').insert({
    request_id: refs.requestId,
    meeting_id: refs.meetingId,
    author_user_id: userId,
    channel: 'telegram',
    text: noteText,
    audio_url: audioUrl,
    transcript,
    trace_id: traceId,
    metadata: {
      telegram_message_id: message.message_id,
      telegram_from_id: message.from?.id,
      telegram_username: message.from?.username ?? null
    }
  });

  if (insert.error) {
    return NextResponse.json({ error: insert.error.message }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    entity_name: 'meeting_note',
    entity_id: null,
    action: 'create_from_telegram',
    payload: {
      has_audio: Boolean(audioUrl),
      has_transcript: Boolean(transcript),
      request_id: refs.requestId,
      meeting_id: refs.meetingId
    },
    actor_user_id: null,
    actor_agent_id: `supabase-auth:${userId}`,
    trace_id: traceId
  });

  return NextResponse.json({ ok: true });
});
