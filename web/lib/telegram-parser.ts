import { normalizeEventType, type EventType, getEventTypeLocationFallback } from './event-type';

export type ParsedTelegramAgenda = {
  eventType: EventType;
  startsAt: string;
  endsAt: string;
  citizenName: string;
  locality: string | null;
  location: string | null;
  reason: string;
  detail: string | null;
  originalText: string;
};

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12
};

const KNOWN_LOCALITIES = ['Ushuaia', 'Tolhuin', 'Rio Grande', 'Puerto Almanza'] as const;

function normalizeSourceText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
}

function parseArgentineDate(day: number, monthText: string, hour: number, minute: number): { startsAt: string; endsAt: string } | null {
  const month = MONTHS[monthText.toLowerCase()];
  if (!month) return null;
  const now = new Date();
  let year = now.getUTCFullYear();
  const candidate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`);
  if (candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
    year += 1;
  }
  const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`);
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + 30);
  return { startsAt: startDate.toISOString(), endsAt: endDate.toISOString() };
}

function inferLocalityFromLocation(location: string | null): string | null {
  if (!location) return null;
  const normalized = location.toLowerCase();
  const found = KNOWN_LOCALITIES.find((candidate) => normalized.startsWith(candidate.toLowerCase()));
  return found ?? null;
}

export function parseTelegramAgendaMessage(input: string | null | undefined): ParsedTelegramAgenda | null {
  if (!input) return null;
  const source = input.trim();
  if (!source.startsWith('#')) return null;

  // Intentar parseo multilínea primero
  const lines = source.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    const tag = lines[0].substring(1).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const eventType = normalizeEventType(tag);
    
    const data: Record<string, string> = {};
    lines.slice(1).forEach(line => {
      const firstColon = line.indexOf(':');
      if (firstColon !== -1) {
        const key = line.substring(0, firstColon).trim().toLowerCase();
        const value = line.substring(firstColon + 1).trim();
        data[key] = value;
      }
    });

    if (data.fecha && data.hora && data.persona) {
      const fechaMatch = data.fecha.match(/(\d{1,2})\s+([A-Za-záéíóúñ]+)/i);
      const horaMatch = data.hora.match(/(\d{1,2})(?::(\d{2}))?/);
      
      if (fechaMatch && horaMatch) {
        const day = parseInt(fechaMatch[1]);
        const monthText = fechaMatch[2];
        const hour = parseInt(horaMatch[1]);
        const minute = horaMatch[2] ? parseInt(horaMatch[2]) : 0;
        
        const parsedDate = parseArgentineDate(day, monthText, hour, minute);
        if (parsedDate) {
          const citizenName = data.persona;
          const location = data.lugar || (eventType === 'llamado' ? getEventTypeLocationFallback(eventType) : null);
          const locality = data.lugar ? inferLocalityFromLocation(data.lugar) : (eventType === 'llamado' ? data.lugar : null);

          return {
            eventType,
            startsAt: parsedDate.startsAt,
            endsAt: parsedDate.endsAt,
            citizenName,
            locality: locality || (eventType === 'llamado' ? data.lugar || null : null),
            location,
            reason: data.tema || source,
            detail: data.detalle || null,
            originalText: source
          };
        }
      }
    }
  }

  // Fallback al formato de línea única original
  const normalized = normalizeSourceText(source);
  const match = normalized.match(/^#(llamado|reunion|reunión)\s+(\d{1,2})\s+([A-Za-záéíóúñ]+)\s+(\d{1,2})(?::(\d{2}))?\s*(hs?)?\s+(.+)$/i);
  if (!match) return null;

  const eventType = normalizeEventType(match[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const day = Number(match[2]);
  const monthText = match[3];
  const hour = Number(match[4]);
  const minute = match[5] ? Number(match[5]) : 0;
  const rest = match[7]?.trim() ?? '';
  const parsedDate = parseArgentineDate(day, monthText, hour, minute);
  if (!parsedDate || !rest) return null;

  let citizenName = rest;
  let locality: string | null = null;
  let location: string | null = null;

  if (eventType === 'llamado') {
    const localMatch = rest.match(/^(.*?)\s+Local\s+(.+)$/i);
    if (localMatch) {
      citizenName = localMatch[1]?.trim() ?? '';
      locality = localMatch[2]?.trim() ?? null;
      location = getEventTypeLocationFallback(eventType);
    } else {
      citizenName = rest;
      location = getEventTypeLocationFallback(eventType);
    }
  } else {
    const placeMatch = rest.match(/^(.*?)\s+Lugar\s+(.+)$/i);
    if (placeMatch) {
      citizenName = placeMatch[1]?.trim() ?? '';
      location = placeMatch[2]?.trim() ?? null;
      locality = inferLocalityFromLocation(location);
    } else {
      citizenName = rest;
      location = null;
    }
  }

  return {
    eventType,
    startsAt: parsedDate.startsAt,
    endsAt: parsedDate.endsAt,
    citizenName,
    locality,
    location,
    reason: normalized,
    detail: null,
    originalText: source
  };
}
