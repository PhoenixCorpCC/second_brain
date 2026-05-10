import { useState, useEffect } from 'react'
import CaptureScreen  from './components/CaptureScreen.jsx'
import QueueScreen    from './components/QueueScreen.jsx'
import ReviewScreen   from './components/ReviewScreen.jsx'
import SearchScreen   from './components/SearchScreen.jsx'
import Settings       from './components/Settings.jsx'
import NoteViewer     from './components/NoteViewer.jsx'
import { handleOAuthCallback, syncAll } from './lib/drive.js'

const TABS = [
  { id: 'capture', label: 'Capture', icon: IconCapture },
  { id: 'queue',   label: 'Queue',   icon: IconQueue   },
  { id: 'review',  label: 'Review',  icon: IconReview  },
  { id: 'search',  label: 'Search',  icon: IconSearch  },
]

export default function App() {
  const [tab, setTab]           = useState('capture')
  const [viewNote, setViewNote] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [syncing, setSyncing]   = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')

    if (code) {
      // Clean URL immediately so a refresh doesn't re-trigger
      window.history.replaceState({}, '', window.location.pathname)
      handleOAuthCallback(code)
        .then(() => runSync())
        .catch(err => console.error('[Auth] callback error:', err))
    } else {
      // Pull on every app open
      runSync()
    }
  }, [])

  async function runSync() {
    setSyncing(true)
    await syncAll()
    setSyncing(false)
  }

  if (viewNote) {
    return (
      <div className="app">
        <div className="screen">
          <NoteViewer note={viewNote} onBack={() => setViewNote(null)} />
        </div>
      </div>
    )
  }

  if (showSettings) {
    return (
      <div className="app">
        <div className="screen">
          <Settings onBack={() => setShowSettings(false)} onSync={runSync} />
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {syncing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 2,
          background: 'var(--accent)', zIndex: 200,
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      )}

      <div className="screen">
        {tab === 'capture' && <CaptureScreen onOpenSettings={() => setShowSettings(true)} />}
        {tab === 'queue'   && <QueueScreen   onSync={runSync} />}
        {tab === 'review'  && <ReviewScreen />}
        {tab === 'search'  && <SearchScreen  onViewNote={setViewNote} />}
      </div>

      <nav className="tab-bar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`tab-btn${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function IconCapture() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )
}

function IconQueue() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function IconReview() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
