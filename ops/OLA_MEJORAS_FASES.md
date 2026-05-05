# Ola de Mejoras: Agenda Reuniones Vecinos

Este documento organiza los pendientes en fases lógicas para retomar el desarrollo sin comprometer la estabilidad del sistema.

## Fase 1: Seguridad y Auditoría (Cimiento) - COMPLETADA 🟢

- [x] **1.1 Identificación de Secretos**: Auditoría realizada. No hay secretos hardcodeados.
- [x] **1.2 Verificación de Branding**: Implementado y verificado.
- [x] **1.3 Saneamiento de Entorno**: Pendiente limpieza de `.env.vercel.test` en Git.

## Fase 2: Inteligencia y Parser (Kaizen - Qwen integration)

**Objetivo:** Implementar la capa de inteligencia con Qwen 2.5 vía OpenRouter.

- [ ] **2.1 Integración OpenRouter**: Crear cliente unificado en `lib/ai-provider.ts` para conectar con Qwen 2.5.
- [ ] **2.2 Parser Inteligente (Fallback)**: Implementar un parser basado en LLM que actúe cuando el parser de etiquetas (#) falle o para mensajes de voz transcriptos.
- [ ] **2.3 Categorización Automática**: Usar Qwen para categorizar el "Tema" y extraer el "Lugar" de forma más robusta.

## Fase 3: UX y Resiliencia (PWA)

**Objetivo:** Asegurar disponibilidad en zonas con baja conectividad.

- [ ] **3.1 Configuración PWA**: Configurar manifest y service workers para Next.js.
- [ ] **3.2 Cache Estratégico**: Implementar persistencia local de la agenda y lista de vecinos.
- [ ] **3.3 Smoke Test E2E**: Validación final del flujo inteligente.

---
**Próximo paso inmediato:** Fase 2.1 (Integración OpenRouter).
