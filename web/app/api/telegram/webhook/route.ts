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
import { enforceRateLimit, logStructured, safeTraceId } from '../../../../lib/runtime-security';
import { withApiObservability } from '../../../../lib/api-observability';

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
