<script>
  import { liveQuery } from 'dexie'
  import { db } from './lib/db.js'
  import Calendar  from './lib/Calendar.svelte'
  import HelpModal from './lib/HelpModal.svelte'
  import EntryList from './lib/EntryList.svelte'
  import './app.css'

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
  function parseRaw(raw) {
    if (PREFIXES[raw[0]] && raw[1] === ' ') return { type: PREFIXES[raw[0]], text: raw.slice(2) }
    return { type: 'task', text: raw }
  }

  // ── State ──────────────────────────────────
  let currentDate   = $state(toDateStr(new Date()))
  let entries       = $state([])
  let pendingDelete = $state(null)
  let migrateCount  = $state(0)
  let showHelp      = $state(!localStorage.getItem('jrnl-onboarded'))
  let showCalendar  = $state(false)

  const isToday = $derived(currentDate === toDateStr(new Date()))

  // ── Live query with ref resolution ─────────
  $effect(() => {
    const date = currentDate
    const sub = liveQuery(async () => {
      const rows = await db.entries.where('date').equals(date).toArray()
      const refIds = rows.filter(r => r.refId).map(r => r.refId)
      if (refIds.length) {
        const originals = await db.entries.bulkGet(refIds)
        const origMap = {}
        originals.forEach((o, i) => { if (o) origMap[refIds[i]] = o })
        return rows.map(r => r.refId ? { ...r, _orig: origMap[r.refId] } : r)
      }
      return rows
    }).subscribe(rows => {
      entries = rows.sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))
    })
    return () => sub.unsubscribe()
  })

  // ── Migratable tasks ───────────────────────
  $effect(() => {
    const date = currentDate
    db.entries.filter(e => e.date < date && !e.done && e.type === 'task' && !e.refId)
      .toArray().then(async past => {
        if (!past.length) { migrateCount = 0; return }
        const refs = await db.entries.where('date').equals(date).filter(e => !!e.refId).toArray()
        const refed = new Set(refs.map(e => e.refId))
        migrateCount = past.filter(e => !refed.has(e.id)).length
      })
  })

  // ── Keyboard shortcuts ─────────────────────
  $effect(() => {
    function onKeydown(e) {
      if (e.key === 'Escape') {
        if (showHelp) { closeHelp(); return }
        if (showCalendar) { showCalendar = false; return }
      }
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1) }
    }
    document.addEventListener('keydown', onKeydown)
    return () => document.removeEventListener('keydown', onKeydown)
  })

  // ── Navigation ─────────────────────────────
  function navigate(delta) {
    const d = fromDateStr(currentDate)
    d.setDate(d.getDate() + delta)
    currentDate = toDateStr(d)
  }

  function onCalendarSelect(dateStr) {
    if (dateStr) currentDate = dateStr
    showCalendar = false
  }

  // ── Help ───────────────────────────────────
  function closeHelp() { localStorage.setItem('jrnl-onboarded', '1'); showHelp = false }

  // ── Entry ops ──────────────────────────────
  async function addEntry(raw) {
    const { type, text } = parseRaw(raw)
    await db.entries.add({
      date: currentDate, type, text,
      done: false, createdAt: Date.now(), order: Date.now()
    })
  }

  async function toggleDone(entry) {
    const targetId = entry.refId ?? entry.id
    const isDone   = entry._orig ? entry._orig.done : entry.done
    await db.entries.update(targetId, { done: !isDone })
  }

  function deleteEntry(id) {
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    if (pendingDelete) { clearTimeout(pendingDelete.timer); db.entries.delete(pendingDelete.entry.id) }
    const timer = setTimeout(async () => { await db.entries.delete(id); pendingDelete = null }, 4000)
    pendingDelete = { entry, timer }
  }

  function undoDelete() {
    if (!pendingDelete) return
    clearTimeout(pendingDelete.timer)
    pendingDelete = null
  }

  async function editEntry(entry, text) {
    const targetId    = entry.refId ?? entry.id
    const currentText = (entry._orig ?? entry).text
    if (text !== currentText) await db.entries.update(targetId, { text })
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

  // ── Migration ──────────────────────────────
  async function migrate() {
    const date = currentDate
    const past = await db.entries
      .filter(e => e.date < date && !e.done && e.type === 'task' && !e.refId).toArray()
    const refs  = await db.entries.where('date').equals(date).filter(e => !!e.refId).toArray()
    const refed = new Set(refs.map(e => e.refId))
    const now   = Date.now()
    await db.entries.bulkAdd(
      past.filter(e => !refed.has(e.id)).map((e, i) => ({
        date, type: 'ref', text: '', refId: e.id,
        done: false, createdAt: now + i, order: now + i
      }))
    )
    migrateCount = 0
  }
</script>

<main>
  <header>
    <button onclick={() => navigate(-1)} aria-label="Día anterior">←</button>
    <h1>
      <time
        datetime={currentDate}
        onclick={() => { showCalendar = true }}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (showCalendar = true)}
        role="button" tabindex="0" title="Abrir calendario"
      >{formatDate(currentDate)}</time>
      {#if isToday}<mark>hoy</mark>{/if}
    </h1>
    <button onclick={() => navigate(1)} aria-label="Día siguiente">→</button>
  </header>

  {#if showCalendar}
    <Calendar {currentDate} onselect={onCalendarSelect} />
  {/if}

  {#if migrateCount > 0}
    <div class="migrate-banner">
      <span>{migrateCount} {migrateCount === 1 ? 'tarea pendiente' : 'tareas pendientes'} de días anteriores</span>
      <button onclick={migrate}>migrar →</button>
    </div>
  {/if}

  <EntryList
    {entries}
    ontoggle={toggleDone}
    ondelete={deleteEntry}
    onreorder={reorder}
    onadd={addEntry}
    onedit={editEntry}
  />

  {#if pendingDelete}
    <div class="toast" role="status">
      <span>entrada borrada</span>
      <button onclick={undoDelete}>deshacer</button>
    </div>
  {/if}
</main>

{#if showHelp}
  <HelpModal onclose={closeHelp} />
{/if}

<button class="help-btn" onclick={() => { showHelp = true }} aria-label="Ayuda">?</button>
