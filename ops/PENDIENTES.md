# PENDIENTES - AGENDA REUNIONES VECINOS

Ultima actualizacion general: `2026-05-05 15:53 -03`
Estado de consistencia: `OPERATIVO - DB AUDITED - FINAL SYNCED`

## Completado (Rescate y Mejora KAIZEN)

- [x] `2026-04-28 12:58` Restaurar código fuente desde GitHub público.
- [x] `2026-04-28 14:15` Rediseño estético Premium del Login (Shadows, Hover, Transiciones).
- [x] `2026-04-28 14:30` Integración de logo original `par-logo.jpg` en todo el sistema.
- [x] `2026-04-28 14:40` Reingeniería visual del Dashboard (Layout de 2 columnas, Stats Bar).
- [x] `2026-04-28 15:00` Unificación de lógica de recordatorios de Telegram (24h/2h).
- [x] `2026-04-28 15:10` Ejecutar Build completo y corregir errores de tipado.
- [x] `2026-04-28 15:20` Vinculación exitosa con GitHub (ampaistudio/02-01-A-11-AGENDA-VECINO).
- [x] `2026-04-28 15:25` Implementar panel de estadísticas (Métricas de impacto) en Dashboard Admin.
- [x] `2026-04-28 15:25` Implementar sistema de Toasts (notificaciones emergentes elegantes).
- [x] `2026-04-28 15:30` Documentar flujo de "Aprobación de Reuniones" en `docs/`.
- [x] `2026-05-05 12:40` Organizar "Ola de Mejoras" en fases (`ops/OLA_MEJORAS_FASES.md`).
- [x] `2026-05-05 12:45` Implementar nuevo Parser Multilínea en Telegram (`#llamado`, `#reunion`).
- [x] `2026-05-05 12:45` Integrar campo `Detalle` en flujo Telegram -> DB -> Google Calendar.

## Pendientes Próximos

- [x] `2026-04-28 15:35` Auditoría fina de sincronización con Google Calendar (scopes de Service Account).
- [x] `2026-04-28 15:35` Implementar exportación de reportes de impacto en CSV/PDF.
- [x] `2026-04-28 16:25` Sanear archivos `.env.vercel.*` versionados para quitar secretos del repositorio.
- [x] `2026-04-28 16:25` Unificar documentación operativa para que la app canónica sea `web/app/*` en todo `ops`.
- [x] `2026-05-05 13:10` Sincronización completa con repositorio remoto (Push exitoso).
- [x] `2026-05-05 13:14` Auditoría profunda de arquitectura y seguridad completada.
- [x] `2026-05-05 15:35` Auditoría de base de datos y documentación de esquema (`ops/DATABASE_SCHEMA.md`).
- [ ] `2026-04-28 16:25` Rotar en proveedores externos las credenciales que quedaron expuestas históricamente y reemitirlas fuera del repo.
- [x] `2026-05-05 12:52` Validar punta a punta Telegram voz/texto -> registro -> Google Calendar -> recordatorio (Smoke Test - Unit Tests).
- [ ] `2026-05-05 13:18` Implementar integración con Qwen 2.5 vía OpenRouter (Zero-cost AI).
- [ ] `2026-05-05 13:18` Configurar PWA y estrategia de cache offline para Next.js.
- [ ] `2026-05-05 12:45` Limpiar archivo `web/.env.vercel.test` del repositorio (Git rm --cached).

### Formato propuesto

- `#llamado`
- `Fecha: DD mes`
- `Hora: HH:MM`
- `Persona: Nombre Apellido`
- `Tema: motivo del llamado`
- `Lugar: local comercial o referencia`
- `Detalle: opcional`

- `#reunion`
- `Fecha: DD mes`
- `Hora: HH:MM`
- `Persona: Nombre Apellido`
- `Tema: motivo de la reunión`
- `Lugar: ciudad, dirección o referencia`
- `Detalle: opcional`

### Criterios funcionales

- `Local` en llamados debe interpretarse como local comercial o lugar, no como localidad.
- `Tema` debe quedar separado como campo explícito del registro.
- La estructura interna debe ser tabular y uniforme para ambos tipos:
- `tipo`
- `fecha_hora`
- `persona`
- `tema`
- `lugar`
- `detalle`
- `canal_origen`
- `creado_por`

### Estado actual del trabajo

- Ya existe una base parcial para distinguir `llamado` y `reunion` dentro del flujo.
- Falta consolidar el parser final al formato simple etiquetado acordado.
- Falta validar punta a punta Telegram voz/texto -> registro -> Google Calendar -> recordatorio.
