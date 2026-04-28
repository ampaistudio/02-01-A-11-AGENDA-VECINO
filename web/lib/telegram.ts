import { getSupabaseAdminClient } from './supabase-admin';
import { getTrustedSupabaseRole, resolveRoleByEmailAndMetadata } from './roles';
import { logStructured } from './runtime-security';

const TELEGRAM_API_BASE = 'https://api.telegram.org';
export type TelegramRole = 'admin' | 'lider' | 'usuario';

export function verifyTelegramWebhookSecret(headerValue: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) {
    logStructured('telegram_webhook_secret_missing', {});
    return false;
  }
  return Boolean(headerValue && headerValue === expected);
}

export async function sendTelegramMessage(chatId: string | null | undefined, text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !chatId) return false;

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  if (!response.ok) {
    logStructured('telegram_send_failed', { status: response.status });
    return false;
  }

  return true;
}

export async function getTelegramFileBuffer(fileId: string): Promise<{ buffer: Buffer; filePath: string } | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  const fileResp = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!fileResp.ok) return null;

  const fileJson = (await fileResp.json()) as { ok: boolean; result?: { file_path?: string } };
  const filePath = fileJson.result?.file_path;
  if (!fileJson.ok || !filePath) return null;

  const download = await fetch(`${TELEGRAM_API_BASE}/file/bot${botToken}/${filePath}`);
  if (!download.ok) return null;

  const arr = await download.arrayBuffer();
  return { buffer: Buffer.from(arr), filePath };
}

export async function transcribeAudioIfConfigured(params: {
  filename: string;
  buffer: Buffer;
  mimeType?: string;
}): Promise<string | null> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) return null;

  const form = new FormData();
  const blob = new Blob([new Uint8Array(params.buffer)], { type: params.mimeType ?? 'audio/ogg' });
  form.append('file', blob, params.filename);
  form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL ?? 'gpt-4o-mini-transcribe');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`
    },
    body: form
  });

  if (!response.ok) {
    logStructured('transcription_failed', { status: response.status });
    return null;
  }

  const json = (await response.json()) as { text?: string };
  return json.text?.trim() ?? null;
}

export async function uploadVoiceNoteToStorage(params: {
  chatId: string;
  filePath: string;
  content: Buffer;
}): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const bucket = process.env.SUPABASE_TELEGRAM_BUCKET ?? 'telegram-voice-notes';
  const path = `chat-${params.chatId}/${Date.now()}-${params.filePath.split('/').pop() ?? 'voice.ogg'}`;

  const upload = await supabase.storage.from(bucket).upload(path, params.content, {
    contentType: 'audio/ogg',
    upsert: false
  });

  if (upload.error) {
    logStructured('telegram_voice_upload_failed', { error: upload.error.message, bucket });
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function findChatIdByUserId(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const identity = await supabase
    .from('telegram_identity')
    .select('chat_id')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (identity.data?.chat_id) return identity.data.chat_id;

  const legacy = await supabase.auth.admin.getUserById(userId);
  const metadata = legacy.data.user?.user_metadata?.telegram_chat_id;
  return typeof metadata === 'string' && metadata.trim() ? metadata.trim() : null;
}

export async function resolveTelegramRoleByUserId(userId: string): Promise<TelegramRole> {
  const supabase = getSupabaseAdminClient();
  const lookup = await supabase.auth.admin.getUserById(userId);
  const user = lookup.data.user;
  if (!user?.email) return 'usuario';

  return resolveRoleByEmailAndMetadata({
    email: user.email,
    adminEmail: process.env.APP_ADMIN_EMAIL,
    rawRole: getTrustedSupabaseRole(user)
  });
}
