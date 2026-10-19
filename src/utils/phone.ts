const MIN_DIGITS = 10
const MAX_DIGITS = 15

/**
 * Приводит введённый номер к цифрам международного формата:
 * `8 (999) 123-45-67` → `79991234567`, `9991234567` → `79991234567`.
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('9')) return `7${digits}`
  return digits
}

export function isValidPhone(digits: string): boolean {
  return /^\d+$/.test(digits) && digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS
}

/** `79991234567` → `+7 999 123-45-67`; прочие номера — просто с плюсом. */
export function formatPhone(digits: string): string {
  const ru = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits)
  if (ru) return `+7 ${ru[1]} ${ru[2]}-${ru[3]}-${ru[4]}`
  return `+${digits}`
}

/** Номер из поля ввода заполнен полностью по маске выбранной страны. */
export function isPhoneComplete(digits: string, dialCode: string, mask: string): boolean {
  const required = dialCode.length + (mask.match(/\./g)?.length ?? 0)
  return isValidPhone(digits) && digits.length >= required
}
