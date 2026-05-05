# Auditoría de Base de Datos - Agenda Reuniones Vecinos

Este documento contiene la ingeniería inversa del esquema de base de datos actual (Supabase/PostgreSQL) basada en la lógica de la aplicación.

## 1. Tablas Principales

### `citizen_request` (Solicitudes de Ciudadanos)
Centraliza los pedidos de reuniones o llamados.
- `id`: uuid (PK)
- `citizen_name`: text
- `citizen_phone`: text (nullable)
- `topic`: text
- `topic_option`: text (categoría seleccionada)
- `topic_other`: text (nullable)
- `locality`: text
- `neighborhood`: text
- `reason`: text (codificado con prefijos [REUNION] o [LLAMADO])
- `priority`: integer
- `status`: text (pending_leader, approved, scheduled, completed, rejected)
- `created_at`: timestamp
- `created_by_user_id`: uuid (FK auth.users, nullable)
- `created_by_agent_id`: text (formato `supabase-auth:uuid`)
- `updated_at`: timestamp
- `updated_by_user_id`: uuid (FK auth.users, nullable)
- `updated_by_agent_id`: text
- `trace_id`: uuid

### `meeting` (Reuniones/Eventos Agendados)
Vincula una solicitud con un evento real en el calendario.
- `id`: uuid (PK)
- `request_id`: uuid (FK citizen_request)
- `starts_at`: timestamp
- `ends_at`: timestamp
- `location`: text
- `google_event_id`: text (nullable, ID del evento en GCalendar)
- `sync_status`: text (pending, synced, failed)
- `created_at`: timestamp
- `created_by_user_id`: uuid (FK auth.users, nullable)
- `created_by_agent_id`: text
- `trace_id`: uuid

### `meeting_registry` (Registro Unificado de Reuniones)
Vista plana de reuniones para reportes rápidos (Kaizen: Duplica datos de solicitudes).
- `request_id`: uuid (PK)
- `requester_name`: text
- `requester_phone`: text
- `topic`: text
- `locality`: text
- `neighborhood`: text
- `starts_at`: timestamp
- `ends_at`: timestamp
- `location`: text
- `status`: text
- `created_by_agent_id`: text

### `meeting_note` (Notas y Notas de Voz)
Almacena transcripciones y referencias a archivos de audio.
- `id`: uuid (PK)
- `request_id`: uuid (FK citizen_request, nullable)
- `meeting_id`: uuid (FK meeting, nullable)
- `author_user_id`: uuid (FK auth.users)
- `channel`: text (ej: 'telegram')
- `text`: text (contenido de la nota o transcripción)
- `audio_url`: text (URL pública en Storage)
- `transcript`: text (nullable)
- `metadata`: jsonb (datos del mensaje de Telegram: ID, username)
- `created_at`: timestamp
- `trace_id`: uuid

## 2. Tablas Auxiliares

### `telegram_identity` (Identidad Digital)
Vincula usuarios de Supabase con chats de Telegram.
- `chat_id`: text (PK)
- `user_id`: uuid (FK auth.users)
- `active`: boolean
- `created_at`: timestamp

### `audit_log` (Trazabilidad)
Registro de auditoría para todas las acciones sensibles.
- `id`: uuid (PK)
- `entity_name`: text
- `entity_id`: uuid (nullable)
- `action`: text
- `payload`: jsonb
- `actor_user_id`: uuid (nullable)
- `actor_agent_id`: text
- `trace_id`: uuid
- `created_at`: timestamp

### `broadcast_event` (Difusión)
Eventos públicos de interés vecinal.
- `id`: uuid (PK)
- `title`: text
- `starts_at`: timestamp
- `location`: text
- `created_at`: timestamp

## 3. Observaciones y Recomendaciones

1. **Integridad Referencial**: Se recomienda asegurar que el borrado de una `citizen_request` maneje en cascada o restrinja los registros en `meeting` y `meeting_note`.
2. **Denormalización**: `meeting_registry` es útil para performance de reportes, pero requiere triggers o lógica de aplicación estricta para no quedar desincronizada si cambia el nombre del ciudadano en la tabla raíz.
3. **Seguridad (RLS)**: Actualmente la aplicación usa el `service_role` (Admin Client) para la mayoría de las operaciones, lo que delega la seguridad totalmente a Next.js. Se recomienda implementar RLS a nivel DB para mayor robustez ("defense in depth").
4. **Índices**: Se sugiere asegurar índices en `starts_at` (meeting) y `status` (citizen_request) para optimizar los paneles del Dashboard.
