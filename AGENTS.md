# AGENTS.md — jrnl

Instrucciones para agentes de código que trabajen en este repo.

## Qué es jrnl

Bullet journal local-first que vive en el navegador. Lee `PLAN.md` para la tesis completa, las fases y los criterios de salida. Lee `README.md` para el resumen.

**Lo esencial que debes tener siempre presente:**
- **Local-first de verdad.** Sin servidor, sin cuenta, sin auth. Los datos están en IndexedDB y son del usuario.
- **Minimalismo honesto.** Sigue la notación de Ryder Carroll (`•` tarea, `—` nota, `○` evento, `›` migración). No inventes símbolos nuevos "mejores".
- **Sin over-engineering.** Si una propuesta no cabe en una tarde, está mal dimensionada. Córtala.

## Stack actual

- **Frontend**: Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`). **No usar la API de opciones de Svelte 4.**
- **Persistencia**: IndexedDB vía Dexie 4 con `liveQuery`. Schema en `src/lib/db.js`, versionado (actualmente v3). **Nunca localStorage** para entradas.
- **Offline / PWA**: `vite-plugin-pwa` con `registerType: 'autoUpdate'`. Service Worker activo desde el día 1.
- **Hosting**: Netlify. 100% estático.
- **Tests**: Vitest 4. Unit/store en entorno `node` con `fake-indexeddb`. UI con `@testing-library/svelte` + `happy-dom`. Proyectos separados en `vite.config.js` (no usar `environmentMatchGlobs`, no existe en Vitest 4).
- **Nada de**: React, backend, auth, CDN pesado, fuentes web que bloqueen el render.

## Estructura de ficheros relevantes

```
src/
  App.svelte              — raíz: estado global, liveQuery, handlers
  app.css                 — estilos globales + dark mode
  lib/
    db.js                 — instancia Dexie, schema versionado
    utils.js              — helpers puros (parseRaw, calDays, toDateStr…)
    store.js              — operaciones de DB (addEntry, toggleDone, migrate…)
    Calendar.svelte       — widget de calendario, gestiona su propio mes
    HelpModal.svelte      — modal de onboarding/ayuda
    EntryList.svelte      — lista de entradas con drag, swipe, edición inline
    __tests__/
      utils.test.js       — tests de helpers puros
      store.test.js       — tests de operaciones de DB (fake-indexeddb)
      ui/
        HelpModal.test.js — tests de componente HelpModal
        EntryList.test.js — tests de componente EntryList
```

## Ejecución y comandos

```sh
npm install      # instalar dependencias
npm run dev      # vite dev server, http://localhost:5173
npm run build    # bundle a dist/
npm run preview  # sirve el build localmente
npm test         # vitest run (53 tests: unit + UI)
```

## Convenciones de código

- Svelte 5 runes únicamente. Nada de `export let`, `$:`, `createEventDispatcher`.
- Props con callbacks: `ontoggle`, `ondelete`, `onadd`, etc. (no `dispatch`).
- Commits en español, conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- Sin comentarios salvo que el WHY sea no obvio. Sin docstrings.

## Qué NO añadir sin feedback real

- Cuentas de usuario, login, registro.
- Sync entre dispositivos.
- Multi-cuaderno / workspaces.
- Colores de tareas, etiquetas, prioridades, filtros avanzados.
- Recordatorios / notificaciones.
- Colaboración.

Cualquiera de esos añadiría complejidad que rompe la tesis. Solo se incorporan si el feedback real de Fase 2 lo pide (>2 personas distintas).

## Criterios de "hecho" para una feature

1. Funciona en móvil y escritorio.
2. No rompe datos existentes (migración de esquema Dexie si hace falta).
3. `npm test` pasa al 100%. Si la feature tiene lógica nueva, tiene test.
4. El bundle no crece más de 10kB gzip sin justificación.
5. Se puede usar sin leer documentación.
