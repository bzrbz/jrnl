import Dexie from 'dexie'

export const db = new Dexie('jrnl')

db.version(1).stores({
  entries: '++id, date, createdAt'
})

db.version(2).stores({
  entries: '++id, date, createdAt, order'
})

db.version(3).stores({
  entries: '++id, date, createdAt, order, refId'
})
