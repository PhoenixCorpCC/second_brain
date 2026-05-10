import { GOOGLE_CLIENT_ID } from '../config.js'
import { db } from './db.js'

const SCOPES      = 'https://www.googleapis.com/auth/drive'
const API_BASE    = 'https://www.googleapis.com/drive/v3'
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'
const ROOT_FOLDER = 'second-brain'

// ── Settings (key-value in IndexedDB) ────────────────────────────────────────

async function getSetting(key) {
  const row = await db.settings.get(key)
  return row?.value ?? null
}

async function setSetting(key, value) {
  await db.settings.put({ key, value })
}

// ── Token management ──────────────────────────────────────────────────────────

async function getTokens() {
  return getSetting('drive_tokens')
}

async function setTokens(tokens) {
  await setSetting('drive_tokens', { ...tokens, stored_at: Date.now() })
}

export async function isConnected() {
  const tokens = await getTokens()
  if (!tokens?.access_token) return false
  // Still valid if not expired
  const expiresAt = tokens.stored_at + (tokens.expires_in - 60) * 1000
  return Date.now() < expiresAt
}

export async function getLastSynced() {
  return getSetting('last_synced')
}

// ── Google Identity Services (GIS) auth ───────────────────────────────────────
// No client_secret, no redirect URI — popup-based token grant.

let _tokenClient = null

function waitForGIS() {
  return new Promise(resolve => {
    const check = () => {
      if (window.google?.accounts?.oauth2) resolve()
      else setTimeout(check, 100)
    }
    check()
  })
}

async function getTokenClient() {
  if (_tokenClient) return _tokenClient
  await waitForGIS()
  _tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: () => {}, // overridden per-request below
  })
  return _tokenClient
}

export async function startAuth() {
  const client = await getTokenClient()
  return new Promise((resolve, reject) => {
    client.callback = async response => {
      if (response.error) { reject(new Error(response.error)); return }
      await setTokens({
        access_token: response.access_token,
        expires_in:   response.expires_in,
        token_type:   response.token_type,
      })
      resolve()
    }
    client.requestAccessToken({ prompt: 'consent' })
  })
}

export async function silentRefresh() {
  const client = await getTokenClient()
  return new Promise((resolve, reject) => {
    client.callback = async response => {
      if (response.error) { reject(new Error(response.error)); return }
      await setTokens({
        access_token: response.access_token,
        expires_in:   response.expires_in,
        token_type:   response.token_type,
      })
      resolve(response.access_token)
    }
    client.requestAccessToken({ prompt: '' }) // no UI if still signed in
  })
}

export async function disconnect() {
  const tokens = await getTokens()
  if (tokens?.access_token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(tokens.access_token, () => {})
  }
  await setSetting('drive_tokens', null)
  await setSetting('drive_folder_ids', null)
  await setSetting('last_synced', null)
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function getAccessToken() {
  const tokens = await getTokens()
  if (!tokens?.access_token) throw new Error('Not connected to Drive')

  const expiresAt = tokens.stored_at + (tokens.expires_in - 60) * 1000
  if (Date.now() < expiresAt) return tokens.access_token

  // Try silent refresh (no UI) — may fail if session expired
  return silentRefresh()
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const token = await getAccessToken()
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Drive ${res.status}: ${text}`)
  }
  return res
}

async function apiJSON(url, options = {}) {
  const res = await apiFetch(url, options)
  return res.json()
}

// ── Folder management ─────────────────────────────────────────────────────────

async function findOrCreateFolder(name, parentId) {
  let q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  if (parentId) q += ` and '${parentId}' in parents`

  const url = new URL(`${API_BASE}/files`)
  url.searchParams.set('q', q)
  url.searchParams.set('fields', 'files(id)')

  const data = await apiJSON(url.toString())
  if (data.files?.length) return data.files[0].id

  const body = { name, mimeType: 'application/vnd.google-apps.folder' }
  if (parentId) body.parents = [parentId]

  const created = await apiJSON(`${API_BASE}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return created.id
}

async function initFolders() {
  const cached = await getSetting('drive_folder_ids')
  if (cached?.inbox && cached?.pwaData) return cached

  const root    = await findOrCreateFolder(ROOT_FOLDER, null)
  const vault   = await findOrCreateFolder('vault',    root)
  const inbox   = await findOrCreateFolder('Inbox',    vault)
  const pwaData = await findOrCreateFolder('pwa-data', root)
  await findOrCreateFolder('Books', vault)

  const ids = { root, vault, inbox, pwaData }
  await setSetting('drive_folder_ids', ids)
  return ids
}

// ── File operations ───────────────────────────────────────────────────────────

async function findFile(name, parentId) {
  const url = new URL(`${API_BASE}/files`)
  url.searchParams.set('q', `name='${name}' and '${parentId}' in parents and trashed=false`)
  url.searchParams.set('fields', 'files(id,modifiedTime)')
  const data = await apiJSON(url.toString())
  return data.files?.[0] ?? null
}

async function upsertFile(name, content, mimeType, parentId) {
  const token    = await getAccessToken()
  const existing = await findFile(name, parentId)

  const metadata = existing ? {} : { name, parents: [parentId] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file',     new Blob([content], { type: mimeType }))

  const url    = existing
    ? `${UPLOAD_BASE}/files/${existing.id}?uploadType=multipart`
    : `${UPLOAD_BASE}/files?uploadType=multipart`

  const res = await fetch(url, {
    method: existing ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json()
}

async function downloadText(fileId) {
  const res = await apiFetch(`${API_BASE}/files/${fileId}?alt=media`)
  return res.text()
}

// ── Public sync API ───────────────────────────────────────────────────────────

export async function pushNote(note) {
  if (!(await isConnected())) return
  const { inbox } = await initFolders()
  await upsertFile(note.filename, note.markdown, 'text/markdown', inbox)
}

export async function pushJSON(filename, data) {
  if (!(await isConnected())) return
  const { pwaData } = await initFolders()
  await upsertFile(filename, JSON.stringify(data, null, 2), 'application/json', pwaData)
}

async function pullJSON(filename) {
  const { pwaData } = await initFolders()
  const file = await findFile(filename, pwaData)
  if (!file) return null
  const text = await downloadText(file.id)
  return JSON.parse(text)
}

export async function pushLocalState() {
  if (!(await isConnected())) return
  await initFolders()
  const [queue, cards, log] = await Promise.all([
    db.queue.toArray(),
    db.flashcards.toArray(),
    db.review_log.toArray(),
  ])
  await Promise.all([
    pushJSON('queue.json',      queue),
    pushJSON('flashcards.json', cards),
    pushJSON('review_log.json', log),
  ])
}

export async function syncAll() {
  if (!(await isConnected())) return { synced: false, reason: 'not_connected' }

  try {
    await initFolders()

    // Pull queue — Drive is authoritative (PC runner updates it)
    const remoteQueue = await pullJSON('queue.json')
    if (remoteQueue) {
      await db.queue.clear()
      if (remoteQueue.length) await db.queue.bulkAdd(remoteQueue)
    }

    // Pull flashcards — merge by last_reviewed_at (most recent wins per card)
    const remoteCards = await pullJSON('flashcards.json')
    if (remoteCards) {
      const localCards = await db.flashcards.toArray()
      const localMap   = new Map(localCards.map(c => [c.id, c]))
      const remoteMap  = new Map(remoteCards.map(c => [c.id, c]))

      const merged = []
      for (const [id, remote] of remoteMap) {
        const local = localMap.get(id)
        if (!local) { merged.push(remote); continue }
        const lt = local.last_reviewed_at ?? ''
        const rt = remote.last_reviewed_at ?? ''
        merged.push(lt > rt ? local : remote)
      }
      for (const [id, local] of localMap) {
        if (!remoteMap.has(id)) merged.push(local)
      }

      await db.flashcards.clear()
      if (merged.length) await db.flashcards.bulkAdd(merged)
    }

    await pushLocalState()
    await setSetting('last_synced', new Date().toISOString())
    return { synced: true }
  } catch (err) {
    console.error('[Drive] syncAll error:', err)
    return { synced: false, reason: err.message }
  }
}
