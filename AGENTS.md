# AGENTS.md — jrnl

Instrucciones para agentes de código que trabajen en este repo.

## Qué es jrnl

Bullet journal local-first que vive en el navegador. Lee `PLAN.md` para la tesis completa, las fases y los criterios de salida. Lee `README.md` para el resumen.

**Lo esencial que debes tener siempre presente:**
- **Local-first de verdad.** Sin servidor, sin cuenta, sin auth. Los datos están en IndexedDB y son del usuario.
- **Minimalismo honesto.** Sigue la notación de Ryder Carroll (`•` tarea, `—` nota, `○` evento, `>` `<` migración). No inventes símbolos nuevos "mejores".
- **Regla del fin de semana.** El MVP se tiene que poder terminar en un fin de semana largo. Si una propuesta te llevaría más, está mal dimensionada: córtala o apláchala.

## Stack

- **Frontend**: Svelte 5 o SolidJS (ambos son válidos; elegir uno y no mezclar). Vite como bundler.
- **Persistencia**: IndexedDB vía Dexie o `idb`. **Nunca localStorage** para datos de entradas — se llena rápido y es síncrono.
- **Offline / PWA**: Service Worker desde el día 1 (`vite-plugin-pwa`). El sitio debe funcionar sin conexión en cuanto se cargue la primera vez.
- **Hosting**: Cloudflare Pages o Netlify. 100% estático.
- **Nada de**: React, backend, auth, CDN pesado, fuentes webs que bloqueen el render.

Si vas a introducir una dependencia nueva, pregúntate: ¿ahorra realmente tiempo o solo añade superficie de bug? Prefiere código propio cuando la alternativa es una librería de 200kB.

## Ejecución y comandos

(Rellenar cuando exista `package.json`. Convenciones propuestas:)

```sh
npm install      # o pnpm install
npm run dev      # vite dev server, http://localhost:5173
npm run build    # bundle a dist/
npm run preview  # sirve el build localmente
npm run check    # svelte-check o equivalente
```

## Qué NO hacer en el MVP (Fase 1)

Está explícito en `PLAN.md`, pero como recordatorio para el agente:

- Cuentas de usuario, login, registro.
- Sync entre dispositivos.
- Multi-cuaderno / workspaces.
- Colores de tareas, etiquetas, prioridades, filtros avanzados.
- Recordatorios / notificaciones.
- Dark mode (llega cuando alguien lo pida de verdad).
- Colaboración.

Cualquiera de esos añadiría complejidad que rompe la tesis. Solo se incorporan si el feedback real de Fase 2 lo pide.

## Flujo de trabajo con el agente

- **Sesiones cortas, una por Fase o por ítem del checklist de `PLAN.md`.** Marca el checkbox cuando termines.
- Antes de escribir código, verifica que la tarea encaja con la Fase en curso. Si una petición del humano mezcla MVP con cosas de Fase 3, separa explícitamente.
- Commits atómicos, en español, con estilo conventional (`feat:`, `fix:`, `chore:`, `refactor:`…).
- Tests: en MVP, solo los imprescindibles (p. ej. serialización/deserialización de entradas, migración de tareas no completadas). No hacer TDD ortodoxo aquí.

## Criterios de "hecho" para una feature

1. Funciona en móvil y escritorio (el teclado físico debería tener atajos, el táctil no los necesita).
2. No rompe datos existentes de usuarios previos (migración de esquema si hace falta).
3. Pasa `npm run check` sin warnings nuevos.
4. El bundle no crece más de 10kB gzip sin justificación.
5. Se puede usar sin leer documentación. Si hace falta tooltip explicativo, el diseño está mal.
