const DAY_MS = 24 * 60 * 60 * 1000

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const dayYearFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const shortDateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
})

function startOfDay(ms: number): number {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Сколько календарных дней прошло между датами (0 — тот же день). */
function daysAgo(ms: number, now: number): number {
  return Math.round((startOfDay(now) - startOfDay(ms)) / DAY_MS)
}

export function formatTime(ms: number): string {
  return timeFormat.format(ms)
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

/** Разделитель дней в переписке: «Сегодня», «Вчера», «5 октября». */
export function formatDay(ms: number, now = Date.now()): string {
  const days = daysAgo(ms, now)
  if (days === 0) return 'Сегодня'
  if (days === 1) return 'Вчера'
  return new Date(ms).getFullYear() === new Date(now).getFullYear()
    ? dayFormat.format(ms)
    : dayYearFormat.format(ms)
}

/** Время в списке чатов: «12:40», «вчера», «05.10.26». */
export function formatListTime(ms: number, now = Date.now()): string {
  const days = daysAgo(ms, now)
  if (days === 0) return formatTime(ms)
  if (days === 1) return 'вчера'
  return shortDateFormat.format(ms)
}
