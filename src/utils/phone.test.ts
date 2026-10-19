import { formatPhone, isValidPhone, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it.each([
    ['+7 999 123-45-67', '79991234567'],
    ['8 (999) 123 45 67', '79991234567'],
    ['9991234567', '79991234567'],
    ['+375 29 123-45-67', '375291234567'],
    ['+44 7911 123456', '447911123456'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it('не трогает 11 цифр, начинающихся не с 8', () => {
    expect(normalizePhone('79991234567')).toBe('79991234567')
  })
})

describe('isValidPhone', () => {
  it('принимает 10–15 цифр', () => {
    expect(isValidPhone('7999123456')).toBe(true)
    expect(isValidPhone('123456789012345')).toBe(true)
  })

  it('отклоняет короткие, длинные и нецифровые значения', () => {
    expect(isValidPhone('799912345')).toBe(false)
    expect(isValidPhone('1234567890123456')).toBe(false)
    expect(isValidPhone('7999abc4567')).toBe(false)
    expect(isValidPhone('')).toBe(false)
  })
})

describe('formatPhone', () => {
  it('форматирует российский номер', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67')
  })

  it('остальные номера показывает с плюсом', () => {
    expect(formatPhone('375291234567')).toBe('+375291234567')
  })
})
