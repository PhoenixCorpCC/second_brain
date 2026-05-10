import { describe, it, expect, beforeEach } from 'vitest'
import { sm2 } from './sm2.js'

function makeCard(overrides = {}) {
  return {
    interval: 1,
    repetitions: 0,
    ease_factor: 2.5,
    due_date: '2026-01-01',
    last_reviewed_at: null,
    ...overrides
  }
}

describe('sm2', () => {
  it('resets on quality < 3', () => {
    const card = makeCard({ repetitions: 5, interval: 30 })
    const result = sm2(card, 1)
    expect(result.repetitions).toBe(0)
    expect(result.interval).toBe(1)
  })

  it('resets on quality 2 (still a fail)', () => {
    const card = makeCard({ repetitions: 3, interval: 10 })
    const result = sm2(card, 2)
    expect(result.repetitions).toBe(0)
    expect(result.interval).toBe(1)
  })

  it('first pass sets interval to 1', () => {
    const card = makeCard({ repetitions: 0 })
    const result = sm2(card, 3)
    expect(result.interval).toBe(1)
    expect(result.repetitions).toBe(1)
  })

  it('second pass sets interval to 6', () => {
    const card = makeCard({ repetitions: 1, interval: 1 })
    const result = sm2(card, 3)
    expect(result.interval).toBe(6)
    expect(result.repetitions).toBe(2)
  })

  it('third pass multiplies by ease_factor', () => {
    const card = makeCard({ repetitions: 2, interval: 6, ease_factor: 2.5 })
    const result = sm2(card, 3)
    expect(result.interval).toBe(Math.round(6 * 2.5))
    expect(result.repetitions).toBe(3)
  })

  it('ease_factor increases on perfect (5)', () => {
    const card = makeCard({ ease_factor: 2.5 })
    const result = sm2(card, 5)
    expect(result.ease_factor).toBeGreaterThan(2.5)
  })

  it('ease_factor decreases on hard (2) — but clamped to >= 1.3', () => {
    const card = makeCard({ ease_factor: 1.4 })
    const result = sm2(card, 1)
    expect(result.ease_factor).toBeGreaterThanOrEqual(1.3)
  })

  it('ease_factor never drops below 1.3', () => {
    let card = makeCard({ ease_factor: 2.5 })
    for (let i = 0; i < 20; i++) card = sm2({ ...card }, 1)
    expect(card.ease_factor).toBeGreaterThanOrEqual(1.3)
  })

  it('due_date is set to a future date string', () => {
    const card = makeCard()
    const result = sm2(card, 4)
    expect(result.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.due_date >= new Date().toISOString().split('T')[0]).toBe(true)
  })

  it('last_reviewed_at is set to an ISO string', () => {
    const card = makeCard()
    const result = sm2(card, 3)
    expect(result.last_reviewed_at).toBeTruthy()
    expect(new Date(result.last_reviewed_at).getTime()).not.toBeNaN()
  })

  it('good rating does not change ease_factor drastically', () => {
    const card = makeCard({ ease_factor: 2.5 })
    const result = sm2(card, 3)
    expect(Math.abs(result.ease_factor - 2.5)).toBeLessThan(0.15)
  })
})
