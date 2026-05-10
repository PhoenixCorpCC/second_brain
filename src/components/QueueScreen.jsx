import { useState, useEffect } from 'react'
import { getQueue } from '../lib/queueManager.js'
import { isConnected, getLastSynced } from '../lib/drive.js'

const STATUS_BADGE = {
  pending_ai:  { cls: 'badge-pending', label: 'Pending AI' },
  processing:  { cls: 'badge-process', label: 'Processing' },
  done:        { cls: 'badge-done',    label: 'Done' },
  error:       { cls: 'badge-error',   label: 'Error' },
}

export default function QueueScreen({ onSync }) {
  const [items, setItems]         = useState([])
  const [connected, setConnected] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [syncing, setSyncing]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setItems(await getQueue())
    setConnected(await isConnected())
    setLastSynced(await getLastSynced())
  }

  async function handlePull() {
    setSyncing(true)
    await onSync()
    await load()
    setSyncing(false)
  }

  const counts = items.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1
    return acc
  }, {})

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 className="screen-title" style={{ marginBottom: 0 }}>Queue</h1>
        <div className="spacer" />
        {connected && (
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: 13 }}
            onClick={handlePull}
            disabled={syncing}
          >
            {syncing ? 'Syncing…' : '↓ Pull from Drive'}
          </button>
        )}
      </div>

      {connected && (
        <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 12 }}>
          Last synced: {lastSynced ? new Date(lastSynced).toLocaleString() : 'Never'}
        </p>
      )}

      {!connected && (
        <div className="card" style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          Connect Google Drive in Settings to sync queue with PC
        </div>
      )}

      {items.length === 0 ? (
        <div className="queue-empty">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ fontWeight: 600 }}>Queue is empty</p>
          <p style={{ fontSize: 14, marginTop: 4 }}>Capture a note or URL to add items</p>
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(counts).map(([status, n]) => {
              const b = STATUS_BADGE[status] || { cls: 'badge-inbox', label: status }
              return (
                <span key={status} className={`badge ${b.cls}`}>
                  {b.label} · {n}
                </span>
              )
            })}
          </div>

          <div className="stack">
            {items.map(item => {
              const b = STATUS_BADGE[item.status] || { cls: 'badge-inbox', label: item.status }
              return (
                <div key={item.id} className="card queue-item">
                  <div className="row" style={{ marginBottom: 4 }}>
                    <span className={`badge ${b.cls}`}>{b.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-light)', marginLeft: 'auto' }}>
                      {item.type}
                    </span>
                  </div>
                  <div className="queue-title">
                    {item.note_path?.split('/').pop() || item.source_url || item.id.slice(0, 8)}
                  </div>
                  {item.source_url && (
                    <div className="queue-meta" style={{ wordBreak: 'break-all' }}>{item.source_url}</div>
                  )}
                  {item.error_message && (
                    <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{item.error_message}</div>
                  )}
                  <div className="queue-meta" style={{ marginTop: 4 }}>
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {!connected && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-light)', marginTop: 16 }}>
          Run <code>node process-queue.js</code> on PC to drain
        </p>
      )}
    </>
  )
}
