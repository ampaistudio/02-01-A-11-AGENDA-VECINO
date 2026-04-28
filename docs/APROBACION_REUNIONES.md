# Protocolo de Aprobación de Reuniones - Nodo Ai Agency

## 1. Introducción
Este documento define el flujo operativo para la gestión de solicitudes de reuniones vecinales dentro de la plataforma **Agenda Vecinos**.

## 2. Roles Involucrados
- **Vecino (Usuario):** Solicita la reunión y propone fecha/hora.
- **Team Leader (TL) / Admin:** Evalúa la disponibilidad, aprueba o rechaza la solicitud.

## 3. El Ciclo de Vida de una Solicitud

### Paso 1: Recepción
La solicitud ingresa al sistema y aparece en la barra lateral derecha del Dashboard bajo el estado **"pending"**.

### Paso 2: Evaluación
El TL/Admin debe revisar:
- **Disponibilidad:** El panel central mostrará si existe conflicto con otras reuniones en el horario sugerido.
- **Integridad de Datos:** Validar que el nombre, tema y teléfono sean correctos.

### Paso 3: Acción de Estado
- **Aprobar:** Al presionar "Aprobar", el sistema:
  1. Cambia el estado a `approved`.
  2. Notifica al vecino por **Telegram** de forma inmediata.
  3. Programa recordatorios automáticos para **24 horas** y **2 horas** antes de la reunión.
  4. Sincroniza la reunión con el **Google Calendar** institucional.
- **Rechazar:** Al presionar "Rechazar", el sistema marca la solicitud como `rejected` y notifica al vecino por Telegram.

## 4. Gestión de Conflictos
Si un horario solicitado ya está ocupado, el TL/Admin debe contactar al vecino o proponer una reprogramación manual (funcionalidad en roadmap).

## 5. Auditoría
Cada cambio de estado queda registrado en el `audit_log` de la base de datos con el ID del agente que realizó la acción y un `trace_id` para trazabilidad de errores.

---
© 2026 Nodo Ai Agency ®
