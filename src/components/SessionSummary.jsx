export default function SessionSummary({ log, onRestart }) {
  const total    = log.length
  const passed   = log.filter(e => e.quality >= 3).length
  const retention = total > 0 ? Math.round((passed / total) * 100) : 0

  return (
    <div className="card summary-card">
      <div style={{ fontSize: 56, marginBottom: 8 }}>🎯</div>
      <h2 style={{ marginBottom: 4 }}>Session complete</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Nice work — cards reviewed and scheduled</p>

      <div className="summary-stats-row">
        <div className="summary-stat">
          <div className="summary-stat-num">{total}</div>
          <div className="summary-stat-label">Reviewed</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-num">{retention}%</div>
          <div className="summary-stat-label">Retention</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-num">{passed}</div>
          <div className="summary-stat-label">Passed</div>
        </div>
      </div>

      <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={onRestart}>
        Review Again
      </button>
    </div>
  )
}
