# Ola de Mejoras: Agenda Reuniones Vecinos

Este documento organiza los pendientes en fases lógicas para retomar el desarrollo sin comprometer la estabilidad del sistema.

## Fase 1: Seguridad y Auditoría (Cimiento)

**Objetivo:** Asegurar que el entorno de desarrollo y producción sea seguro y cumpla con el Plan de Vuelo.

- [ ] **1.1 Identificación de Secretos:** Revisar historial de Git para listar credenciales que deben ser rotadas por el usuario.
- [ ] **1.2 Verificación de Branding:** Validar que la leyenda "Powered by Nodo Ai Agency" sea legible en modo claro y oscuro.
- [ ] **1.3 Saneamiento de Entorno:** Asegurar que no existan archivos `.env.*` (salvo `.env.example`) en el repositorio.

## Fase 2: Inteligencia y Parser (Kaizen - Telegram)

**Objetivo:** Implementar el nuevo formato de registro vía Telegram acordado en `PENDIENTES.md`.

- [ ] **2.1 Nuevo Parser Multilínea:** Modificar `web/app/api/telegram/webhook/route.ts` para soportar el formato:
  ```
  #reunion
  Fecha: 15 mayo
  Hora: 10:30
  Persona: Juan Perez
  Tema: Alumbrado publico
  Lugar: Plaza Central
  ```
- [ ] **2.2 Adaptación de Tipos:** Asegurar que el objeto `ParsedTelegramAgenda` soporte los nuevos campos (`Detalle`, `Tema` explícito).
- [ ] **2.3 Feedback Inteligente:** Mejorar los mensajes de respuesta del Bot ante errores de formato o conflictos de agenda.

## Fase 3: Operaciones y Reportes (Cierre)

**Objetivo:** Finalizar las herramientas de gestión y métricas.

- [ ] **3.1 Exportación de Reportes:** Validar y pulir el endpoint `api/reports/impact` para exportación en CSV/PDF.
- [ ] **3.2 Smoke Test E2E:** Realizar una prueba completa: Telegram (Texto/Voz) -> Registro DB -> Google Calendar -> Notificación.

---
**Próximo paso inmediato:** Fase 1.1 y 1.2.
