<script>
  import { liveQuery } from 'dexie'
  import { db } from './lib/db.js'
  import './app.css'

  const SYMBOLS  = { task: '•', note: '—', event: '○' }
  const PREFIXES = { '.': 'task', '-': 'note', 'o': 'event' }

  function toDateStr(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
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
    return { type: 'task', text: raw }
  }

  function focusOnMount(node) {
    node.focus()
  }

  let currentDate = $state(toDateStr(new Date()))
  let entries     = $state([])
  let input       = $state('')
  let editing     = $state(false)
  let editingId   = $state(null)
  let editingText = $state('')
  let dragStartId = $state(null)
  let dragOverId  = $state(null)

  const inputSymbol = $derived(
    input.startsWith('. ') ? '•' :
    input.startsWith('- ') ? '—' :
    input.startsWith('o ') ? '○' : '•'
  )

  $effect(() => {
    const date = currentDate
    const sub = liveQuery(() =>
      db.entries.where('date').equals(date).toArray()
    ).subscribe(rows => {
      entries = rows.sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))
    })
    return () => sub.unsubscribe()
  })

  $effect(() => {
    function onKeydown(e) {
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1) }
    }
    document.addEventListener('keydown', onKeydown)
    return () => document.removeEventListener('keydown', onKeydown)
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
      createdAt: Date.now(),
      order: Date.now()
    })
    input = ''
  }

  async function toggleDone(id, done) {
    await db.entries.update(id, { done: !done })
  }

  async function deleteEntry(id) {
    await db.entries.delete(id)
  }

  function startEdit(entry) {
    editingId   = entry.id
    editingText = entry.text
  }

  async function commitEdit(entry) {
    const text = editingText.trim()
    if (text && text !== entry.text) {
      await db.entries.update(entry.id, { text })
    }
    editingId   = null
    editingText = ''
  }

  function cancelEdit() {
    editingId   = null
    editingText = ''
  }

  function navigate(delta) {
    const d = fromDateStr(currentDate)
    d.setDate(d.getDate() + delta)
    currentDate = toDateStr(d)
  }

  function onDatePick(e) {
    if (e.target.value) currentDate = e.target.value
    editing = false
  }

  async function reorder(fromId, toId) {
    if (fromId === toId) return
    const fromIdx = entries.findIndex(e => e.id === fromId)
    const toIdx   = entries.findIndex(e => e.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...entries]
    const [item] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, item)
    await db.transaction('rw', db.entries, async () => {
      for (let i = 0; i < reordered.length; i++) {
        await db.entries.update(reordered[i].id, { order: i })
      }
    })
  }

  const isToday = $derived(currentDate === toDateStr(new Date()))
</script>

<main>
  <header>
    <button onclick={() => navigate(-1)} aria-label="Día anterior">←</button>
    <h1>
      {#if editing}
        <input
          type="date"
          use:focusOnMount
          value={currentDate}
          onchange={onDatePick}
          onblur={() => { editing = false }}
          onkeydown={(e) => e.key === 'Escape' && (editing = false)}
        />
      {:else}
        <time
          datetime={currentDate}
          onclick={() => { editing = true }}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (editing = true)}
          role="button"
          tabindex="0"
          title="Seleccionar fecha"
        >{formatDate(currentDate)}</time>
        {#if isToday}<mark>hoy</mark>{/if}
      {/if}
    </h1>
    <button onclick={() => navigate(1)} aria-label="Día siguiente">→</button>
  </header>

  <ul class="entries" role="list">
    {#each entries as entry (entry.id)}
      <li
        class="entry entry--{entry.type}"
        class:done={entry.done}
        class:dragging={dragStartId === entry.id}
        class:drag-over={dragOverId === entry.id && dragStartId !== entry.id}
        draggable="true"
        ondragstart={(e) => { dragStartId = entry.id; e.dataTransfer.effectAllowed = 'move' }}
        ondragover={(e) => { e.preventDefault(); dragOverId = entry.id }}
        ondragleave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) dragOverId = null }}
        ondrop={(e) => { e.preventDefault(); reorder(dragStartId, entry.id); dragStartId = null; dragOverId = null }}
        ondragend={() => { dragStartId = null; dragOverId = null }}
      >
        <button
          class="symbol"
          onclick={() => toggleDone(entry.id, entry.done)}
          aria-label={entry.done ? 'Marcar pendiente' : 'Marcar completada'}
          aria-pressed={entry.done}
          disabled={entry.type !== 'task'}
        >{SYMBOLS[entry.type]}</button>

        {#if editingId === entry.id}
          <input
            class="text text--edit"
            use:focusOnMount
            bind:value={editingText}
            onkeydown={(e) => {
              if (e.key === 'Enter')  commitEdit(entry)
              if (e.key === 'Escape') cancelEdit()
            }}
            onblur={() => commitEdit(entry)}
            autocomplete="off"
            spellcheck="false"
            aria-label="Editar entrada"
          />
        {:else}
          <span class="text">{entry.text}</span>
          <span class="entry-actions" aria-hidden="true">
            <button class="action-btn drag-handle" title="Arrastrar para reordenar" aria-label="Reordenar">⠿</button>
            <button class="action-btn" onclick={() => startEdit(entry)} title="Editar">✎</button>
            <button class="action-btn action-btn--delete" onclick={() => deleteEntry(entry.id)} title="Borrar">×</button>
          </span>
        {/if}
      </li>
    {/each}

    <li class="entry new-entry">
      <span class="symbol" aria-hidden="true">{inputSymbol}</span>
      <input
        type="text"
        bind:value={input}
        onkeydown={(e) => e.key === 'Enter' && addEntry()}
        placeholder=". tarea · - nota · o evento"
        autocomplete="off"
        spellcheck="false"
        aria-label="Nueva entrada"
      />
    </li>
  </ul>
</main>
