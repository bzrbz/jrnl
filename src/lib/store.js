import { db } from './db.js'
import { parseRaw } from './utils.js'

export async function addEntry({ date, raw }) {
  const { type, text } = parseRaw(raw)
  const now = Date.now()
  return db.entries.add({ date, type, text, done: false, createdAt: now, order: now })
}

export async function toggleDone(entry) {
  const targetId = entry.refId ?? entry.id
  const isDone   = entry._orig ? entry._orig.done : entry.done
  return db.entries.update(targetId, { done: !isDone })
}

export async function deleteEntry(id) {
  return db.entries.delete(id)
}

export async function reorder(entries, fromId, toId) {
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

export async function getEntriesForDate(date) {
  const rows = await db.entries.where('date').equals(date).toArray()
  const refIds = rows.filter(r => r.refId).map(r => r.refId)
  if (refIds.length) {
    const originals = await db.entries.bulkGet(refIds)
    const origMap = {}
    originals.forEach((o, i) => { if (o) origMap[refIds[i]] = o })
    return rows
      .map(r => r.refId ? { ...r, _orig: origMap[r.refId] } : r)
      .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))
  }
  return rows.sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))
}

export async function checkMigratable(date) {
  const past = await db.entries
    .filter(e => e.date < date && !e.done && e.type === 'task' && !e.refId)
    .toArray()
  if (!past.length) return 0
  const refs  = await db.entries.where('date').equals(date).filter(e => !!e.refId).toArray()
  const refed = new Set(refs.map(e => e.refId))
  return past.filter(e => !refed.has(e.id)).length
}

export async function migrate(date) {
  const past  = await db.entries
    .filter(e => e.date < date && !e.done && e.type === 'task' && !e.refId)
    .toArray()
  const refs  = await db.entries.where('date').equals(date).filter(e => !!e.refId).toArray()
  const refed = new Set(refs.map(e => e.refId))
  const now   = Date.now()
  await db.entries.bulkAdd(
    past.filter(e => !refed.has(e.id)).map((e, i) => ({
      date, type: 'ref', text: '', refId: e.id,
      done: false, createdAt: now + i, order: now + i
    }))
  )
}
