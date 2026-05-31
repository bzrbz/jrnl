# Plan de trabajo — `jrnl`

> Bullet journal local-first. Todo el estado en tu dispositivo, nada en un servidor ajeno.

## La idea en dos párrafos

Un bullet journal digital que respete la notación de Ryder Carroll (tareas `•`, notas `—`, eventos `○`, migraciones `›`) pero que viva en el navegador. Sin cuenta. Sin login. Sin "onboarding". Abres la URL y ya estás escribiendo. Los datos se guardan en IndexedDB; si quieres, exportas a JSON o Markdown.

La tesis es que la mayoría de apps de notas son demasiado para lo que la gente realmente hace: una lista diaria de cosas, tachadas o no. jrnl es la app más delgada posible sobre esa idea, pero fiel a la notación del bullet journal porque es la notación que ya funciona en papel.

## Por qué puede ser interesante

- El mercado de apps de notas está saturado, pero casi todas son cloud-first, con cuentas y sincronización. Hay un hueco claro para local-first honesto.
- Público natural: gente que ya lleva bullet journal en papel y quiere algo digital sin perder el espíritu.
- La versión mínima es pequeña de verdad. Un fin de semana, no seis meses.

## Riesgos y asunciones

- **Asunción**: la gente que quiere bullet journal local-first existe en número suficiente. Señal temprana: alcance del primer post en HN o comunidades de bullet journal.
- **Riesgo**: el navegador puede limpiar IndexedDB sin avisar (en iOS sobre todo). Mitigación: recordar al usuario que exporte cada X tiempo, ofrecer descarga automática a carpeta local vía File System Access API cuando esté disponible.
- **Riesgo**: sin sync, la gente se frustra si usa más de un dispositivo. Mitigación futura: export/import manual primero; sync opcional (E2E, con algún proveedor tipo Dropbox o remoteStorage) solo si hay demanda.

## Fases

### Fase 0 — Sketch ✅

Mockups, tipografía, paleta. Una tipografía mono, dos colores.

### Fase 1 — MVP publicable ✅

App funcionando en `jrnl.bzr.bz`:

- [x] Repo inicializado
- [x] Layout mínimo: fecha, lista de entradas, input al final
- [x] Entrada nueva con Enter; prefijos de símbolo (`. - o`)
- [x] Persistencia en IndexedDB (Dexie)
- [x] Navegación por días
- [x] Marcar tarea completada
- [x] Desplegado en subdominio
- [x] Link en la landing de bzr.bz

### Fase 1.5 — MVP ampliado ✅

Features añadidas antes de lanzar:

- [x] Dark mode (`prefers-color-scheme`)
- [x] Reordenar entradas (drag & drop desktop + touch móvil)
- [x] Swipe en entradas (→ completar, ← borrar)
- [x] Undo al borrar (toast 4s)
- [x] Migración de tareas con referencias (`refId`, símbolo `›`)
- [x] Modal de onboarding + botón `?`
- [x] Widget de calendario con indicadores de actividad
- [x] Modularización: `Calendar.svelte`, `HelpModal.svelte`, `EntryList.svelte`
- [x] 53 tests (Vitest: unit + UI con happy-dom)
- [x] CI en GitHub Actions (push/PR → test + build)
- [x] PWA instalable (vite-plugin-pwa)

### Fase 2 — Lo que pida el primer feedback (1-2 semanas)

Publicar en un par de sitios (Mastodon, r/bulletjournal, HN si parece listo) y mirar qué piden. El orden probable:

- Exportar a Markdown y JSON
- Vista "mes" con columna de días y tareas abiertas
- Búsqueda por texto en todas las entradas
- Colecciones / índice

La regla: implementar lo que pidan más de dos personas distintas, no lo que a ti te parezca bonito.

### Fase 3 — Permanencia (según tracción)

Solo si la fase 2 muestra uso real:

- File System Access API para guardar en carpeta local del usuario
- Atajos avanzados (colecciones, índice, custom signifiers)
- Sync opcional E2E contra un provider (remoteStorage, Dropbox, iCloud Drive). Nunca obligatorio.

### Fase 4 — Graduación o deprecación

A los 3 meses de la publicación, decisión:

- Si hay >50 usuarios semanales activos → graduar, estabilizar, documentar.
- Si hay <10 → banner de deprecación, archivo en un mes, código open source y a otra cosa.

## Stack

**Frontend**: Svelte 5 (runes: `$state`, `$derived`, `$effect`). Vite como bundler.

**Persistencia**: IndexedDB vía Dexie 4. Schema versionado (v1→v3), `liveQuery` para reactividad.

**Tests**: Vitest 4 con `fake-indexeddb` (unit/store) y `@testing-library/svelte` + `happy-dom` (UI).

**Hosting**: Netlify. Estático 100%.

**Offline**: Service Worker desde el día 1 (vite-plugin-pwa).

**Nada de**: React, backend, auth, analítica invasiva, fuentes remotas pesadas.

## Cosas que expresamente no se hacen (todavía)

- Cuentas de usuario
- Sync entre dispositivos
- Multi-cuaderno
- Colores de tareas, etiquetas, prioridades
- Recordatorios / notificaciones
- Colaboración

Cada una añadiría complejidad que mata la tesis local-first minimalista. Se añaden solo si el uso real lo pide.
