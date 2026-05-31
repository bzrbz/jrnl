<script>
  import { liveQuery } from 'dexie'
  import { db } from './db.js'

  let { currentDate, onselect } = $props()

  const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  function toDateStr(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
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
  function calDays(ym) {
    const [y, m] = ym.split('-').map(Number)
    const startDow = (new Date(y, m - 1, 1).getDay() + 6) % 7
    const daysInMonth = new Date(y, m, 0).getDate()
    const cells = Array(startDow).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${ym}-${String(d).padStart(2, '0')}`)
    }
    return cells
  }

  let calMonth    = $state(currentDate.slice(0, 7))
  let daysWithData = $state(new Set())
  const todayStr   = toDateStr(new Date())

  $effect(() => {
    const ym = calMonth
    const [y, m] = ym.split('-').map(Number)
    const start = `${ym}-01`
    const end   = `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    const sub = liveQuery(() =>
      db.entries.where('date').between(start, end, true, true).keys()
    ).subscribe(keys => { daysWithData = new Set(keys) })
    return () => sub.unsubscribe()
  })
</script>

<div class="cal-backdrop" onclick={() => onselect(null)} role="presentation">
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
          <button
            class="cal-day"
            class:today={dateStr === todayStr}
            class:selected={dateStr === currentDate}
            class:has-data={daysWithData.has(dateStr)}
            onclick={() => onselect(dateStr)}
          >{Number(dateStr.slice(8))}</button>
        {/if}
      {/each}
    </div>
  </div>
</div>
