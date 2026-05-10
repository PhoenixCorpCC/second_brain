import { useState, useEffect } from 'react'
import { db, seedIfEmpty } from '../lib/db.js'
import { isConnected, startAuth, disconnect, getLastSynced } from '../lib/drive.js'

export default function Settings({ onBack, onSync }) {
  const [connected, setConnected]   = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [syncing, setSyncing]       = useState(false)
  const [msg, setMsg]               = useState('')

  useEffect(() => { loadStatus() }, [])

  async function loadStatus() {
    setConnected(await isConnected())
    setLastSynced(await getLastSynced())
  }

  async function handleConnect() {
    await startAuth() // redirects — page unloads
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Google Drive? Local data is kept.')) return
    await disconnect()
    setConnected(false)
    setLastSynced(null)
    showMsg('Drive disconnected')
  }

  async function handleSyncNow() {
    setSyncing(true)
    await onSync()
    await loadStatus()
    setSyncing(false)
    showMsg('Sync complete')
  }

  async function handleClearData() {
    if (!confirm('Delete all local notes, flashcards, and queue? This cannot be undone.')) return
    await db.notes.clear()
    await db.flashcards.clear()
    await db.queue.clear()
    await db.review_log.clear()
    await db.sync_queue.clear()
    showMsg('All local data cleared')
  }

  async function handleSeedSamples() {
    await db.flashcards.clear()
    await seedIfEmpty()
    showMsg('Sample flashcards reloaded')
  }

  function showMsg(text) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  const lastSyncedLabel = lastSynced
    ? new Date(lastSynced).toLocaleString()
    : 'Never'

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

      {/* ── Google Drive ── */}
      <div className="settings-section">
        <span className="settings-label">Google Drive</span>
        <div className="card stack">
          <div className="settings-row" style={{ border: 'none', paddingTop: 0 }}>
            <span>Status</span>
            <span style={{ fontWeight: 600, color: connected ? 'var(--accent)' : 'var(--text-muted)' }}>
              {connected ? '● Connected' : '○ Not connected'}
            </span>
          </div>

          {connected && (
            <div className="settings-row" style={{ border: 'none' }}>
              <span>Last synced</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{lastSyncedLabel}</span>
            </div>
          )}

          {connected ? (
            <div className="stack">
              <button
                className="btn btn-primary btn-full"
                onClick={handleSyncNow}
                disabled={syncing}
              >
                {syncing ? 'Syncing…' : '↑↓ Sync Now'}
              </button>
              <button className="btn btn-ghost btn-full" onClick={handleDisconnect}>
                Disconnect Drive
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-full" onClick={handleConnect}>
              Connect Google Drive
            </button>
          )}
        </div>
      </div>

      {/* ── Data ── */}
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

      {/* ── About ── */}
      <div className="settings-section">
        <span className="settings-label">About</span>
        <div className="card">
          <div className="settings-row">
            <span>Version</span>
            <span style={{ color: 'var(--text-muted)' }}>0.2.0 — Sprint 2</span>
          </div>
          <div className="settings-row" style={{ border: 'none' }}>
            <span>Storage</span>
            <span style={{ color: 'var(--text-muted)' }}>IndexedDB + Google Drive</span>
          </div>
        </div>
      </div>
    </>
  )
}
