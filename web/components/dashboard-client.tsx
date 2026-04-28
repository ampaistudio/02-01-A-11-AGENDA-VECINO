'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';

const TOPIC_OPTIONS = [
  'Servicios públicos',
  'Seguridad',
  'Salud',
  'Educación',
  'Obras',
  'Empleo',
  'Otro'
] as const;

const LOCALITY_OPTIONS = ['Ushuaia', 'Tolhuin', 'Rio Grande', 'Puerto Almanza'] as const;

type RequestRow = {
  id: string;
  citizen_name: string;
  citizen_phone: string;
  topic: string;
  locality: string | null;
  neighborhood: string | null;
  reason: string;
  status: string;
  priority: number;
  preferred_datetime: string | null;
  created_at: string;
};

type MeetingRow = {
  id: string;
  request_id: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  sync_status: string;
  google_event_id: string | null;
    request?: {
      citizen_name: string;
      citizen_phone: string | null;
      topic: string;
      locality: string | null;
      neighborhood: string | null;
      status: string;
    } | null;
};

type BroadcastEvent = {
  id: string;
  title: string;
  details: string;
  starts_at: string;
  location: string | null;
};

function toIso(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

function toLocalDateTimeInput(iso: string): string {
  const dt = new Date(iso);
  const tzOffset = dt.getTimezoneOffset() * 60000;
  const local = new Date(dt.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
}

function addMinutesToLocalDateTime(localDateTime: string, minutes: number): string {
  if (!localDateTime) return '';
  const next = new Date(localDateTime);
  if (Number.isNaN(next.getTime())) return '';
  next.setMinutes(next.getMinutes() + minutes);
  const tzOffset = next.getTimezoneOffset() * 60000;
  return new Date(next.getTime() - tzOffset).toISOString().slice(0, 16);
}

function formatLocalDateTime(iso: string): string {
  return toLocalDateTimeInput(iso).replace('T', ' ');
}

function hasLocalSlotConflict(startsAt: string, endsAt: string, meetings: MeetingRow[]): boolean {
  if (!startsAt || !endsAt) return false;
  const starts = new Date(startsAt).getTime();
  const ends = new Date(endsAt).getTime();
  if (Number.isNaN(starts) || Number.isNaN(ends)) return false;
  const gapMs = 30 * 60 * 1000;
  return meetings.some((meeting) => {
    const existingStart = new Date(meeting.starts_at).getTime();
    const existingEnd = new Date(meeting.ends_at).getTime();
    return !(ends + gapMs <= existingStart || starts >= existingEnd + gapMs);
  });
}

function normalizePhoneInput(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return `+${cleaned.slice(1).replace(/\D/g, '')}`;
  }
  return cleaned.replace(/\D/g, '');
}

export function DashboardClient({
  canManageStatus,
  role
}: {
  canManageStatus: boolean;
  role: 'admin' | 'usuario' | 'lider';
}) {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [events, setEvents] = useState<BroadcastEvent[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [topicOption, setTopicOption] = useState<(typeof TOPIC_OPTIONS)[number]>('Servicios públicos');
  const [topicOther, setTopicOther] = useState('');
  const [locality, setLocality] = useState<(typeof LOCALITY_OPTIONS)[number]>('Ushuaia');
  const [neighborhood, setNeighborhood] = useState('');
  const [reason, setReason] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [availability, setAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    reason: string;
  }>({ checking: false, available: null, reason: '' });
  const [location, setLocation] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDetails, setEventDetails] = useState('');
  const [eventStartsAt, setEventStartsAt] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const isOps = role === 'admin' || role === 'lider';

  async function getAccessToken(): Promise<string> {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Sesión inválida');
    }
    return session.access_token;
  }

  async function loadRequests() {
    const token = await getAccessToken();
    const response = await fetch('/api/requests', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? 'No se pudo cargar solicitudes');
    }
    setRows(payload.data ?? []);
  }

  async function loadMeetings() {
    const token = await getAccessToken();
    const endpoint = isOps ? '/api/calendar/full' : '/api/calendar/mine';
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? 'No se pudo cargar calendario');
    }
    setMeetings(payload.data ?? []);
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadRequests(), loadMeetings(), loadEvents()]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents() {
    const token = await getAccessToken();
    const response = await fetch('/api/events', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? 'No se pudo cargar tablero de eventos');
    }
    setEvents(payload.data ?? []);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setEndsAt(addMinutesToLocalDateTime(startsAt, 30));
  }, [startsAt]);

  useEffect(() => {
    let active = true;

    async function checkAvailability() {
      if (!startsAt || !endsAt) {
        setAvailability({ checking: false, available: null, reason: '' });
        return;
      }

      setAvailability({ checking: true, available: null, reason: '' });
      try {
        const token = await getAccessToken();
        const response = await fetch('/api/calendar/availability', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            startsAt: toIso(startsAt),
            endsAt: toIso(endsAt)
          })
        });
        const payload = await response.json();
        if (!active) return;
        if (!response.ok) {
          throw new Error(payload.error ?? 'No se pudo revisar disponibilidad');
        }
        setAvailability({
          checking: false,
          available: Boolean(payload.available),
          reason: payload.reason ?? ''
        });
      } catch (e) {
        if (!active) return;
        setAvailability({ checking: false, available: false, reason: (e as Error).message });
      }
    }

    const timer = window.setTimeout(checkAvailability, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [startsAt, endsAt]);

  async function onCreateAndSchedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setOk('');

    if (availability.available === false) {
      setError(availability.reason || 'Ese horario no está disponible.');
      return;
    }

    try {
      const token = await getAccessToken();
      const response = await fetch('/api/meetings/unified', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          citizenName,
          citizenPhone,
          topicOption,
          topicOther,
          locality,
          neighborhood,
          reason,
          startsAt: toIso(startsAt),
          endsAt: toIso(endsAt),
          location
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'No se pudo crear y agendar');
      }

      setOk('Solicitud y reunión agendadas. Recordatorios programados para 24h y 2h antes.');
      setCitizenName('');
      setCitizenPhone('');
      setTopicOption('Servicios públicos');
      setTopicOther('');
      setLocality('Ushuaia');
      setNeighborhood('');
      setReason('');
      setStartsAt('');
      setEndsAt('');
      setLocation('');
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onCreateRequestOnly(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setOk('');

    if (startsAt && availability.available === false) {
      setError(availability.reason || 'Ese horario no está disponible.');
      return;
    }

    try {
      const token = await getAccessToken();
      const topic = topicOption === 'Otro' ? topicOther.trim() : topicOption;
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          citizenName,
          citizenPhone,
          topic,
          reason,
          locality,
          neighborhood,
          preferredDatetime: startsAt ? toIso(startsAt) : undefined
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'No se pudo crear solicitud');
      }
      setOk('Solicitud enviada. Queda pendiente de confirmación por TL o ADMIN.');
      setCitizenName('');
      setCitizenPhone('');
      setTopicOption('Servicios públicos');
      setTopicOther('');
      setLocality('Ushuaia');
      setNeighborhood('');
      setReason('');
      setStartsAt('');
      setEndsAt('');
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function onChangeStatus(id: string, status: string) {
    setError('');
    setOk('');
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/requests/${id}/status`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'No se pudo cambiar estado');
      }
      setOk('Estado actualizado');
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onCreateEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: eventTitle,
          details: eventDetails,
          startsAt: toIso(eventStartsAt),
          location: eventLocation
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'No se pudo crear evento de difusión');
      }
      setEventTitle('');
      setEventDetails('');
      setEventStartsAt('');
      setEventLocation('');
      setOk('Evento de difusión publicado.');
      await loadEvents();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const meetingsByDay = useMemo(() => {
    return meetings.reduce<Record<string, MeetingRow[]>>((acc, meeting) => {
      const key = meeting.starts_at.slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(meeting);
      return acc;
    }, {});
  }, [meetings]);

  const sortedDays = useMemo(() => Object.keys(meetingsByDay).sort(), [meetingsByDay]);
  const localSlotConflict = useMemo(
    () => hasLocalSlotConflict(startsAt, endsAt, meetings),
    [startsAt, endsAt, meetings]
  );
  const selectedDayMeetings = useMemo(() => {
    if (!startsAt) return [];
    const selectedDay = startsAt.slice(0, 10);
    return meetingsByDay[selectedDay] ?? [];
  }, [startsAt, meetingsByDay]);

  const canSubmitMeetingForm = Boolean(startsAt && endsAt && availability.available === true && !localSlotConflict);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      todayMeetings: meetings.filter(m => m.starts_at.startsWith(today)).length,
      pendingRequests: rows.filter(r => r.status === 'pending').length,
      activeEvents: events.length
    };
  }, [meetings, rows, events]);

  return (
    <div className="grid">
      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-value">{stats.todayMeetings}</span>
          <span className="stat-label">📅 Reuniones Hoy</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.pendingRequests}</span>
          <span className="stat-label">⏳ Pendientes</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.activeEvents}</span>
          <span className="stat-label">📢 Difusiones</span>
        </div>
      </div>

      <div className="dash-layout">
        {/* Left Column */}
        <div className="grid">
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button className="secondary" style={{ width: 'auto' }} type="button" onClick={onLogout}>
                Log Out
              </button>
            </div>
            <h2>{isOps ? 'Solicitud + Agenda (un solo paso)' : 'Nueva solicitud de reunión'}</h2>
            <p className="small">
              {isOps
                ? 'TL/ADMIN pueden crear solicitud y agendar en una sola acción.'
                : 'USUARIO solo crea solicitud y espera confirmación.'}
            </p>
            <form className="grid grid-2" onSubmit={isOps ? onCreateAndSchedule : onCreateRequestOnly}>
              <div className="row"><label>Nombre ciudadano</label><input value={citizenName} onChange={(e) => setCitizenName(e.target.value)} required /></div>
              <div className="row">
                <label>Teléfono (obligatorio)</label>
                <input
                  type="tel"
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(normalizePhoneInput(e.target.value))}
                  placeholder="+5492901123456"
                  pattern="^\+?[0-9]{10,15}$"
                  required
                />
              </div>
              <div className="row">
                <label>Tema</label>
                <select value={topicOption} onChange={(e) => setTopicOption(e.target.value as (typeof TOPIC_OPTIONS)[number])} required>
                  {TOPIC_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {topicOption === 'Otro' ? (
                <div className="row">
                  <label>Especificar tema</label>
                  <input value={topicOther} onChange={(e) => setTopicOther(e.target.value)} required />
                </div>
              ) : null}
              <div className="row">
                <label>Localidad</label>
                <select value={locality} onChange={(e) => setLocality(e.target.value as (typeof LOCALITY_OPTIONS)[number])} required>
                  {LOCALITY_OPTIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className="row">
                <label>Barrio</label>
                <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required />
              </div>
              <div className="row" style={{ gridColumn: '1 / -1' }}><label>Motivo</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} required /></div>
              <div className="row">
                <label>{isOps ? 'Fecha y hora de reunión' : 'Fecha y hora solicitada'}</label>
                <input
                  className="big-datetime"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                />
              </div>
              {startsAt ? (
                <div className="availability-panel" style={{ gridColumn: '1 / -1' }}>
                  <div>
                    <strong>Duración automática: 30 minutos</strong>
                    <p className="small">
                      {startsAt.replace('T', ' ')} a {endsAt ? endsAt.replace('T', ' ') : 'fin pendiente'}
                    </p>
                  </div>
                  {availability.checking ? <p className="small">Revisando calendario...</p> : null}
                  {!availability.checking && availability.available === true && !localSlotConflict ? (
                    <p className="success">Horario disponible.</p>
                  ) : null}
                  {!availability.checking && (availability.available === false || localSlotConflict) ? (
                    <p className="error">
                      {availability.reason ||
                        'Ese horario se superpone con otra reunión o no respeta el intervalo de 30 minutos.'}
                    </p>
                  ) : null}
                  <div className="grid">
                    <strong>Reuniones del día</strong>
                    {selectedDayMeetings.length === 0 ? <p className="small">No hay reuniones para ese día.</p> : null}
                    {selectedDayMeetings.map((meeting) => (
                      <div key={meeting.id} className="calendar-row">
                        <span>{formatLocalDateTime(meeting.starts_at)} a {formatLocalDateTime(meeting.ends_at)}</span>
                        <strong>{meeting.request?.citizen_name ?? 'Ciudadano'}</strong>
                        <span>{meeting.request?.topic ?? 'Sin tema'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {isOps ? (
                <div className="row" style={{ gridColumn: '1 / -1' }}><label>Ubicación</label><input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
              ) : null}
              <div style={{ gridColumn: '1 / -1' }}>
                <button type="submit" disabled={!canSubmitMeetingForm}>
                  {isOps ? 'Crear y agendar reunión' : 'Enviar solicitud'}
                </button>
              </div>
            </form>
          </section>

          <div className="grid grid-2">
            <section className="card">
              <h2>{isOps ? 'Calendario completo' : 'Mi calendario'}</h2>
              <p className="small">{isOps ? 'Vista completa para TL/ADMIN.' : 'Solo tus reuniones confirmadas.'}</p>
              {sortedDays.length === 0 ? <p className="small">Todavía no tenés reuniones agendadas.</p> : null}
              <div className="grid">
                {sortedDays.map((day) => (
                  <article key={day} className="card" style={{ padding: 14 }}>
                    <strong>{day}</strong>
                    <div className="grid" style={{ marginTop: 8 }}>
                      {meetingsByDay[day].map((meeting) => (
                        <div key={meeting.id} className="card meeting-item" style={{ padding: 10 }}>
                          <p><strong>{meeting.request?.citizen_name ?? 'Ciudadano'}</strong> - {meeting.request?.topic ?? 'Sin tema'}</p>
                          <p className="small">Tel: {meeting.request?.citizen_phone ?? 'Sin teléfono'}</p>
                          <p className="small">{meeting.request?.locality ?? 'Sin localidad'} / {meeting.request?.neighborhood ?? 'Sin barrio'}</p>
                          <p className="small">
                            {formatLocalDateTime(meeting.starts_at)} a {formatLocalDateTime(meeting.ends_at)}
                          </p>
                          <p className="small">Lugar: {meeting.location ?? 'Sin definir'} | Sync: {meeting.sync_status}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="card">
              <h2>Tablero de difusión</h2>
              <p className="small">Calendario general de eventos para todos los usuarios.</p>
              {(role === 'admin' || role === 'lider') ? (
                <form className="grid" onSubmit={onCreateEvent}>
                  <div className="row"><label>Título</label><input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required /></div>
                  <div className="row"><label>Detalle</label><textarea value={eventDetails} onChange={(e) => setEventDetails(e.target.value)} required /></div>
                  <div className="row"><label>Fecha y hora</label><input className="big-datetime" type="datetime-local" value={eventStartsAt} onChange={(e) => setEventStartsAt(e.target.value)} required /></div>
                  <div className="row"><label>Lugar</label><input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} /></div>
                  <button type="submit">Publicar evento</button>
                </form>
              ) : null}

              <div className="grid" style={{ marginTop: 12 }}>
                {events.map((ev) => (
                  <article key={ev.id} className="card meeting-item" style={{ padding: 12 }}>
                    <p><strong>{ev.title}</strong></p>
                    <p>{ev.details}</p>
                    <p className="small">{formatLocalDateTime(ev.starts_at)} | {ev.location ?? 'Sin lugar'}</p>
                  </article>
                ))}
                {events.length === 0 ? <p className="small">No hay eventos publicados.</p> : null}
              </div>
            </section>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="grid">
          <section className="card">
            <h2>Solicitudes Pendientes</h2>
            <p className="small">Gestión de turnos entrantes.</p>
            {loading ? <p className="small">Cargando...</p> : null}
            {error ? <p className="error">{error}</p> : null}
            {ok ? <p className="success">{ok}</p> : null}
            <div className="grid" style={{ marginTop: 10 }}>
              {rows.filter(r => r.status === 'pending' || isOps).map((r) => (
                <article key={r.id} className={`card meeting-item ${r.status === 'pending' ? 'request-card' : 'approved-card'}`} style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <strong>{r.citizen_name}</strong>
                    <span className="status-pill">{r.status}</span>
                  </div>
                  <p className="small">Tema: {r.topic}</p>
                  <p className="small">Tel: {r.citizen_phone}</p>
                  {r.preferred_datetime ? (
                    <p className="small"><strong>Sugerido:</strong> {formatLocalDateTime(r.preferred_datetime)}</p>
                  ) : null}
                  {canManageStatus && r.status === 'pending' ? (
                    <div className="grid" style={{ marginTop: 10, gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button className="secondary" style={{ fontSize: 11, padding: 6 }} type="button" onClick={() => onChangeStatus(r.id, 'approved')}>Aprobar</button>
                      <button className="secondary" style={{ fontSize: 11, padding: 6 }} type="button" onClick={() => onChangeStatus(r.id, 'rejected')}>Rechazar</button>
                    </div>
                  ) : null}
                </article>
              ))}
              {!rows.length && !loading ? <p className="small">No hay solicitudes nuevas.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
