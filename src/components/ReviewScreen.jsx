import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/db.js'
import { sm2 } from '../lib/sm2.js'
import SessionSummary from './SessionSummary.jsx'

const RATINGS = [
  { q: 1, label: 'Again', emoji: '✗',  cls: 'rating-1' },
  { q: 2, label: 'Hard',  emoji: '△',  cls: 'rating-2' },
  { q: 3, label: 'Good',  emoji: '◯',  cls: 'rating-3' },
  { q: 4, label: 'Easy',  emoji: '◎',  cls: 'rating-4' },
  { q: 5, label: 'Perf',  emoji: '★',  cls: 'rating-5' },
]

const ALL_FILTERS = ['All', 'Books', 'Articles', 'Notes']

export default function ReviewScreen() {
  const [allDue, setAllDue]       = useState([])
  const [deck, setDeck]           = useState([])
  const [idx, setIdx]             = useState(0)
  const [flipped, setFlipped]     = useState(false)
  const [filter, setFilter]       = useState('All')
  const [log, setLog]             = useState([])    // { quality, card_id }
  const [done, setDone]           = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => { loadDue() }, [])

  async function loadDue() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const due = await db.flashcards.where('due_date').belowOrEqual(today).toArray()
    setAllDue(due)
    applyFilter(due, filter)
    setLoading(false)
  }

  function applyFilter(cards, f) {
    const filtered = f === 'All' ? cards : cards.filter(c => c.category === f)
    setDeck(filtered)
    setIdx(0)
    setFlipped(false)
    setDone(false)
    setLog([])
  }

  function handleFilter(f) {
    setFilter(f)
    applyFilter(allDue, f)
  }

  async function handleRate(quality) {
    const card = { ...deck[idx] }
    const updated = sm2(card, quality)

    await db.flashcards.update(card.id, {
      interval:        updated.interval,
      repetitions:     updated.repetitions,
      ease_factor:     updated.ease_factor,
      due_date:        updated.due_date,
      last_reviewed_at: updated.last_reviewed_at,
    })

    await db.review_log.add({
      card_id:     card.id,
      quality,
      reviewed_at: new Date().toISOString(),
    })

    setLog(prev => [...prev, { quality, card_id: card.id }])

    if (idx + 1 >= deck.length) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
    }
  }

  function handleRestart() {
    loadDue()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Loading cards…</div>

  if (done) {
    return <SessionSummary log={log} onRestart={handleRestart} />
  }

  if (deck.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <p style={{ fontWeight: 600, fontSize: 18 }}>All caught up!</p>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
          No cards due{filter !== 'All' ? ` in ${filter}` : ''} today
        </p>
        {filter !== 'All' && (
          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => handleFilter('All')}>
            Show All Categories
          </button>
        )}
      </div>
    )
  }

  const card = deck[idx]
  const progress = idx / deck.length

  return (
    <>
      <div className="review-header">
        <div className="row review-count">
          <span>{deck.length - idx} card{deck.length - idx !== 1 ? 's' : ''} remaining</span>
          <span className="spacer" />
          <span className={`badge badge-${(card.category || 'Books').toLowerCase()}`}>{card.category}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="filter-pills">
        {ALL_FILTERS.map(f => (
          <button key={f} className={`pill${filter === f ? ' active' : ''}`} onClick={() => handleFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <div className="card flashcard" onClick={() => setFlipped(f => !f)}>
        <div className="flashcard-side">Question</div>
        <div className="flashcard-text">{card.front}</div>

        {flipped && (
          <>
            <hr className="flashcard-divider" />
            <div className="flashcard-side">Answer</div>
            <div className="flashcard-text">{card.back}</div>
          </>
        )}

        {!flipped && (
          <div className="flashcard-hint">Tap to reveal answer</div>
        )}
      </div>

      {flipped && (
        <>
          <div className="rating-grid">
            {RATINGS.map(({ q, label, emoji, cls }) => (
              <button key={q} className={`rating-btn ${cls}`} onClick={() => handleRate(q)}>
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-light)' }}>
            1–2 reset · 3–5 schedule next review
          </p>
        </>
      )}
    </>
  )
}
