import { GOOGLE_CLIENT_ID } from '../config.js'
import { db } from './db.js'

const SCOPES         = 'https://www.googleapis.com/auth/drive'
const AUTH_ENDPOINT  = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const API_BASE       = 'https://www.googleapis.com/drive/v3'
const UPLOAD_BASE    = 'https://www.googleapis.com/upload/drive/v3'
const ROOT_FOLDER    = 'second-brain'

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function base64urlEncode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function generateVerifier() {
  return base64urlEncode(crypto.getRandomValues(new Uint8Array(32)))
}

async function generateChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64urlEncode(digest)
}

function getRedirectUri() {
  return window.location.origin + '/second_brain/'
}

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
  return !!tokens?.access_token
}

export async function getLastSynced() {
  return getSetting('last_synced')
}

// ── OAuth PKCE flow ───────────────────────────────────────────────────────────

export async function startAuth() {
  const verifier  = generateVerifier()
  const challenge = await generateChallenge(verifier)
  await setSetting('pkce_verifier', verifier)

  const params = new URLSearchParams({
    client_id:             GOOGLE_CLIENT_ID,
    redirect_uri:          getRedirectUri(),
    response_type:         'code',
    scope:                 SCOPES,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    access_type:           'offline',
    prompt:                'consent',
  })

  window.location.href = `${AUTH_ENDPOINT}?${params}`
}

export async function handleOAuthCallback(code) {
  const verifier = await getSetting('pkce_verifier')
  if (!verifier) throw new Error('No PKCE verifier — auth may have started in a different session')

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     GOOGLE_CLIENT_ID,
      redirect_uri:  getRedirectUri(),
      grant_type:    'authorization_code',
      code_verifier: verifier,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${text}`)
  }

  const tokens = await res.json()
  await setTokens(tokens)
  await setSetting('pkce_verifier', null)
}

export async function disconnect() {
  await setSetting('drive_tokens', null)
  await setSetting('drive_folder_ids', null)
  await setSetting('last_synced', null)
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function refreshIfNeeded() {
  const tokens = await getTokens()
  if (!tokens) throw new Error('Not connected to Drive')

  const expiresAt = tokens.stored_at + (tokens.expires_in - 60) * 1000
  if (Date.now() < expiresAt) return tokens.access_token

  if (!tokens.refresh_token) throw new Error('Access token expired and no refresh token available')

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      grant_type:    'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  })

  if (!res.ok) throw new Error('Token refresh failed — please reconnect Drive')

  const fresh = await res.json()
  await setTokens({ ...tokens, ...fresh })
  return fresh.access_token
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const token = await refreshIfNeeded()
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Drive API ${res.status}: ${text}`)
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
  const vault   = await findOrCreateFolder('vault',   root)
  const inbox   = await findOrCreateFolder('Inbox',   vault)
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
  const token    = await refreshIfNeeded()
  const existing = await findFile(name, parentId)

  const metadata = existing ? {} : { name, parents: [parentId] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file',     new Blob([content], { type: mimeType }))

  const url    = existing
    ? `${UPLOAD_BASE}/files/${existing.id}?uploadType=multipart`
    : `${UPLOAD_BASE}/files?uploadType=multipart`
  const method = existing ? 'PATCH' : 'POST'

  const res = await fetch(url, {
    method,
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
        const localTime  = local.last_reviewed_at  ?? ''
        const remoteTime = remote.last_reviewed_at ?? ''
        merged.push(localTime > remoteTime ? local : remote)
      }
      // Local-only cards (not yet pushed to Drive)
      for (const [id, local] of localMap) {
        if (!remoteMap.has(id)) merged.push(local)
      }

      await db.flashcards.clear()
      if (merged.length) await db.flashcards.bulkAdd(merged)
    }

    // Push local state up
    await pushLocalState()

    await setSetting('last_synced', new Date().toISOString())
    return { synced: true }
  } catch (err) {
    console.error('[Drive] syncAll error:', err)
    return { synced: false, reason: err.message }
  }
}
