export default function NoteViewer({ note, onBack }) {
  return (
    <>
      <div className="note-viewer-back">
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 14 }} onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ marginBottom: 4 }}>{note.title || 'Untitled'}</h2>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {note.source_type} · {new Date(note.created_at).toLocaleString()}
        </div>
        {note.source_url && (
          <div style={{ fontSize: 12, marginTop: 4, wordBreak: 'break-all' }}>
            <a href={note.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              {note.source_url}
            </a>
          </div>
        )}
      </div>

      <div className="card">
        <pre>{note.body || '(empty)'}</pre>
      </div>
    </>
  )
}
