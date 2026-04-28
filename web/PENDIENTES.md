# PENDIENTES - Agenda Reuniones Vecinos

## Prioridad Alta
- Configurar integración real de Google Calendar (Service Account + Calendar compartido + variables `GOOGLE_*` en local/producción).
- Reemplazar uso de `<img>` por `next/image` en:
  - `web/app/dashboard/page.tsx`
  - `web/app/login/page.tsx`
  - `web/app/reset-password/page.tsx`
- Integrar observabilidad productiva (Sentry/Axiom) en API routes críticas.
- Resolver constraint `meeting_gap_30m_excl` con versión compatible en DB remota.

## Prioridad Media
- Agregar suite de tests automatizados (unit + integración API) y pipeline QA completo.
- Publicar contrato OpenAPI mínimo de endpoints críticos.
- Agregar pruebas de accesibilidad y performance (Lighthouse >= 90).

## Prioridad Baja
- Consolidar tokens de rol históricos (`referente`) para migración limpia a `usuario`.
