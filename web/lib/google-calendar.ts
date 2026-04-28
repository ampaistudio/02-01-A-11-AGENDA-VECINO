import { google } from 'googleapis';

export async function createGoogleEvent(params: {
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location?: string;
}): Promise<string> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!calendarId || !serviceEmail || !privateKey) {
    throw new Error('Google Calendar env vars missing');
  }

  const auth = new google.auth.JWT({
    email: serviceEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar']
  });

  const calendar = google.calendar({ version: 'v3', auth });
  const response = await calendar.events.insert({
    calendarId,
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
