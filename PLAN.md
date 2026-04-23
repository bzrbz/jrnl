# Plan de trabajo — `jrnl`

> Bullet journal local-first. Todo el estado en tu dispositivo, nada en un servidor ajeno.

## La idea en dos párrafos

Un bullet journal digital que respete la notación de Ryder Carroll (tareas `•`, notas `—`, eventos `○`, migraciones `>` y `<`) pero que viva en el navegador. Sin cuenta. Sin login. Sin "onboarding". Abres la URL y ya estás escribiendo. Los datos se guardan en IndexedDB; si quieres, exportas a JSON o Markdown.

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

### Fase 0 — Sketch (medio día)

Antes de escribir una línea de código: hacer tres mockups en papel o Figma del flujo principal (añadir entrada, marcar como hecha, migrar al día siguiente). Elegir uno. Decidir tipografía y paleta. Sin branding elaborado — una sola tipografía mono, dos colores, y fuera.

### Fase 1 — MVP publicable (fin de semana)

El objetivo es tener algo online en `jrnl.bzr.bz` al final del domingo. La app debe permitir crear entradas del día escribiendo en una sola caja de texto, con atajos de teclado para los símbolos (`.` → `•`, `-` → `—`, `o` → `○`), marcar tareas como completadas con un clic o con la tecla `x`, y navegar entre días con flechas. Persistencia en IndexedDB y ya. No hay settings, no hay temas, no hay export todavía.

Checklist concreto:

- [ ] Repo `bzr-jrnl` inicializado
- [ ] Layout mínimo: un título con la fecha, una lista de entradas, un input al final
- [ ] Entrada nueva con Enter; atajos de símbolo
- [ ] Persistencia en IndexedDB (usar `idb` o Dexie para no sufrir)
- [ ] Navegación por días (ayer / hoy / mañana)
- [ ] Marcar tarea completada
- [ ] Desplegado en subdominio
- [ ] Link en la landing de bzr.bz

**Criterio de salida**: alguien que abre la URL por primera vez puede añadir cinco entradas sin leer ninguna instrucción.

### Fase 2 — Lo que pida el primer feedback (1-2 semanas)

Publicar en un par de sitios (Mastodon, r/bulletjournal, HN si parece listo) y mirar qué piden. El orden probable, sin anticiparse demasiado:

Exportar a Markdown y JSON. Migración de tareas no completadas al día siguiente (es el gesto clave del bullet journal analógico). Vista "mes" que sea solo una columna de días con las tareas abiertas. Búsqueda por texto en todas las entradas.

Aquí la regla es: implementar lo que pidan más de dos personas distintas, no lo que a ti te parezca bonito.

### Fase 3 — Permanencia (según tracción)

Solo si la fase 2 muestra uso real:

- PWA instalable (icono, offline completo, prompt de instalación)
- File System Access API para guardar en carpeta local del usuario
- Atajos avanzados (colecciones, índice, custom signifiers)
- Sync opcional E2E contra un provider (remoteStorage, Dropbox, iCloud Drive). Nunca obligatorio.

### Fase 4 — Graduación o deprecación

A los 3 meses de la publicación, decisión:

- Si hay >50 usuarios semanales activos → graduar, estabilizar, documentar.
- Si hay <10 → banner de deprecación, archivo en un mes, código open source y a otra cosa.

## Stack propuesto

**Frontend**: Svelte o SolidJS (los dos generan bundles pequeños y no necesitan virtual DOM para esto). Vite como bundler.

**Persistencia**: IndexedDB vía Dexie. No caer en localStorage — se llena rápido y es síncrono.

**Hosting**: Cloudflare Pages o Netlify. Estático 100%.

**Offline**: Service Worker desde el día 1 (vite-plugin-pwa hace esto en tres líneas).

**Nada de**: React, backend, auth, analítica invasiva, fuentes remotas pesadas.

## Cosas que expresamente no se hacen en el MVP

- Cuentas de usuario
- Sync entre dispositivos
- Multi-cuaderno
- Colores de tareas, etiquetas, prioridades
- Recordatorios / notificaciones
- Dark mode (llega cuando alguien lo pida)
- Colaboración

Cada una de estas añadiría complejidad que mata la tesis local-first minimalista. Se añaden solo si el uso real lo pide.

## Primer hito concreto

**Objetivo**: el próximo fin de semana, `jrnl.bzr.bz` funcionando con el flujo mínimo. Si el viernes por la noche no está el repo iniciado, la idea se pospone al siguiente puesto — no se arrastra.
