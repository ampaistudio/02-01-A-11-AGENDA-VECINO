export type EventType = 'reunion' | 'llamado';

const EVENT_PREFIXES: Record<EventType, string> = {
  reunion: '[REUNION]',
  llamado: '[LLAMADO]'
};

export function normalizeEventType(value: string | null | undefined): EventType {
  return value === 'llamado' ? 'llamado' : 'reunion';
}

export function encodeReasonWithEventType(reason: string, eventType: EventType): string {
  const cleanReason = stripEventTypePrefix(reason).trim();
  return `${EVENT_PREFIXES[eventType]} ${cleanReason}`.trim();
}

export function stripEventTypePrefix(reason: string | null | undefined): string {
  const source = reason ?? '';
  return source.replace(/^\[(REUNION|LLAMADO)\]\s*/i, '');
}

export function inferEventTypeFromReason(reason: string | null | undefined): EventType {
  const source = (reason ?? '').toUpperCase();
  if (source.startsWith(EVENT_PREFIXES.llamado)) return 'llamado';
  return 'reunion';
}

export function getEventTypeLabel(eventType: EventType): string {
  return eventType === 'llamado' ? 'Llamado' : 'Reunión';
}

export function getEventTypeLocationFallback(eventType: EventType): string {
  return eventType === 'llamado' ? 'Llamado telefónico' : 'Sin definir';
}
