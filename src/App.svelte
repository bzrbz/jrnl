<script>
  import { liveQuery } from 'dexie'
  import { db } from './lib/db.js'
  import { toDateStr, fromDateStr, formatDate } from './lib/utils.js'
  import { addEntry, toggleDone, deleteEntry, reorder, checkMigratable, migrate } from './lib/store.js'
  import Calendar  from './lib/Calendar.svelte'
  import HelpModal from './lib/HelpModal.svelte'
  import EntryList from './lib/EntryList.svelte'
  import './app.css'

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
    checkMigratable(currentDate).then(n => { migrateCount = n })
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
  function handleAdd(raw) { addEntry({ date: currentDate, raw }) }

  function handleDelete(id) {
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    if (pendingDelete) { clearTimeout(pendingDelete.timer); deleteEntry(pendingDelete.entry.id) }
    const timer = setTimeout(async () => { await deleteEntry(id); pendingDelete = null }, 4000)
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

  function handleReorder(fromId, toId) { reorder(entries, fromId, toId) }

  // ── Migration ──────────────────────────────
  async function handleMigrate() {
    await migrate(currentDate)
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
      <button onclick={handleMigrate}>migrar →</button>
    </div>
  {/if}

  <EntryList
    {entries}
    ontoggle={toggleDone}
    ondelete={handleDelete}
    onreorder={handleReorder}
    onadd={handleAdd}
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
