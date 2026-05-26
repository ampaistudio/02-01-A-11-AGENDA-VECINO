AUDITORÍA TOTAL — APP AGENDA VECINOS
Fecha: 2026-05-25
Archivos auditados: 73
Auditor: Codex (GPT-5)

RESUMEN EJECUTIVO
Críticos: 1
Altos: 2
Medios: 6
Bajos: 4

PROBLEMAS CRÍTICOS (bloquean producción)
[CRITICO-001] Archivos de entorno sensibles versionados en Git

Archivo: web/.env.vercel.local, web/.env.vercel.production, web/.env.vercel.test
Problema: archivos de entorno operativos estaban incluidos en el índice Git.
Riesgo: exposición de credenciales y acceso no autorizado a proveedores externos.
Fix: aplicado. Se removieron del índice (`git rm --cached`) y se agregaron reglas de ignore en `.gitignore`.

PROBLEMAS ALTO (corregir antes de próxima OLA)
[ALTO-001] Pendiente real desalineado con estado de repo
Archivo: ops/PENDIENTES.md
Problema: figuraba pendiente de limpiar `web/.env.vercel.test` y el riesgo era mayor (también `.local` y `.production`).
Riesgo: falsa sensación de cierre parcial y continuidad de exposición.
Fix: aplicado en código (untrack + ignore). Recomendado actualizar pendiente en próxima sesión de cierre formal.

[ALTO-002] Logging de error en runtime con `console.error` en flujo core de agenda
Archivo: web/lib/meeting-slot.ts
Problema: uso directo de consola en validación de colisión de Google Calendar.
Riesgo: ruido operacional, trazabilidad inconsistente, y menor calidad de observabilidad.
Fix: aplicado. Se reemplazó por `logStructured('calendar_collision_check_failed', ...)`.

PROBLEMAS MEDIO (backlog prioritario)
[MEDIO-001] Archivo monolítico por encima del umbral
Archivo: web/components/dashboard-client.tsx (823 líneas)
Problema: exceso de tamaño.
Riesgo: mantenibilidad baja y mayor riesgo de regresiones.
Fix: dividir por dominio visual/funcional en subcomponentes.

[MEDIO-002] Color hardcodeado puntual
Archivo: web/app/layout.tsx
Problema: `themeColor` literal hex.
Riesgo: inconsistencia con sistema de tokens.
Fix: mover a token/constante centralizada.

[MEDIO-003] No hay carpeta `supabase/migrations` en este repo
Archivo: estructura del proyecto
Problema: no se puede ejecutar checklist completo de migraciones del template.
Riesgo: trazabilidad DB incompleta para auditoría formal.
Fix: definir fuente canónica de esquema (si aplica repo externo o gestión administrada).

[MEDIO-004] `npx supabase migration list` no ejecutable por falta de link
Archivo: configuración Supabase CLI
Problema: error `Cannot find project ref. Have you run supabase link?`
Riesgo: no se valida alineación local/remoto.
Fix: correr `supabase link` con project ref interno y repetir auditoría DB.

[MEDIO-005] Scripts de test-user con `console.*`
Archivo: backend/src/create_test_user.ts, backend/src/create_test_user.js
Problema: logging de consola sin patrón único.
Riesgo: deuda de observabilidad (impacto bajo por ser utilitario).
Fix: unificar logger o marcar como script dev-only.

[MEDIO-006] Checklist de uploads y límites requiere batería de pruebas dedicada
Archivo: web/app/api/telegram/webhook/route.ts
Problema: existe lógica de webhook/rate-limit, pero faltan casos E2E documentados de tamaño/tipo multimedia.
Riesgo: degradación en bordes operativos.
Fix: agregar pruebas de límite y validación de tipos.

PROBLEMAS BAJO (deuda técnica)
[BAJO-001] TODO/FIXME detectados en utilitarios y textos.
[BAJO-002] Referencias duplicadas de búsqueda en auditoría automática.
[BAJO-003] Falta tabla unificada de trazabilidad de auditorías en `ops`.
[BAJO-004] Convención de nombres de auditoría arrastrada desde template (“INSTITUTO”).

PLAN DE REMEDIACIÓN
Sprint 1 — Críticos (esta semana)
- Completo: sacar `.env` sensibles del índice y bloquearlos en `.gitignore`.

Sprint 2 — Altos (próxima OLA)
- Completo parcial: estandarizar logging core.
- Pendiente: actualización de `ops/PENDIENTES.md` en cierre formal de sesión.

Sprint 3 — Medios y Bajos (backlog)
- Particionar `dashboard-client.tsx`.
- Cerrar trazabilidad de Supabase CLI y fuente canónica de migraciones.
- Endurecer pruebas E2E de webhook multimedia.

TABLA DE ARCHIVOS AUDITADOS
| Archivo | Estado | Notas |
| --- | --- | --- |
| web/middleware.ts | OK | Protege rutas no auth y redirige login/dashboard. |
| web/lib/api-auth.ts | OK | Auth por bearer con Supabase admin y roles. |
| web/app/api/telegram/webhook/route.ts | OBS | Rate limit presente; reforzar pruebas de borde multimedia. |
| web/app/api/cron/reminders/route.ts | OK | Cron bearer validado y límites en query. |
| web/app/api/meetings/unified/route.ts | OK | AuthZ + rate limit + auditoría operacional. |
| web/lib/meeting-slot.ts | FIXED | Se reemplazó `console.error` por logging estructurado. |
| web/app/layout.tsx | OBS | `themeColor` hardcodeado. |
| web/components/dashboard-client.tsx | OBS | 823 líneas, requiere partición. |
| .gitignore | FIXED | Ignora `web/.env.vercel.*`. |
| web/.env.vercel.local | FIXED | Removido del índice Git. |
| web/.env.vercel.production | FIXED | Removido del índice Git. |
| web/.env.vercel.test | FIXED | Removido del índice Git. |
