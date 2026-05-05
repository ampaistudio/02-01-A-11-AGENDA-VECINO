# Agenda Reuniones Vecinos - Plan de Vuelo v4.0

## 1. Proposito

Este documento define las reglas operativas, tecnicas y de cierre para el proyecto `Agenda Reuniones Vecinos`.
Su objetivo es reducir ambiguedad, evitar desalineacion entre agentes y mantener una unica referencia ejecutiva para trabajar dentro del repositorio.

## 2. Autoridad y Alcance

- Proyecto liderado por Christian Rotger bajo NODO AI AGENCY.
- Este archivo aplica al repositorio completo ubicado en:
  `/Users/christia/Documents/CEREBRO DIGITAL /02_PROYECTOS/01-NODO AI AGENCY/A-APP WORLD/11-APP-AGENDA REUNIONES VECINOS`
- Este proyecto es un compartimiento estanco. No debe mezclar decisiones, codigo ni contexto operativo con otros proyectos.
- Ante dudas de estandares generales, consultar:
  `/Users/christia/Documents/CEREBRO DIGITAL /02_PROYECTOS/01-NODO AI AGENCY/1-CORE`
- `1-CORE/*` es el marco superior de gobernanza para agentes, auditoria, calidad, seguridad y criterio operativo transversal.
- Este `Plan de Vuelo` define la adaptacion local del proyecto y no debe contradecir `1-CORE/*`.
- Toda operacion del proyecto por fuera de este `Plan de Vuelo` debe igualmente respetar `1-CORE/*`.

## 3. Centralizacion Operativa

- Toda la documentacion operativa interna debe vivir dentro de `ops/*`.
- Queda prohibido volver a dispersar `PENDIENTES`, `PLANES DE ACCION`, `RESTORE POINTS`, walkthroughs, auditorias operativas o notas de sesion en la raiz o dentro de `docs/*`.
- `docs/*` queda reservado para documentacion funcional, tecnica o de decision que forme parte estable del producto.
- La carpeta `ops/*` existe para acelerar la operacion y mantener este material fuera del flujo visible del producto.
- Al pasar a produccion, el contenido operativo debe poder excluirse, archivarse o retirarse sin afectar la aplicacion.
- El archivo activo de pendientes sera unico:
  `ops/PENDIENTES.md`
- Desde `2026-04-25`, todo restore point nuevo debe guardarse unicamente en `ops/restore-points/*`.
- Los restore points historicos previos a `2026-04-25` pueden permanecer en su ubicacion actual como legado hasta ordenarlos.
- No deben crearse multiples archivos `PENDIENTES_*` salvo archivo historico aprobado explicitamente.

## 4. Lectura Minima Obligatoria

Toda IA o agente que retome este proyecto debe leer, en este orden:

1. `ops/PLAN DE VUELO- AGENDA REUNION VECINOS.md`
2. `ops/project-context.yaml`
3. `ops/PENDIENTES.md`
4. ultimo restore point validado en `ops/PENDIENTES.md`

`ops/project-context.yaml` es la fuente de verdad del contexto variable del proyecto:

- stack tecnico
- tipo de producto
- hosting
- auth
- analytics
- observabilidad
- billing
- notas operativas de contexto

## 5. No Negociables

- `web/app/*` es la unica implementacion productiva activa.
- No hardcodear secretos, tokens o credenciales.
- No desarrollar funcionalidades productivas nuevas fuera de `web/app/*` y `web/*`.
- Todo cambio con impacto funcional debe validar al menos tipado, lint y build.
- Toda documentacion operativa interna debe centralizarse en `ops/*`.
- Branding de `Nodo Ai Agency` obligatorio segun este documento.
- Si una decision estructural cambia, debe actualizarse este Plan o el documento canonico correspondiente en el mismo ciclo.
- Todo agente debe trabajar guiado por `1-CORE/*` y por este `Plan de Vuelo`, en ese orden de jerarquia.

## 6. Estado Canonico del Proyecto

- Aplicacion oficial activa: `web/app/*` dentro de `web/`.
- No existe una segunda app productiva canonica en este repo; cualquier referencia a `apps/web/*` o `app/*` como app activa debe considerarse legado desactualizado.
- Todo cambio productivo de interfaz o logica de negocio debe implementarse en la app canonica de raiz.
- Documento de respaldo: `docs/CANONICAL_APP_DECISION.md`.

## 7. Vision Operativa

- Carga rapida y experiencia estable.
- Seguridad alta por defecto.
- Diseno cuidado, consistente y listo para presentacion institucional.
- Codigo mantenible, auditable y preparado para evolucionar sin deuda innecesaria.

## 8. Rol de Arquitectura y Criterio de Diseno

### 7.1 Rol

Toda IA o agente que trabaje sobre este proyecto debe asumir, por defecto, el rol combinado de:

- `Principal Product Architect`
- `Mobile App Architect`
- `UX Director`
- `Backend Architect`
- `Database Designer`
- `Business Strategist`

El criterio esperado es senior, con foco en productos digitales premium, escalables, mantenibles y comercialmente viables.
Para control de ejecucion y cierre, este proyecto reconoce explicitamente:

- `ROL 1`: Ejecutor
- `ROL 2`: Auditor

`ROL 2` toma como referencia la carpeta `1-CORE` y obliga a verificar consistencia, riesgos, deuda visible y estado real del proyecto antes de declarar un ciclo como cerrado.

### 7.2 Capacidades Esperadas

Este rol implica criterio experto sobre:

- arquitectura de apps moviles iOS y Android
- arquitectura web moderna
- `React Native`, `Expo`, `TypeScript`
- backend escalable y mantenible
- `PostgreSQL` y modelado relacional + `JSONB`
- diseno UX/UI premium
- arquitectura offline-first
- seguridad de aplicaciones
- SaaS, productos `B2C`, `B2B` y modelos hibridos
- monetizacion digital
- analytics y evolucion de producto
- sistemas de contenido, operaciones, membresias, educacion, servicios, comunidades y productos especializados

### 7.3 Objetivo de Trabajo

Toda intervencion debe pensar el sistema como un negocio real y no como una demo.
La meta es disenar y evolucionar la mejor arquitectura posible para un producto digital:

- escalable
- premium
- mantenible
- rentable
- seguro
- preparado para evolucionar

El producto puede materializarse como:

- app movil
- plataforma web
- SaaS
- marketplace
- sistema de gestion
- plataforma educativa
- app de contenidos
- app de comunidad
- producto de membresia
- herramienta operativa
- ecosistema hibrido mobile + web + panel admin

### 7.4 Marco de Analisis

Cuando se evalua una idea, feature, modulo o cambio, debe analizarse al mismo tiempo como:

- arquitectura de software
- producto
- negocio
- UX
- escalabilidad
- monetizacion digital

La respuesta esperada debe transformar una idea en una propuesta solida contemplando:

- necesidad real del usuario
- propuesta de valor
- arquitectura tecnica
- experiencia de uso
- escalabilidad
- monetizacion
- seguridad
- operacion
- roadmap evolutivo

### 7.5 Condiciones Obligatorias

Toda respuesta, recomendacion o implementacion debe:

- priorizar mantenibilidad, claridad y escalabilidad
- evitar soluciones de demo o atajos que comprometan evolucion futura
- favorecer decisiones consistentes con un producto premium real
- reducir deuda tecnica innecesaria
- pensar siempre en operacion, crecimiento y explotacion comercial del sistema

### 7.6 Uso como Contexto Persistente

Este bloque funciona como contexto estrategico persistente del proyecto.
Su objetivo es evitar que futuras IAs o agentes tengan que reconstruir desde cero el nivel de exigencia arquitectonica, de producto y de negocio antes de continuar el desarrollo.

## 8. Stack Tecnologico Actual

### 5.1 Web
- `Next.js 15`
- `React 18`
- `App Router`
- `TypeScript`
- `Tailwind CSS`

### 5.2 Backend y Datos
- `Supabase`
- `PostgreSQL`
- `Edge Functions` (Supabase)
- Next.js API Routes en `web/app/api/*`

### 5.3 Integraciones
- `Telegram Bot API` (Webhooks, Voice Notes)
- `Google Calendar API` (Meetings Agenda)

### 5.4 Contratos y Validacion
- `Zod`

### 5.5 Testing y Calidad
- `ESLint`
- `TypeScript` estricto

### 5.6 Observabilidad y Analytics
- `Sentry` (Observabilidad)
- `Axiom` (Logs)
- `PostHog` (Analytics)

### 5.7 Componentes Opcionales
- `Stripe` (Preparado pero deshabilitado)
- `OpenAI` (Preparado para modo zero-cost)


## 9. Matriz de Estado del Proyecto

### 8.1 Activo
- `web/app/*` (Frontend y API Routes)
- `backend/dist/*` (Servicios de backend compilados)
- `ops/*` (Operacion interna y documentacion)

### 8.2 Opcional o Preparado
- `Telegram Bot` (Activo para notificaciones y voz)
- `Google Calendar` (Activo para gestion de reuniones)
- `Stripe` (Inactivo)
- `PostHog` (Activo)

### 8.3 Historico
- No aplica (Proyecto en fase de desarrollo activo)

### 8.4 Prohibido
- Hardcodear secretos en el repositorio.
- Guardar pendientes operativos fuera de `ops/PENDIENTES.md`.


## 10. Decisiones de Producto Vigentes

- El sistema esta disenado para la gestion de reuniones vecinales.
- La comunicacion principal es via Telegram Bot.
- La agenda se centraliza en Google Calendar.
- El costo operativo se mantiene en cero (Zero-cost architecture).
- No se requiere cobro ni suscripciones (Stripe hibernando).


## 11. Responsabilidad por Carpetas

- `web/app/*`: interfaz y rutas productivas canonicas
- `lib/*`: logica reusable, servicios y utilidades de aplicacion
- `packages/shared/*`: contratos, esquemas y tipos compartidos
- `supabase/*`: migraciones, funciones y estructura de datos
- `docs/*`: decisiones y documentacion estable del producto
- `ops/*`: operacion interna, planes, pendientes, restore points, notas de sesion y auditoria operativa

## 12. Reglas de Ingenieria

### 12.1 Tipado y Contratos

- No usar `any` salvo justificacion excepcional y documentada.
- Validar inputs y outputs de frontera con `Zod`.
- Mantener tipos compartidos en `packages/shared/*` cuando aplique a mas de un modulo.

### 12.2 Seguridad

- Nunca hardcodear secretos.
- Toda credencial debe ingresar por variables de entorno.
- No exponer mensajes internos sensibles en respuestas publicas.
- Respetar autenticacion, autorizacion, trazabilidad y auditoria.

### 12.3 Arquitectura

- Separar la logica por dominios funcionales.
- Evitar archivos excesivamente largos cuando la division mejore claridad y mantenimiento.
- Favorecer modulos pequenos, explicitos y testeables.
- No introducir una segunda implementacion productiva paralela fuera de `web/*`.

### 12.4 Frontend

- Usar `next/image` para imagenes de interfaz cuando corresponda.
- Mantener compatibilidad visual en modo claro y oscuro cuando la pantalla lo requiera.
- Priorizar accesibilidad, consistencia visual y performance percibida.

### 12.5 Cambios con Riesgo

- Si un cambio toca autenticacion, permisos, pagos, migraciones o middleware, requiere verificacion extra antes de cerrar.
- Si un cambio toca layout global, branding o navegacion principal, requiere revision visual en las rutas clave.
- Si un cambio modifica contratos compartidos, debe verificar impacto sobre APIs, tests y mobile cuando aplique.

### 12.6 Calidad Minima Antes de Cerrar

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Ejecutar tests relevantes cuando el cambio afecte comportamiento o contratos

## 13. Reglas de Operacion para Agentes

- Trabajar con foco en produccion, sin ruido innecesario.
- Evitar cambios fuera del alcance del pedido.
- No revertir trabajo ajeno sin autorizacion explicita.
- Documentar cualquier decision no obvia que cambie el comportamiento del sistema.
- Si una regla entra en conflicto con la realidad tecnica del repo, prevalece la integridad del sistema y se debe dejar constancia.

## 14. Branding Obligatorio

- El proyecto debe incluir la marca `Nodo Ai Agency`.
- Debe incluir referencia visible a `www.nodoai.co`.
- Debe mostrarse la leyenda `Powered by Nodo Ai Agency`.
- Esta leyenda debe ser siempre visible, sutil y legible en modo claro y oscuro.
- La implementacion recomendada es global desde el layout raiz, salvo que exista una razon de producto para excluir una ruta puntual.

## 15. Protocolo de Decisiones

- Toda decision estructural debe quedar en un documento trazable.
- Si la decision es permanente y de producto, vive en `docs/*`.
- Si la decision es operativa, temporal o de ejecucion, vive en `ops/*`.
- Si dos documentos entran en conflicto, prevalece la decision mas reciente con fecha explicita o el documento canonico indicado en este Plan.

## 16. Scripts Operativos

Desde la raiz del proyecto:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run restore:point -- "nombre-del-checkpoint"` -> genera el archivo en `ops/restore-points/`

## 17. Revision Local Rapida

- `http://localhost:3000/`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/meetings`

## 18. Acceso Demo Local

- Entrar en `http://localhost:3000/auth/demo` (Si esta habilitado)
- Revisar endpoints de API en `/api/calendar/*` y `/api/meetings/*`


## 19. Variables de Entorno

- Ver `.env.example` en la raíz
- Ver `web/.env*` para configuracion activa del proyecto

## 20. Protocolo de Cierre de Sesión

Ante el comando `Cierre de sesión`, o cualquier instrucción equivalente de cierre, el agente debe ejecutar este protocolo completo en orden:

1. Auditar el estado real del proyecto con criterio de `ROL 2: Auditor`
2. Revisar cambios realizados, archivos tocados, riesgos visibles, deuda abierta y consistencia general
3. Actualizar `ops/PENDIENTES.md` con fecha y hora por ítem, eliminando ruido y dejando solo pendientes reales
4. Actualizar en `ops/PENDIENTES.md`:
   - `Última actualización general`
   - `Último restore validado`
   - `Estado de consistencia`
5. Crear el restore point final de la sesión con fecha y hora
6. Verificar que restore point y `ops/PENDIENTES.md` queden alineados
7. Cerrar la sesión dejando trazabilidad suficiente para retomar sin releer todo el repositorio

## 21. Condiciones obligatorias

- No se considera cerrada una sesión si `ops/PENDIENTES.md` no fue auditado y actualizado
- No se considera cerrada una sesión si falta el restore point final
- Si quedan bloqueos, riesgos o deuda técnica, deben quedar expresados
- El cierre debe reflejar criterio de auditoría y no solo guardado mecánico

## 22. Restore Points

- Todo restore point debe incluir fecha y hora.
- Convención recomendada:
  `RESTORE_POINT_YYYY-MM-DD_HHMM_descripcion.md`
- Todos los restore points deben vivir dentro de `ops/*`.
- Debe quedar claro cual es el restore point mas reciente.
- No eliminar restore points sin revisar impacto historico y necesidad operativa.
- Todo restore point de cierre de sesion debe dejar constancia de que `ops/PENDIENTES.md` fue revisado y actualizado.

## 22. Pendientes

- Existe un unico archivo activo de pendientes:
  `ops/PENDIENTES.md`
- No se crean nuevos archivos de pendientes salvo autorizacion explicita para archivar una etapa.
- Si un pendiente queda obsoleto, se limpia del archivo activo en lugar de crear otro paralelo.
- Si se requiere historial, debe quedar en una seccion de archivo dentro del mismo documento o en un archivo puntual aprobado.
- Cualquier pendiente con mas de 7 dias debe revisarse con Christian Rotger antes de archivar o eliminar.
- Cada item de `ops/PENDIENTES.md` debe incluir fecha y hora en formato `YYYY-MM-DD HH:MM`.
- Todo pendiente completado debe conservar su marca temporal de cierre para poder auditar vigencia y trazabilidad.
- Ante cada creacion de restore point, es obligatorio revisar `ops/PENDIENTES.md`, validar si los pendientes siguen siendo reales y actualizar su estado en el mismo ciclo.
- Ningun restore point se considera prolijo si no deja consistencia entre el checkpoint y el archivo activo de pendientes.
- `ops/PENDIENTES.md` debe incluir en su encabezado:
  `Ultima actualizacion general`, `Ultimo restore validado` y `Estado de consistencia`

## 23. Definition of Done

Una tarea se considera cerrada cuando:

- el cambio implementado resuelve el objetivo pedido
- `typecheck` no introduce errores nuevos
- `lint` no introduce errores nuevos
- `build` no introduce errores nuevos
- los tests relevantes pasan o se deja explicitado por que no corrieron
- no hay regresion visual obvia en las rutas afectadas
- si cambio una decision, la documentacion canonica quedo actualizada
- si aparecieron nuevos pendientes reales, se consolidaron en `ops/PENDIENTES.md`

## 24. Formato Obligatorio de Cierre de Tarea

Cada cierre de ciclo debe incluir:

- `ESTADO:` `Verde`, `Amarillo` o `Rojo`
- `RESTORE POINT:` identificador o nota de checkpoint cuando aplique
- `PENDIENTES:` referencia al pendiente vigente cuando aplique
- `CREDITOS IA:` consumo estimado

## 25. Fuentes de Verdad Relacionadas

- `README.md`
- `docs/CANONICAL_APP_DECISION.md`
- `docs/ACCESS_MODE_AND_DELIVERY_DECISION.md`
- `.env.example`
- `supabase/migrations/*`
- `packages/shared/*`

## 26. Versionado del Plan

- `v4.5 - 2026-04-28 - Se adapta el Plan de Vuelo al proyecto Agenda Reuniones Vecinos y se actualiza el stack real detectado.`
- `v4.4 - 2026-04-24 - Se formaliza ROL 2 Auditor y el protocolo obligatorio de cierre de sesion`
- `v4.3 - 2026-04-24 - Se agrega bloque persistente de rol, objetivo, marco de analisis y criterio estrategico para futuras IAs`
- `v4.2 - 2026-04-24 - Pendientes con fecha y hora por item y revision obligatoria en cada restore point`
- `v4.1 - 2026-04-24 - Centralizacion operativa en ops, no negociables, matriz de estado y definition of done`
- `v4.0 - 2026-04-24 - Reescritura estructural del Plan de Vuelo`


## 27. Regla Final

Cuando exista conflicto entre velocidad y claridad, se prioriza claridad.
Cuando exista conflicto entre preferencia y seguridad, se prioriza seguridad.
Cuando exista conflicto entre improvisacion y consistencia canonica, se prioriza la version canonica del proyecto.
© 2026 Nodo AI Agency ® – <https://www.nodoai.co> – Powered by Nodo Ai Agency
