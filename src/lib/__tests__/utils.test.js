import { describe, it, expect } from 'vitest'
import { toDateStr, fromDateStr, parseRaw, prevMonth, nextMonth, calDays } from '../utils.js'

describe('toDateStr', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateStr(new Date(2024, 0, 5))).toBe('2024-01-05')
    expect(toDateStr(new Date(2024, 11, 31))).toBe('2024-12-31')
  })
})

describe('fromDateStr', () => {
  it('parses without timezone drift', () => {
    const d = fromDateStr('2024-03-15')
    expect(d.getFullYear()).toBe(2024)
    expect(d.getMonth()).toBe(2)
    expect(d.getDate()).toBe(15)
  })

  it('round-trips with toDateStr', () => {
    const s = '2024-07-04'
    expect(toDateStr(fromDateStr(s))).toBe(s)
  })
})

describe('parseRaw', () => {
  it('parses task prefix', () => {
    expect(parseRaw('. comprar pan')).toEqual({ type: 'task', text: 'comprar pan' })
  })

  it('parses note prefix', () => {
    expect(parseRaw('- reunión a las 10')).toEqual({ type: 'note', text: 'reunión a las 10' })
  })

  it('parses event prefix', () => {
    expect(parseRaw('o cumpleaños')).toEqual({ type: 'event', text: 'cumpleaños' })
  })

  it('defaults to task when no prefix', () => {
    expect(parseRaw('sin prefijo')).toEqual({ type: 'task', text: 'sin prefijo' })
  })

  it('requires a space after the prefix character', () => {
    expect(parseRaw('.sin espacio')).toEqual({ type: 'task', text: '.sin espacio' })
  })
})

describe('prevMonth / nextMonth', () => {
  it('goes back one month', () => {
    expect(prevMonth('2024-03')).toBe('2024-02')
    expect(prevMonth('2024-01')).toBe('2023-12')
  })

  it('goes forward one month', () => {
    expect(nextMonth('2024-03')).toBe('2024-04')
    expect(nextMonth('2024-12')).toBe('2025-01')
  })
})

describe('calDays', () => {
  it('returns the correct number of day cells for January 2024', () => {
    // Jan 2024: starts Monday (dow=1 → offset 0), 31 days
    const days = calDays('2024-01')
    const dateCells = days.filter(Boolean)
    expect(dateCells).toHaveLength(31)
    expect(dateCells[0]).toBe('2024-01-01')
    expect(dateCells[30]).toBe('2024-01-31')
  })

  it('pads leading nulls for months not starting on Monday', () => {
    // March 2024 starts on Friday (dow=5 → offset 4)
    const days = calDays('2024-03')
    expect(days[0]).toBeNull()
    expect(days[3]).toBeNull()
    expect(days[4]).toBe('2024-03-01')
  })

  it('covers February in a leap year', () => {
    const days = calDays('2024-02')
    const dateCells = days.filter(Boolean)
    expect(dateCells).toHaveLength(29)
    expect(dateCells[28]).toBe('2024-02-29')
  })

  it('total cells = leading nulls + days in month', () => {
    const days = calDays('2024-06')
    const nullCount = days.filter(d => d === null).length
    const dayCount  = days.filter(Boolean).length
    expect(dayCount).toBe(30)
    expect(days).toHaveLength(nullCount + 30)
  })
})
