export function buildNote({ title, body, sourceUrl = '', sourceType = 'manual', tags = [] }) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const datePrefix = now.split('T')[0]
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || id.slice(0, 8)

  const filename = `${datePrefix}-${slug}.md`
  const escapedTitle = title.replace(/"/g, '\\"')

  const markdown = [
    '---',
    `id: ${id}`,
    `title: "${escapedTitle}"`,
    `source_url: "${sourceUrl}"`,
    `source_type: ${sourceType}`,
    `tags: [${tags.map(t => `"${t}"`).join(', ')}]`,
    `category: Inbox`,
    `created_at: ${now}`,
    `updated_at: ${now}`,
    `ai_status: pending`,
    '---',
    '',
    body
  ].join('\n')

  return {
    id,
    filename,
    path: `vault/Inbox/${filename}`,
    markdown,
    meta: { id, title, source_url: sourceUrl, source_type: sourceType, tags, category: 'Inbox', created_at: now, updated_at: now, ai_status: 'pending', body }
  }
}
