import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/db.js'
import { buildNote } from '../lib/noteWriter.js'
import { enqueue } from '../lib/queueManager.js'
import { readSharedData, isShareReturn, clearShareParam } from '../lib/shareHandler.js'
import { pushNote, pushLocalState, isConnected } from '../lib/drive.js'

export default function CaptureScreen({ onOpenSettings }) {
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [url, setUrl]       = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [toast, setToast]   = useState('')
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!isShareReturn()) return
    clearShareParam()
    readSharedData().then(data => {
      if (!data) return
      if (data.url)   setUrl(data.url)
      if (data.title) setTitle(data.title)
      if (data.text)  setBody(data.text)
    })
  }, [])

  async function handleSave() {
    const noteTitle = title.trim() || body.trim().split('\n')[0].slice(0, 60) || 'Untitled'
    const noteBody  = body.trim()

    if (!noteBody && !url.trim()) {
      showToast('Add some text or a URL first')
      return
    }

    setSaving(true)
    try {
      const sourceType = url.trim() ? 'url' : 'manual'
      const note = buildNote({
        title: noteTitle,
        body: noteBody || url.trim(),
        sourceUrl: url.trim(),
        sourceType,
      })

      await db.notes.add(note.meta)
      await enqueue({ noteId: note.id, notePath: note.path, type: sourceType, sourceUrl: url.trim() })

      // Push to Drive in background — don't block the UI
      if (await isConnected()) {
        pushNote(note).catch(err => console.warn('[Drive] pushNote failed:', err))
        pushLocalState().catch(err => console.warn('[Drive] pushLocalState failed:', err))
      }

      setTitle('')
      setBody('')
      setUrl('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      showToast('Save failed — ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  if (saved) {
    return (
      <div className="capture-saved">
        <div style={{ fontSize: 56 }}>✓</div>
        <p style={{ fontWeight: 600, fontSize: 18, marginTop: 8 }}>Saved to Inbox</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Added to AI queue</p>
      </div>
    )
  }

  return (
    <>
      {toast && (
        <div className="toast-wrap">
          <div className="toast">{toast}</div>
        </div>
      )}

      <div className="row" style={{ marginBottom: 20 }}>
        <h1 className="screen-title" style={{ marginBottom: 0 }}>Capture</h1>
        <div className="spacer" />
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={onOpenSettings}>
          ⚙ Settings
        </button>
      </div>

      <div className="capture-field">
        <label className="capture-label">Title (optional)</label>
        <input
          type="text"
          placeholder="Leave blank to use first line of note"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div className="capture-field">
        <label className="capture-label">Note</label>
        <textarea
          ref={bodyRef}
          placeholder="What's on your mind?"
          value={body}
          onChange={e => setBody(e.target.value)}
          style={{ minHeight: 160 }}
        />
      </div>

      <div className="capture-field">
        <label className="capture-label">URL (optional)</label>
        <input
          type="url"
          placeholder="https://..."
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
      </div>

      <button
        className="btn btn-primary btn-full"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save to Inbox'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-light)', marginTop: 12 }}>
        Saved offline · syncs to Drive if connected
      </p>
    </>
  )
}
