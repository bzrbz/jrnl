<script>
  import { liveQuery } from 'dexie'
  import { db } from './lib/db.js'
  import './app.css'

  const SYMBOLS  = { task: '•', note: '—', event: '○' }
  const PREFIXES = { '.': 'task', '-': 'note', 'o': 'event' }

  function toDateStr(d)  { return d.toISOString().slice(0, 10) }
  function fromDateStr(s) { return new Date(s + 'T00:00:00') }
  function formatDate(s) {
    return fromDateStr(s).toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
  }

  function parseEntry(raw) {
    if (PREFIXES[raw[0]] && raw[1] === ' ') {
      return { type: PREFIXES[raw[0]], text: raw.slice(2) }
    }
    return { type: 'note', text: raw }
  }

  let currentDate = $state(toDateStr(new Date()))
  let entries     = $state([])
  let input       = $state('')

  $effect(() => {
    const date = currentDate
    const sub = liveQuery(() =>
      db.entries.where('date').equals(date).sortBy('createdAt')
    ).subscribe(rows => { entries = rows })
    return () => sub.unsubscribe()
  })

  async function addEntry() {
    const raw = input.trim()
    if (!raw) return
    const { type, text } = parseEntry(raw)
    await db.entries.add({
      date: currentDate,
      type,
      text,
      done: false,
      createdAt: Date.now()
    })
    input = ''
  }

  async function toggleDone(id, done) {
    await db.entries.update(id, { done: !done })
  }

  function navigate(delta) {
    const d = fromDateStr(currentDate)
    d.setDate(d.getDate() + delta)
    currentDate = toDateStr(d)
  }

  const isToday = $derived(currentDate === toDateStr(new Date()))
</script>

<main>
  <header>
    <button onclick={() => navigate(-1)} aria-label="Día anterior">←</button>
    <h1>
      <time datetime={currentDate}>{formatDate(currentDate)}</time>
      {#if isToday}<mark>hoy</mark>{/if}
    </h1>
    <button onclick={() => navigate(1)} aria-label="Día siguiente">→</button>
  </header>

  <ul class="entries" role="list">
    {#each entries as entry (entry.id)}
      <li class="entry entry--{entry.type}" class:done={entry.done}>
        <button
          class="symbol"
          onclick={() => toggleDone(entry.id, entry.done)}
          aria-label={entry.done ? 'Marcar pendiente' : 'Marcar completada'}
          aria-pressed={entry.done}
          disabled={entry.type !== 'task'}
        >{SYMBOLS[entry.type]}</button>
        <span class="text">{entry.text}</span>
      </li>
    {/each}
  </ul>

  {#if entries.length === 0}
    <p class="empty">Vacío. Escribe algo abajo.</p>
  {/if}

  <footer>
    <input
      type="text"
      bind:value={input}
      onkeydown={(e) => e.key === 'Enter' && addEntry()}
      placeholder=". tarea · - nota · o evento"
      autocomplete="off"
      spellcheck="false"
    />
    <button onclick={addEntry} aria-label="Añadir">+</button>
  </footer>
</main>
