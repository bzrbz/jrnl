# jrnl

> Bullet journal local-first. Todo el estado en tu dispositivo, nada en un servidor ajeno.

Un puesto de [bzr.bz](https://bzr.bz). Destino: [jrnl.bzr.bz](https://jrnl.bzr.bz).

**Estado:** 🟢 MVP publicado · en recogida de feedback

## Qué es

Un bullet journal que vive en tu navegador. Sin cuenta. Sin servidor. Abres la URL y escribes. La notación sigue la del bullet journal analógico de Ryder Carroll (`•` tareas, `—` notas, `○` eventos). Los datos se guardan en IndexedDB y son tuyos: exportables, portables, intransferibles por diseño.

La tesis: la mayoría de apps de notas son demasiado para lo que la gente realmente hace, que es una lista diaria de cosas, tachadas o no.

## Qué tiene el MVP

- **Entradas** — prefijos de texto: `. tarea`, `- nota`, `o evento`. Un campo, Enter, y ya.
- **Dark mode** — sigue `prefers-color-scheme` del sistema, misma paleta que bzr.bz.
- **Calendario** — click en la fecha abre un widget mensual con puntos en días con entradas.
- **Migración de tareas** — banner cuando hay pendientes de días anteriores. Crea referencias (`›`) al original, no copias; editar o completar actúa sobre el original en cualquier día.
- **Onboarding** — modal en la primera visita explicando la notación y los gestos. Botón `?` para reabrirlo.
- **Reordenar** — drag & drop en desktop; handle táctil en móvil.
- **Swipe** — deslizar → completa la tarea, deslizar ← la borra.
- **Undo al borrar** — toast de 4s con botón para deshacer.
- **PWA instalable** — funciona offline, se puede instalar como app.
- **Tests** — 53 tests (unit + UI) con Vitest, CI en GitHub Actions.

## Stack

Svelte 5 · Dexie 4 (IndexedDB) · Vite · vite-plugin-pwa · Vitest + @testing-library/svelte · Netlify

## Plan de trabajo

Las fases, los riesgos y lo que **no** se hace están en [`PLAN.md`](./PLAN.md).

## Contribuir

El bazar es abierto. Si quieres probar la app, usarla y decirme qué falla, mejor que un PR. Issues bienvenidas.

## Licencia

MIT.
