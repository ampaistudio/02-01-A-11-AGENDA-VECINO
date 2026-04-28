# PENDIENTES

Ultima actualizacion general: `{{NOW_LOCAL}}`
Ultimo restore validado: `pendiente`
Estado de consistencia: `Pendiente de auditoria`

## Regla operativa

- Este es el unico archivo activo de pendientes del proyecto.
- Cada item debe incluir fecha y hora en formato `YYYY-MM-DD HH:MM`.
- Ante cada `RESTORE_POINT`, este archivo debe revisarse y actualizarse en el mismo ciclo.
- Todo restore point nuevo debe guardarse en `ops/restore-points/`.
- Si un item deja de ser real, se corrige o elimina; no debe permanecer como ruido historico.

## Alta prioridad

- [ ] `{{TODAY}} 00:00` Completar inventario inicial del proyecto.
- [ ] `{{TODAY}} 00:00` Validar stack, deploy, auth y observabilidad reales.

## Media prioridad

- [ ] `{{TODAY}} 00:00` Definir deuda tecnica visible y plan de convergencia.

## V2

- [ ] `{{TODAY}} 00:00` Registrar roadmap evolutivo luego de estabilizar MVP.

## Kaizen operativo

- [ ] `{{TODAY}} 00:00` Instalar stack operativo base en `ops/*`.
