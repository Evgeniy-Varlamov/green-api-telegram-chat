// Градиенты аватаров из дизайн-системы MAX: coral, orange, green, sky, violet
const COLORS = [
  ['#ff48b6', '#ff8a35'],
  ['#ffc93d', '#ff832a'],
  ['#14e1d5', '#03c722'],
  ['#08d7f3', '#5398ff'],
  ['#bf97ff', '#526eff'],
].map(([from, to]) => `linear-gradient(135deg, ${from}, ${to})`)

export function initials(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return '#'
  if (/^\d/.test(words[0])) return words[0].slice(-2)
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

export function avatarBackground(key: string): string {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}
