import { google } from 'googleapis';

export type GoogleCalendarAuditCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

export type GoogleCalendarAuditResult = {
  configured: boolean;
  ready: boolean;
  scope: string;
  calendarId: string | null;
  serviceAccountEmail: string | null;
  checks: GoogleCalendarAuditCheck[];
};

type GoogleCalendarConfig = {
  calendarId: string | null;
  serviceEmail: string | null;
  privateKey: string | null;
};

function normalizeEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getGoogleCalendarConfig(): GoogleCalendarConfig {
  const privateKey = normalizeEnv(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)?.replace(/\\n/g, '\n') ?? null;

  return {
    calendarId: normalizeEnv(process.env.GOOGLE_CALENDAR_ID),
    serviceEmail: normalizeEnv(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    privateKey
  };
}

function buildGoogleJwt(config: GoogleCalendarConfig): InstanceType<typeof google.auth.JWT> {
  if (!config.calendarId || !config.serviceEmail || !config.privateKey) {
    throw new Error('Google Calendar env vars missing');
  }

  return new google.auth.JWT({
    email: config.serviceEmail,
    key: config.privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar']
  });
}

export function auditGoogleCalendarConfig(): GoogleCalendarAuditResult {
  const config = getGoogleCalendarConfig();
  const checks: GoogleCalendarAuditCheck[] = [
    {
      name: 'calendar_id',
      ok: Boolean(config.calendarId),
      detail: config.calendarId ? 'GOOGLE_CALENDAR_ID configurado.' : 'Falta GOOGLE_CALENDAR_ID.'
    },
    {
      name: 'service_account_email',
      ok: Boolean(config.serviceEmail && config.serviceEmail.includes('@')),
      detail: config.serviceEmail
        ? 'GOOGLE_SERVICE_ACCOUNT_EMAIL configurado.'
        : 'Falta GOOGLE_SERVICE_ACCOUNT_EMAIL.'
    },
    {
      name: 'private_key_present',
      ok: Boolean(config.privateKey),
      detail: config.privateKey
        ? 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY configurada.'
        : 'Falta GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.'
    },
    {
      name: 'private_key_format',
      ok: Boolean(
        config.privateKey &&
          config.privateKey.includes('BEGIN PRIVATE KEY') &&
          config.privateKey.includes('END PRIVATE KEY')
      ),
      detail:
        config.privateKey && config.privateKey.includes('BEGIN PRIVATE KEY') && config.privateKey.includes('END PRIVATE KEY')
          ? 'La private key tiene encabezado y pie válidos.'
          : 'La private key no tiene el formato PEM esperado.'
    }
  ];

  return {
    configured: checks.every((check) => check.ok),
    ready: false,
    scope: 'https://www.googleapis.com/auth/calendar',
    calendarId: config.calendarId,
    serviceAccountEmail: config.serviceEmail,
    checks
  };
}

export async function verifyGoogleCalendarAccess(): Promise<GoogleCalendarAuditResult> {
  const audit = auditGoogleCalendarConfig();
  if (!audit.configured) {
    return audit;
  }

  const config = getGoogleCalendarConfig();
  const auth = buildGoogleJwt(config);
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await auth.authorize();
    await calendar.calendars.get({ calendarId: config.calendarId! });

    return {
      ...audit,
      ready: true,
      checks: [
        ...audit.checks,
        {
          name: 'service_account_auth',
          ok: true,
          detail: 'La Service Account autenticó correctamente.'
        },
        {
          name: 'calendar_access',
          ok: true,
          detail: 'La Service Account puede leer el calendario configurado.'
        }
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo verificar acceso con Google Calendar.';
    const lower = message.toLowerCase();
    let detail = message;

    if (lower.includes('insufficient') || lower.includes('permission') || lower.includes('forbidden')) {
      detail = 'La Service Account autenticó pero no tiene permisos suficientes sobre el calendario compartido.';
    } else if (lower.includes('not found')) {
      detail = 'El GOOGLE_CALENDAR_ID no existe o no fue compartido con la Service Account.';
    } else if (lower.includes('invalid grant')) {
      detail = 'La private key o la Service Account no son válidas para autenticar.';
    }

    return {
      ...audit,
      ready: false,
      checks: [
        ...audit.checks,
        {
          name: 'service_account_access',
          ok: false,
          detail
        }
      ]
    };
  }
}

export async function createGoogleEvent(params: {
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location?: string;
}): Promise<string> {
  const config = getGoogleCalendarConfig();
  const auth = buildGoogleJwt(config);

  const calendar = google.calendar({ version: 'v3', auth });
  const response = await calendar.events.insert({
    calendarId: config.calendarId!,
    requestBody: {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: { dateTime: params.startsAt },
      end: { dateTime: params.endsAt },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 120 },
          { method: 'popup', minutes: 120 }
        ]
      }
    }
  });

  if (!response.data.id) {
    throw new Error('Google Calendar did not return event id');
  }

  return response.data.id;
}

export async function checkGoogleCalendarCollision(startsAt: string, endsAt: string): Promise<boolean> {
  const config = getGoogleCalendarConfig();
  if (!config.calendarId || !config.serviceEmail || !config.privateKey) return false;

  const auth = buildGoogleJwt(config);
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.events.list({
    calendarId: config.calendarId,
    timeMin: startsAt,
    timeMax: endsAt,
    singleEvents: true
  });

  return (response.data.items?.length ?? 0) > 0;
}

