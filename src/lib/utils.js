export const PREFIXES = { '.': 'task', '-': 'note', 'o': 'event' }

export function toDateStr(d) {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromDateStr(s) {
  return new Date(s + 'T00:00:00')
}

export function formatDate(s) {
  return fromDateStr(s).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

export function parseRaw(raw) {
  if (PREFIXES[raw[0]] && raw[1] === ' ') {
    return { type: PREFIXES[raw[0]], text: raw.slice(2) }
  }
  return { type: 'task', text: raw }
}

// ── Calendar helpers ───────────────────────

export function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

export function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

// Returns an array of date strings (or null for empty leading cells).
// Week starts on Monday.
export function calDays(ym) {
  const [y, m] = ym.split('-').map(Number)
  const startDow   = (new Date(y, m - 1, 1).getDay() + 6) % 7  // 0=Mon … 6=Sun
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells = Array(startDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${ym}-${String(d).padStart(2, '0')}`)
  }
  return cells
}
