import { useState } from 'react'
import { db } from '../lib/db.js'
import { seedIfEmpty } from '../lib/db.js'

export default function Settings({ onBack }) {
  const [msg, setMsg] = useState('')

  async function handleClearData() {
    if (!confirm('Delete all local notes, flashcards, and queue? This cannot be undone.')) return
    await db.notes.clear()
    await db.flashcards.clear()
    await db.queue.clear()
    await db.review_log.clear()
    await db.sync_queue.clear()
    setMsg('All local data cleared')
  }

  async function handleSeedSamples() {
    await db.flashcards.clear()
    await seedIfEmpty()
    setMsg('Sample flashcards reloaded')
  }

  return (
    <>
      <div className="note-viewer-back">
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 14 }} onClick={onBack}>
          ← Back
        </button>
      </div>

      <h1 className="screen-title">Settings</h1>

      {msg && (
        <div className="card" style={{ background: 'var(--accent-lt)', marginBottom: 16, color: 'var(--accent)', fontWeight: 600, textAlign: 'center' }}>
          {msg}
        </div>
      )}

      <div className="settings-section">
        <span className="settings-label">Google Drive</span>
        <div className="card">
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
            Drive sync is configured in Sprint 2. Add your Google Client ID to <code>src/config.js</code> to enable.
          </p>
          <button className="btn btn-ghost btn-full" disabled>
            Connect Google Drive
          </button>
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-label">Data</span>
        <div className="card stack">
          <button className="btn btn-ghost btn-full" onClick={handleSeedSamples}>
            Reload Sample Flashcards
          </button>
          <button
            className="btn btn-full"
            style={{ background: 'var(--danger)', color: '#fff' }}
            onClick={handleClearData}
          >
            Clear All Local Data
          </button>
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-label">About</span>
        <div className="card">
          <div className="settings-row">
            <span>Version</span>
            <span style={{ color: 'var(--text-muted)' }}>0.1.0 — Sprint 1</span>
          </div>
          <div className="settings-row">
            <span>Storage</span>
            <span style={{ color: 'var(--text-muted)' }}>IndexedDB (offline)</span>
          </div>
          <div className="settings-row" style={{ border: 'none' }}>
            <span>Drive sync</span>
            <span style={{ color: 'var(--text-muted)' }}>Not configured</span>
          </div>
        </div>
      </div>
    </>
  )
}
