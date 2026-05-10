export function sm2(card, quality) {
  // quality: 1–5. 1–2 = fail (reset), 3–5 = pass
  if (quality < 3) {
    card.repetitions = 0
    card.interval = 1
  } else {
    if (card.repetitions === 0) card.interval = 1
    else if (card.repetitions === 1) card.interval = 6
    else card.interval = Math.round(card.interval * card.ease_factor)
    card.repetitions++
  }
  card.ease_factor = Math.max(
    1.3,
    card.ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  )
  card.due_date = addDays(new Date(), card.interval).toISOString().split('T')[0]
  card.last_reviewed_at = new Date().toISOString()
  return card
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
