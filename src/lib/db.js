import Dexie from 'dexie'

export const db = new Dexie('SecondBrain')

db.version(1).stores({
  notes:      'id, title, source_type, category, created_at, ai_status',
  flashcards: 'id, note_id, category, due_date, source',
  queue:      'id, note_id, type, status, created_at',
  review_log: '++id, card_id, reviewed_at',
  sync_queue: '++id, operation, path, created_at'
})

export async function seedIfEmpty() {
  const count = await db.flashcards.count()
  if (count > 0) return

  const today = new Date().toISOString().split('T')[0]
  const note_id = 'darwin-sample'

  await db.flashcards.bulkAdd([
    {
      id: crypto.randomUUID(), note_id, note_path: 'vault/Books/darwin-investing.md',
      front: 'What single filter does Nalanda use to shortlist businesses?',
      back: 'Historical ROCE > 20% over 5–10 years. Like the Siberian fox tameness experiment — selecting one trait brings many desirable qualities along for free: great management, moat, capital allocation, resilience.',
      category: 'Books', tags: ['investing', 'ROCE'], source: 'manual',
      interval: 1, repetitions: 0, ease_factor: 2.5,
      due_date: today, created_at: new Date().toISOString(), last_reviewed_at: null
    },
    {
      id: crypto.randomUUID(), note_id, note_path: 'vault/Books/darwin-investing.md',
      front: 'What is a Type I error in Nalanda\'s investing framework?',
      back: 'An error of commission — making a bad investment. Nalanda\'s forbidden list: crooks, turnarounds, high-debt companies, serial acquirers, fast-changing industries, unaligned owners. Buffett\'s Rule #1: never lose money.',
      category: 'Books', tags: ['investing', 'risk'], source: 'manual',
      interval: 1, repetitions: 0, ease_factor: 2.5,
      due_date: today, created_at: new Date().toISOString(), last_reviewed_at: null
    },
    {
      id: crypto.randomUUID(), note_id, note_path: 'vault/Books/darwin-investing.md',
      front: 'Why does Nalanda reject DCF models entirely?',
      back: 'Darwin built evolutionary theory from historical evidence, not forecasting. DCF compounds uncertain assumptions 10–20 years out. Nalanda uses only what has already happened — audited historical financials.',
      category: 'Books', tags: ['investing', 'DCF'], source: 'manual',
      interval: 1, repetitions: 0, ease_factor: 2.5,
      due_date: today, created_at: new Date().toISOString(), last_reviewed_at: null
    },
    {
      id: crypto.randomUUID(), note_id, note_path: 'vault/Books/darwin-investing.md',
      front: 'What is "punctuated equilibrium" applied to investing?',
      back: 'Great businesses remain great over long periods; bad businesses remain bad. Short-term price volatility is almost never a genuine business punctuation. Don\'t confuse stock-price noise with actual business deterioration.',
      category: 'Books', tags: ['investing', 'holding'], source: 'manual',
      interval: 1, repetitions: 0, ease_factor: 2.5,
      due_date: today, created_at: new Date().toISOString(), last_reviewed_at: null
    },
    {
      id: crypto.randomUUID(), note_id, note_path: 'vault/Books/darwin-investing.md',
      front: 'What makes a signal "honest" in Zahavi\'s handicap principle?',
      back: 'Only costly-to-produce signals are reliable. In investing: audited financials and scuttlebutt (suppliers, customers, ex-employees) are honest. Press releases, earnings guidance, and management meetings are cheap — therefore unreliable.',
      category: 'Books', tags: ['investing', 'signals'], source: 'manual',
      interval: 1, repetitions: 0, ease_factor: 2.5,
      due_date: today, created_at: new Date().toISOString(), last_reviewed_at: null
    },
    {
      id: crypto.randomUUID(), note_id, note_path: 'vault/Books/darwin-investing.md',
      front: 'What is Nalanda\'s core rule about selling compounders?',
      back: '"We have been successful not because we are better at buying, but because we refuse to succumb to the temptation of selling." If a business is performing well, never sell at any price.',
      category: 'Books', tags: ['investing', 'compounding'], source: 'manual',
      interval: 1, repetitions: 0, ease_factor: 2.5,
      due_date: today, created_at: new Date().toISOString(), last_reviewed_at: null
    }
  ])
}
