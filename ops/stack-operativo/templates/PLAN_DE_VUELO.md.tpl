# Plan de Vuelo - {{PROJECT_NAME}}

## 1. Proposito

Este documento define las reglas operativas, tecnicas y de cierre del proyecto `{{PROJECT_NAME}}`.
Su objetivo es reducir ambiguedad, centralizar el contexto y mantener una referencia ejecutiva unica dentro del repositorio.

## 2. Autoridad y alcance

- Proyecto gobernado por `Nodo Ai Agency`.
- Unidad operativa liderada por Christian Rotger.
- El proyecto reconoce explicitamente `ROL 1`: Ejecutor y `ROL 2`: Auditor.
- Este archivo aplica al repositorio ubicado en `{{PROJECT_PATH}}`.
- Este proyecto es un compartimiento estanco. No debe mezclar codigo, decisiones ni notas operativas con otros proyectos.
- `1-CORE/*` es el marco superior de gobernanza para agentes, auditoria, calidad, seguridad y criterio operativo transversal.
- El `Plan de Vuelo` define la adaptacion local del proyecto y no debe contradecir `1-CORE/*`.
- Toda operacion del proyecto por fuera del `Plan de Vuelo` debe igualmente respetar `1-CORE/*`.

## 3. Centralizacion operativa

- Toda la documentacion operativa interna debe vivir dentro de `ops/*`.
- `docs/*` queda reservado para documentacion estable del producto o decisiones permanentes.
- El archivo activo de pendientes es unico: `ops/PENDIENTES.md`.
- Todo restore point nuevo debe guardarse solo en `ops/restore-points/*`.

## 4. Lectura minima obligatoria

Toda IA o agente que retome este proyecto debe leer, en este orden:

1. `ops/{{PLAN_FILENAME}}`
2. `ops/project-context.yaml`
3. `ops/PENDIENTES.md`
4. ultimo restore point validado en `ops/PENDIENTES.md`

## 5. Vision operativa

- Carga rapida y experiencia estable.
- Seguridad alta por defecto.
- Diseno cuidado y preparado para producto premium.
- Todo agente debe operar con criterio de ejecucion y auditoria, alineado con `1-CORE/*`.

## 6. No negociables

- No hardcodear secretos, tokens o credenciales.
- Toda documentacion operativa interna debe centralizarse en `ops/*`.
- Todo cambio con impacto funcional debe validar al menos tipado, lint y build.
- Si una decision estructural cambia, debe actualizarse este Plan o el documento canonico correspondiente en el mismo ciclo.
- Todo agente debe trabajar guiado por `1-CORE/*` y por este `Plan de Vuelo`, en ese orden de jerarquia.

## 7. Fuente de verdad variable

`ops/project-context.yaml` es la fuente de verdad del contexto variable del proyecto:

- stack tecnico
- tipo de producto
- hosting
- auth
- analytics
- observabilidad
- billing
- notas operativas de contexto

## 8. Cierre de sesion obligatorio

Antes de cerrar una sesion:

1. actualizar `ops/PENDIENTES.md`
2. registrar deuda, riesgos y estado real del trabajo
3. crear restore point en `ops/restore-points/*`
4. verificar consistencia entre restore point y `ops/PENDIENTES.md`

## 9. Scripts operativos recomendados

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run restore:point -- "nombre-del-checkpoint"`
