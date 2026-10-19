// Градиенты аватаров из дизайн-системы MAX: coral, orange, green, sky, violet
const COLORS = [
  ['#ff48b6', '#ff8a35'],
  ['#ffc93d', '#ff832a'],
  ['#14e1d5', '#03c722'],
  ['#08d7f3', '#5398ff'],
  ['#bf97ff', '#526eff'],
].map(([from, to]) => `linear-gradient(135deg, ${from}, ${to})`)

function firstLetter(word: string): string {
  return [...word][0].toUpperCase()
}

/**
 * Буквы на аватаре: инициалы имени, иначе первая буква никнейма Telegram.
 * Номер телефона для аватара не используется — без имени и никнейма вернёт null (значок).
 */
export function avatarLetters({
  name,
  username,
}: {
  name?: string
  username?: string
}): string | null {
  const words = (name ?? '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => /\p{L}/u.test(word))
  if (words.length > 0) return words.slice(0, 2).map(firstLetter).join('')

  const nick = username?.replace(/^@/, '').match(/\p{L}/u)?.[0]
  return nick ? nick.toUpperCase() : null
}

export function avatarBackground(key: string): string {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}
