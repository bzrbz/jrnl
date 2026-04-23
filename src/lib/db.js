import Dexie from 'dexie'

export const db = new Dexie('jrnl')

db.version(1).stores({
  entries: '++id, date, createdAt'
})
