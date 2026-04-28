# Web BETA - Agenda Reuniones Vecinos

Next.js App Router con:

- Login privado con Supabase Auth
- Dashboard operativo para solicitudes
- Cambio de estado con validación de workflow
- Agendado con sincronización a Google Calendar
- Telegram bidireccional (texto + voz con transcripción opcional)
- Recordatorios automáticos por Telegram (24h + 2h)

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run typecheck`
- `npm run qa`

## API Routes incluidas

- `GET /api/requests`
- `POST /api/requests`
- `PATCH /api/requests/:id`
- `PATCH /api/requests/:id/status`
- `POST /api/meetings/schedule`
- `GET /api/calendar/full`
- `GET /api/calendar/mine`
- `POST /api/telegram/identity` (admin)
- `POST /api/telegram/webhook`
- `GET /api/cron/reminders`
- `POST /api/observability/test-error` (solo admin, prueba controlada para Sentry)

## Requisito importante

La app usa `app_metadata.role` de Supabase Auth como fuente canonica de rol (`admin`, `referente`, `lider`, `usuario`).
Mientras se migra la beta, `user_metadata.role` queda como fallback legacy. En runtime, `referente` se normaliza a permisos de `lider`.
Si falta metadata, aplica fallback:
- `APP_ADMIN_EMAIL` => `admin`
- usuario permitido en `INTERNAL_ALLOWED_EMAILS` => `usuario`

## Contrato estricto de DB

No hay modo tolerante para columnas o tablas faltantes.
Antes de operar, aplicar migraciones completas de `db/` en Supabase.

## Modo privado (20 usuarios)

- Configurar `APP_ADMIN_EMAIL` para admin único.
- Configurar `INTERNAL_ALLOWED_EMAILS` con lista cerrada de usuarios internos.
