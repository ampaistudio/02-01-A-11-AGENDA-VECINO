# WALKTHROUGH

1. Auditoria de CORE vs proyecto (seguridad, RLS, observabilidad, artefactos).
2. Reparacion de webhook Stripe con firma + idempotencia + audit log.
3. Endurecimiento RLS para lessons/quizzes con control de premium.
4. Limpieza de artefactos compilados en Git.
5. Heartbeat logs en API.
6. Registro de deuda y riesgo residual en `PENDIENTES.md` y `audit_report.md`.
7. Decision de arquitectura canonica: `web/app/*` como fuente unica de frontend activo.
8. Inicio de Wave visual operativa sobre `web/app/*` (eliminacion progresiva de estilos inline).
