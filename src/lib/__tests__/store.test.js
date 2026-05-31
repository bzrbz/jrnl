import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db.js'
import {
  addEntry, toggleDone, deleteEntry, reorder,
  getEntriesForDate, checkMigratable, migrate
} from '../store.js'

const TODAY = '2024-06-15'
const YESTERDAY = '2024-06-14'

beforeEach(async () => {
  await db.entries.clear()
})

describe('addEntry', () => {
  it('inserts a task with correct fields', async () => {
    await addEntry({ date: TODAY, raw: '. comprar pan' })
    const rows = await db.entries.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ date: TODAY, type: 'task', text: 'comprar pan', done: false })
  })

  it('inserts a note', async () => {
    await addEntry({ date: TODAY, raw: '- reunión' })
    const [row] = await db.entries.toArray()
    expect(row.type).toBe('note')
    expect(row.text).toBe('reunión')
  })

  it('defaults to task when no prefix', async () => {
    await addEntry({ date: TODAY, raw: 'sin prefijo' })
    const [row] = await db.entries.toArray()
    expect(row.type).toBe('task')
    expect(row.text).toBe('sin prefijo')
  })

  it('sets createdAt and order', async () => {
    await addEntry({ date: TODAY, raw: '. algo' })
    const [row] = await db.entries.toArray()
    expect(row.createdAt).toBeTypeOf('number')
    expect(row.order).toBeTypeOf('number')
  })
})

describe('toggleDone', () => {
  it('marks a task as done', async () => {
    const id = await addEntry({ date: TODAY, raw: '. tarea' })
    const entry = await db.entries.get(id)
    await toggleDone(entry)
    const updated = await db.entries.get(id)
    expect(updated.done).toBe(true)
  })

  it('toggles done back to false', async () => {
    const id = await addEntry({ date: TODAY, raw: '. tarea' })
    let entry = await db.entries.get(id)
    await toggleDone(entry)
    entry = await db.entries.get(id)
    await toggleDone(entry)
    const updated = await db.entries.get(id)
    expect(updated.done).toBe(false)
  })

  it('toggles the original when entry is a ref', async () => {
    const origId = await addEntry({ date: YESTERDAY, raw: '. original' })
    const orig = await db.entries.get(origId)
    // simulate a ref entry
    const ref = { id: 999, refId: origId, done: false, _orig: orig }
    await toggleDone(ref)
    const updated = await db.entries.get(origId)
    expect(updated.done).toBe(true)
  })
})

describe('deleteEntry', () => {
  it('removes an entry from the DB', async () => {
    const id = await addEntry({ date: TODAY, raw: '. borrar' })
    await deleteEntry(id)
    const row = await db.entries.get(id)
    expect(row).toBeUndefined()
  })
})

describe('reorder', () => {
  it('updates order field after reorder', async () => {
    const id1 = await addEntry({ date: TODAY, raw: '. primero' })
    await new Promise(r => setTimeout(r, 2))
    const id2 = await addEntry({ date: TODAY, raw: '. segundo' })
    await new Promise(r => setTimeout(r, 2))
    const id3 = await addEntry({ date: TODAY, raw: '. tercero' })

    const entries = await getEntriesForDate(TODAY)
    // Move id3 to position 0 (before id1)
    await reorder(entries, id3, id1)

    const reordered = await getEntriesForDate(TODAY)
    expect(reordered[0].id).toBe(id3)
    expect(reordered[1].id).toBe(id1)
    expect(reordered[2].id).toBe(id2)
  })

  it('is a no-op when from === to', async () => {
    const id = await addEntry({ date: TODAY, raw: '. única' })
    const before = await db.entries.get(id)
    const entries = await getEntriesForDate(TODAY)
    await reorder(entries, id, id)
    const after = await db.entries.get(id)
    expect(after.order).toBe(before.order) // unchanged
  })
})

describe('getEntriesForDate', () => {
  it('returns entries sorted by order', async () => {
    await db.entries.bulkAdd([
      { date: TODAY, type: 'task', text: 'b', done: false, createdAt: 2, order: 2 },
      { date: TODAY, type: 'task', text: 'a', done: false, createdAt: 1, order: 1 },
    ])
    const entries = await getEntriesForDate(TODAY)
    expect(entries[0].text).toBe('a')
    expect(entries[1].text).toBe('b')
  })

  it('resolves _orig for ref entries', async () => {
    const origId = await addEntry({ date: YESTERDAY, raw: '. original' })
    await db.entries.add({
      date: TODAY, type: 'ref', text: '', refId: origId,
      done: false, createdAt: Date.now(), order: Date.now()
    })
    const entries = await getEntriesForDate(TODAY)
    const ref = entries.find(e => e.refId === origId)
    expect(ref._orig).toBeDefined()
    expect(ref._orig.text).toBe('original')
  })
})

describe('checkMigratable', () => {
  it('returns count of undone past tasks', async () => {
    await addEntry({ date: YESTERDAY, raw: '. pendiente' })
    const count = await checkMigratable(TODAY)
    expect(count).toBe(1)
  })

  it('does not count done tasks', async () => {
    const id = await addEntry({ date: YESTERDAY, raw: '. hecha' })
    await db.entries.update(id, { done: true })
    const count = await checkMigratable(TODAY)
    expect(count).toBe(0)
  })

  it('does not count tasks already migrated', async () => {
    const origId = await addEntry({ date: YESTERDAY, raw: '. ya migrada' })
    await db.entries.add({
      date: TODAY, type: 'ref', text: '', refId: origId,
      done: false, createdAt: Date.now(), order: Date.now()
    })
    const count = await checkMigratable(TODAY)
    expect(count).toBe(0)
  })

  it('does not count notes or events', async () => {
    await addEntry({ date: YESTERDAY, raw: '- nota pasada' })
    await addEntry({ date: YESTERDAY, raw: 'o evento pasado' })
    const count = await checkMigratable(TODAY)
    expect(count).toBe(0)
  })
})

describe('migrate', () => {
  it('creates ref records for past pending tasks', async () => {
    const origId = await addEntry({ date: YESTERDAY, raw: '. pendiente' })
    await migrate(TODAY)
    const todayEntries = await db.entries.where('date').equals(TODAY).toArray()
    expect(todayEntries).toHaveLength(1)
    expect(todayEntries[0].refId).toBe(origId)
    expect(todayEntries[0].type).toBe('ref')
  })

  it('does not duplicate refs if migrated twice', async () => {
    await addEntry({ date: YESTERDAY, raw: '. pendiente' })
    await migrate(TODAY)
    await migrate(TODAY)
    const todayEntries = await db.entries.where('date').equals(TODAY).toArray()
    expect(todayEntries).toHaveLength(1)
  })

  it('does not migrate done tasks', async () => {
    const id = await addEntry({ date: YESTERDAY, raw: '. hecha' })
    await db.entries.update(id, { done: true })
    await migrate(TODAY)
    const todayEntries = await db.entries.where('date').equals(TODAY).toArray()
    expect(todayEntries).toHaveLength(0)
  })

  it('original entry stays in its original date', async () => {
    await addEntry({ date: YESTERDAY, raw: '. original' })
    await migrate(TODAY)
    const yesterdayEntries = await db.entries.where('date').equals(YESTERDAY).toArray()
    expect(yesterdayEntries).toHaveLength(1)
  })
})
