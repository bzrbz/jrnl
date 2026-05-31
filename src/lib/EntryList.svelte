<script>
  const SYMBOLS  = { task: '•', note: '—', event: '○' }
  const PREFIXES = { '.': 'task', '-': 'note', 'o': 'event' }

  let { entries, ontoggle, ondelete, onreorder, onadd, onedit } = $props()

  let editingId   = $state(null)
  let editingText = $state('')
  let dragStartId = $state(null)
  let dragOverId  = $state(null)
  let input       = $state('')

  const inputSymbol = $derived(
    input.startsWith('. ') ? '•' :
    input.startsWith('- ') ? '—' :
    input.startsWith('o ') ? '○' : '•'
  )

  function focusOnMount(node) { node.focus() }

  function startEdit(entry) {
    editingId   = entry.id
    editingText = (entry._orig ?? entry).text
  }

  function commitEdit(entry) {
    const text = editingText.trim()
    if (text) onedit(entry, text)
    editingId = null; editingText = ''
  }

  function cancelEdit() { editingId = null; editingText = '' }

  function addEntry() {
    const raw = input.trim()
    if (!raw) return
    onadd(raw)
    input = ''
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
      if (dragStartId !== null && dragOverId !== null) onreorder(dragStartId, dragOverId)
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
  function onEntryTouchMove(e) {
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
    if      (s.dx >  60) ontoggle(entry)
    else if (s.dx < -60) ondelete(entry.id)
  }
</script>

<ul class="entries" role="list">
  {#each entries as entry (entry.id)}
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
      ondrop={(e) => { e.preventDefault(); onreorder(dragStartId, entry.id); dragStartId = null; dragOverId = null }}
      ondragend={() => { dragStartId = null; dragOverId = null }}
      ontouchstart={(e) => onEntryTouchStart(e, entry)}
      ontouchmove={(e) => onEntryTouchMove(e)}
      ontouchend={(e) => onEntryTouchEnd(e, entry)}
    >
      <button
        class="symbol"
        onclick={() => ontoggle(entry)}
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
          <button class="action-btn action-btn--delete" onclick={() => ondelete(entry.id)} title="Borrar">×</button>
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
