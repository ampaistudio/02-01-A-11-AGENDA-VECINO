# Stack Operativo

Este directorio contiene la plantilla reusable del stack operativo para replicar gobernanza en otros proyectos.

## Componentes

- `PLAN_DE_VUELO.md.tpl` -> se instala como `ops/PLAN DE VUELO-<nombre-carpeta>.md`
- `PENDIENTES.md.tpl`
- `project-context.yaml.tpl`
- `audit_report.md.tpl`
- `walkthrough.md.tpl`
- `USAGE_MONITOR.md.tpl`
- `KAIZEN_TEMPLATE.md.tpl`
- `restore-points/RESTORE_POINT_TEMPLATE.md.tpl`

## Instalacion

Desde este repo:

```bash
npm run ops:install-stack -- ../01-APP-JORNADA\ PRO ../11-APP-AGENDA\ REUNIONES\ VECINOS
```

Opciones:

- `--force`: sobreescribe archivos manejados por la plantilla
- `--dry-run`: muestra que haria sin escribir

El instalador crea `ops/*` sin tocar el codigo productivo del proyecto objetivo.
