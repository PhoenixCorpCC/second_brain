import { db } from './db.js'

export async function enqueue({ noteId, notePath, type = 'note', sourceUrl = '', epubPath = '' }) {
  const entry = {
    id: crypto.randomUUID(),
    note_id: noteId,
    note_path: notePath,
    type,
    source_url: sourceUrl,
    epub_path: epubPath,
    status: 'pending_ai',
    error_message: null,
    created_at: new Date().toISOString(),
    processed_at: null
  }
  await db.queue.add(entry)
  return entry
}

export async function getQueue() {
  return db.queue.orderBy('created_at').reverse().toArray()
}

export async function updateStatus(id, status, errorMessage = null) {
  await db.queue.update(id, {
    status,
    error_message: errorMessage,
    processed_at: status === 'done' || status === 'error' ? new Date().toISOString() : null
  })
}
