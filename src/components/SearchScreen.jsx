import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/db.js'

function highlight(text, query) {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i}>{part}</mark>
      : part
  )
}

function excerpt(body = '', query = '', maxLen = 140) {
  if (!query.trim()) return body.slice(0, maxLen) + (body.length > maxLen ? '…' : '')
  const idx = body.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return body.slice(0, maxLen) + (body.length > maxLen ? '…' : '')
  const start = Math.max(0, idx - 40)
  const end   = Math.min(body.length, idx + query.length + 80)
  return (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '')
}

export default function SearchScreen({ onViewNote }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [all, setAll]         = useState([])
  const debounceRef = useRef(null)

  useEffect(() => {
    db.notes.toArray().then(notes => setAll(notes))
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(() => {
      const q = query.toLowerCase()
      const hits = all.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.body  || '').toLowerCase().includes(q)
      )
      setResults(hits.slice(0, 50))
    }, 200)
  }, [query, all])

  const TYPE_BADGE = { url: 'badge-pending', manual: 'badge-inbox', epub_chapter: 'badge-books' }

  return (
    <>
      <h1 className="screen-title">Search</h1>

      <div className="search-bar">
        <span className="search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search notes…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {query.trim() === '' && all.length === 0 && (
        <div className="search-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ fontWeight: 600 }}>No notes yet</p>
          <p style={{ fontSize: 14, marginTop: 4 }}>Capture your first note to start searching</p>
        </div>
      )}

      {query.trim() !== '' && results.length === 0 && (
        <div className="search-empty">
          <p style={{ fontWeight: 600 }}>No results for "{query}"</p>
        </div>
      )}

      {query.trim() === '' && all.length > 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          {all.length} note{all.length !== 1 ? 's' : ''} in Inbox
        </p>
      )}

      <div className="stack">
        {(query.trim() ? results : all.slice(0, 20)).map(note => (
          <div key={note.id} className="card result-item" onClick={() => onViewNote(note)}>
            <div className="row" style={{ marginBottom: 4 }}>
              <div className="result-title">{highlight(note.title || 'Untitled', query)}</div>
              <div className="spacer" />
              <span className={`badge ${TYPE_BADGE[note.source_type] || 'badge-inbox'}`}>
                {note.source_type}
              </span>
            </div>
            <div className="result-meta">
              {new Date(note.created_at).toLocaleDateString()} · {note.category}
            </div>
            {note.body && (
              <div className="result-excerpt">
                {highlight(excerpt(note.body, query), query)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
