<script>
  import { liveQuery } from 'dexie'
  import { db } from './lib/db.js'
  import './app.css'

  const SYMBOLS  = { task: '•', note: '—', event: '○' }
  const PREFIXES = { '.': 'task', '-': 'note', 'o': 'event' }
  const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

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
  function focusOnMount(node) { node.focus() }

  // ── State ──────────────────────────────────
  let currentDate   = $state(toDateStr(new Date()))
  let entries       = $state([])
  let input         = $state('')
  let editingId     = $state(null)
  let editingText   = $state('')
  let dragStartId   = $state(null)
  let dragOverId    = $state(null)
  let pendingDelete = $state(null)
  let migrateCount  = $state(0)
  let showHelp      = $state(!localStorage.getItem('jrnl-onboarded'))
  let showCalendar  = $state(false)
  let calMonth      = $state(currentDate.slice(0, 7))  // 'YYYY-MM'
  let daysWithData  = $state(new Set())

  function closeHelp() { localStorage.setItem('jrnl-onboarded', '1'); showHelp = false }
  function openCalendar() { calMonth = currentDate.slice(0, 7); showCalendar = true }
  function closeCalendar() { showCalendar = false }

  // ── Calendar helpers ───────────────────────
  function calDays(ym) {
    const [y, m] = ym.split('-').map(Number)
    const first = new Date(y, m - 1, 1)
    // Monday-first: 0=Mon … 6=Sun
    const startDow = (first.getDay() + 6) % 7
    const daysInMonth = new Date(y, m, 0).getDate()
    const cells = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${ym}-${String(d).padStart(2, '0')}`)
    }
    return cells
  }

  function prevMonth(ym) {
    const [y, m] = ym.split('-').map(Number)
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
  }
  function nextMonth(ym) {
    const [y, m] = ym.split('-').map(Number)
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  }
  function monthLabel(ym) {
    const [y, m] = ym.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  }

  // ── Load days-with-data for calendar ───────
  $effect(() => {
    const ym = calMonth
    const [y, m] = ym.split('-').map(Number)
    const start = `${ym}-01`
    const end   = `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    liveQuery(() =>
      db.entries.where('date').between(start, end, true, true).keys()
    ).subscribe(keys => {
      daysWithData = new Set(keys)
    })
  })

  // ── Derived ────────────────────────────────
  const visibleEntries = $derived(
    pendingDelete ? entries.filter(e => e.id !== pendingDelete.entry.id) : entries
  )
  const inputSymbol = $derived(
    input.startsWith('. ') ? '•' :
    input.startsWith('- ') ? '—' :
    input.startsWith('o ') ? '○' : '•'
  )
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

  async function checkMigratable(date) {
    const pastUndone = await db.entries
      .filter(e => e.date < date && !e.done && e.type === 'task' && !e.refId)
      .toArray()
    if (!pastUndone.length) return 0
    const existingRefs = await db.entries.where('date').equals(date)
      .filter(e => !!e.refId).toArray()
    const referencedIds = new Set(existingRefs.map(e => e.refId))
    return pastUndone.filter(e => !referencedIds.has(e.id)).length
  }

  async function migrate() {
    const date = currentDate
    const pastUndone = await db.entries
      .filter(e => e.date < date && !e.done && e.type === 'task' && !e.refId)
      .toArray()
    const existingRefs = await db.entries.where('date').equals(date)
      .filter(e => !!e.refId).toArray()
    const referencedIds = new Set(existingRefs.map(e => e.refId))
    const toMigrate = pastUndone.filter(e => !referencedIds.has(e.id))
    const now = Date.now()
    await db.entries.bulkAdd(toMigrate.map((e, i) => ({
      date, type: 'ref', text: '', refId: e.id,
      done: false, createdAt: now + i, order: now + i
    })))
    migrateCount = 0
  }

  // ── Keyboard shortcuts ─────────────────────
  $effect(() => {
    function onKeydown(e) {
      if (e.key === 'Escape') {
        if (showHelp) { closeHelp(); return }
        if (showCalendar) { closeCalendar(); return }
      }
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1) }
    }
    document.addEventListener('keydown', onKeydown)
    return () => document.removeEventListener('keydown', onKeydown)
  })

  // ── Entry CRUD ─────────────────────────────
  async function addEntry() {
    const raw = input.trim()
    if (!raw) return
    const { type, text } = parseEntry(raw)
    await db.entries.add({
      date: currentDate, type, text,
      done: false, createdAt: Date.now(), order: Date.now()
    })
    input = ''
  }

  async function toggleDone(entry) {
    const targetId  = entry.refId ?? entry.id
    const isDone    = entry._orig ? entry._orig.done : entry.done
    await db.entries.update(targetId, { done: !isDone })
  }

  function deleteEntry(id) {
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    if (pendingDelete) {
      clearTimeout(pendingDelete.timer)
      db.entries.delete(pendingDelete.entry.id)
    }
    const timer = setTimeout(async () => {
      await db.entries.delete(id)
      pendingDelete = null
    }, 4000)
    pendingDelete = { entry, timer }
  }

  function undoDelete() {
    if (!pendingDelete) return
    clearTimeout(pendingDelete.timer)
    pendingDelete = null
  }

  function startEdit(entry) {
    editingId   = entry.id
    editingText = (entry._orig ?? entry).text
  }

  async function commitEdit(entry) {
    const text = editingText.trim()
    if (text) {
      const targetId    = entry.refId ?? entry.id
      const currentText = (entry._orig ?? entry).text
      if (text !== currentText) await db.entries.update(targetId, { text })
    }
    editingId = null; editingText = ''
  }

  function cancelEdit() { editingId = null; editingText = '' }

  function navigate(delta) {
    const d = fromDateStr(currentDate)
    d.setDate(d.getDate() + delta)
    currentDate = toDateStr(d)
  }

  function goToDay(dateStr) {
    if (!dateStr) return
    currentDate = dateStr
    closeCalendar()
  }

  // ── Reorder ────────────────────────────────
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

  // ── Touch drag-to-reorder ──────────────────
  function onHandleTouchStart(e, entryId) {
    e.preventDefault(); e.stopPropagation()
    dragStartId = entryId
    function onMove(ev) {
      ev.preventDefault()
      const li = document.elementFromPoint(ev.touches[0].clientX, ev.touches[0].clientY)
        ?.closest('[data-entry-id]')
      dragOverId = li ? Number(li.dataset.entryId) : null
    }
    function onEnd() {
      if (dragStartId !== null && dragOverId !== null) reorder(dragStartId, dragOverId)
      dragStartId = null; dragOverId = null
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
  }

  // ── Swipe on entry ─────────────────────────
  function onEntryTouchStart(e, _entry) {
    if (e.target.closest('.drag-handle')) return
    const t = e.touches[0]
    e.currentTarget._swipe = { x: t.clientX, y: t.clientY, dx: 0, locked: false }
  }
  function onEntryTouchMove(e, _entry) {
    const s = e.currentTarget._swipe
    if (!s || s.locked) return
    const dx = e.touches[0].clientX - s.x
    const dy = e.touches[0].clientY - s.y
    if (!s.started && Math.abs(dy) > Math.abs(dx)) { s.locked = true; return }
    s.started = true
    e.preventDefault()
    s.dx = dx
    const clamped = Math.max(-80, Math.min(80, dx))
    e.currentTarget.style.transition = 'none'
    e.currentTarget.style.transform  = `translateX(${clamped}px)`
    e.currentTarget.style.opacity    = String(1 - Math.abs(clamped) / 200)
  }
  function onEntryTouchEnd(e, entry) {
    const el = e.currentTarget, s = el._swipe
    el._swipe = null
    el.style.transition = 'transform 0.2s ease, opacity 0.2s ease'
    el.style.transform = ''; el.style.opacity = ''
    if (!s || s.locked || !s.started) return
    if      (s.dx >  60) toggleDone(entry)
    else if (s.dx < -60) deleteEntry(entry.id)
  }
</script>

<main>
  <header>
    <button onclick={() => navigate(-1)} aria-label="Día anterior">←</button>
    <h1>
      <time
        datetime={currentDate}
        onclick={openCalendar}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && openCalendar()}
        role="button"
        tabindex="0"
        title="Abrir calendario"
      >{formatDate(currentDate)}</time>
      {#if isToday}<mark>hoy</mark>{/if}
    </h1>
    <button onclick={() => navigate(1)} aria-label="Día siguiente">→</button>
  </header>

  <!-- Calendar popover -->
  {#if showCalendar}
    <div class="cal-backdrop" onclick={closeCalendar} role="presentation">
      <div class="cal" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Calendario">
        <div class="cal-nav">
          <button onclick={() => calMonth = prevMonth(calMonth)} aria-label="Mes anterior">←</button>
          <span>{monthLabel(calMonth)}</span>
          <button onclick={() => calMonth = nextMonth(calMonth)} aria-label="Mes siguiente">→</button>
        </div>
        <div class="cal-grid">
          {#each WEEKDAYS as wd}
            <span class="cal-wd">{wd}</span>
          {/each}
          {#each calDays(calMonth) as dateStr}
            {#if dateStr === null}
              <span></span>
            {:else}
              {@const day = Number(dateStr.slice(8))}
              {@const todayStr = toDateStr(new Date())}
              <button
                class="cal-day"
                class:today={dateStr === todayStr}
                class:selected={dateStr === currentDate}
                class:has-data={daysWithData.has(dateStr)}
                onclick={() => goToDay(dateStr)}
              >{day}</button>
            {/if}
          {/each}
        </div>
      </div>
    </div>
  {/if}

  {#if migrateCount > 0}
    <div class="migrate-banner">
      <span>{migrateCount} {migrateCount === 1 ? 'tarea pendiente' : 'tareas pendientes'} de días anteriores</span>
      <button onclick={migrate}>migrar →</button>
    </div>
  {/if}

  <ul class="entries" role="list">
    {#each visibleEntries as entry (entry.id)}
      {@const display = entry._orig ?? entry}
      {@const isDone  = display.done}
      {@const isRef   = !!entry.refId}
      <li
        class="entry entry--{isRef ? 'ref' : display.type}"
        class:done={isDone}
        class:dragging={dragStartId === entry.id}
        class:drag-over={dragOverId === entry.id && dragStartId !== entry.id}
        data-entry-id={entry.id}
        draggable="true"
        ondragstart={(e) => { dragStartId = entry.id; e.dataTransfer.effectAllowed = 'move' }}
        ondragover={(e) => { e.preventDefault(); dragOverId = entry.id }}
        ondragleave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) dragOverId = null }}
        ondrop={(e) => { e.preventDefault(); reorder(dragStartId, entry.id); dragStartId = null; dragOverId = null }}
        ondragend={() => { dragStartId = null; dragOverId = null }}
        ontouchstart={(e) => onEntryTouchStart(e, entry)}
        ontouchmove={(e) => onEntryTouchMove(e, entry)}
        ontouchend={(e) => onEntryTouchEnd(e, entry)}
      >
        <button
          class="symbol"
          onclick={() => toggleDone(entry)}
          aria-label={isDone ? 'Marcar pendiente' : 'Marcar completada'}
          aria-pressed={isDone}
          disabled={!isRef && display.type !== 'task'}
        >{isRef ? '›' : SYMBOLS[display.type]}</button>

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
            autocomplete="off" spellcheck="false"
            aria-label="Editar entrada"
          />
        {:else}
          <span class="text">{display.text}</span>
          <span class="entry-actions" aria-hidden="true">
            <button class="action-btn drag-handle" title="Reordenar" aria-label="Reordenar"
              ontouchstart={(e) => onHandleTouchStart(e, entry.id)}>⠿</button>
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
        autocomplete="off" spellcheck="false"
        aria-label="Nueva entrada"
      />
    </li>
  </ul>

  {#if pendingDelete}
    <div class="toast" role="status">
      <span>entrada borrada</span>
      <button onclick={undoDelete}>deshacer</button>
    </div>
  {/if}
</main>

<!-- Onboarding modal -->
{#if showHelp}
  <div class="modal-backdrop" onclick={closeHelp} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Cómo funciona jrnl">
      <h2>jrnl</h2>
      <p class="modal-sub">un bullet journal que vive en tu navegador</p>

      <dl class="modal-list">
        <div><dt><code>. tarea</code></dt><dd>crea una tarea</dd></div>
        <div><dt><code>- nota</code></dt><dd>crea una nota</dd></div>
        <div><dt><code>o evento</code></dt><dd>crea un evento</dd></div>
      </dl>

      <hr />

      <dl class="modal-list">
        <div><dt>← →</dt><dd>navegar entre días</dd></div>
        <div><dt>desliza →</dt><dd>completar tarea</dd></div>
        <div><dt>desliza ←</dt><dd>borrar</dd></div>
        <div><dt>⠿ mantén</dt><dd>reordenar</dd></div>
      </dl>

      <p class="modal-note">tus datos se quedan en este dispositivo.<br>sin cuenta, sin servidor.</p>

      <button class="modal-close" onclick={closeHelp}>entendido</button>
    </div>
  </div>
{/if}

<button class="help-btn" onclick={() => { showHelp = true }} aria-label="Ayuda">?</button>
