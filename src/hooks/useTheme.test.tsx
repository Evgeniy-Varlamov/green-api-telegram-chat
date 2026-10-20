import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeMenuItems, ThemeToggleButton } from '../components/ThemeSwitcher/ThemeSwitcher'
import { loadTheme, THEME_KEY } from '../utils/theme'
import { setTheme } from './useTheme'

const attr = () => document.documentElement.getAttribute('data-theme')

afterEach(() => {
  act(() => setTheme('auto'))
})

describe('тема: хранение', () => {
  it('по умолчанию — auto', () => {
    expect(loadTheme()).toBe('auto')
  })

  it('неизвестное значение в localStorage — auto', () => {
    localStorage.setItem(THEME_KEY, 'purple')
    expect(loadTheme()).toBe('auto')
  })

  it('выбор сохраняется и применяется к <html>', () => {
    setTheme('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(attr()).toBe('dark')

    setTheme('light')
    expect(attr()).toBe('light')

    setTheme('auto')
    expect(localStorage.getItem(THEME_KEY)).toBe('auto')
    expect(attr()).toBeNull() // в auto тему выбирает prefers-color-scheme
  })

  it('недоступный localStorage не ломает переключение', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => setTheme('dark')).not.toThrow()
    expect(attr()).toBe('dark')
    spy.mockRestore()
  })

  it('смена темы в другой вкладке применяется здесь (событие storage)', () => {
    render(<ThemeMenuItems />)
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: 'dark' }))
    })
    expect(attr()).toBe('dark')
    expect(screen.getByRole('menuitemradio', { name: /Тёмная/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})

describe('переключатели', () => {
  it('пункты меню: отмечен текущий, выбор применяется', async () => {
    const user = userEvent.setup()
    render(<ThemeMenuItems />)
    expect(screen.getByRole('menuitemradio', { name: /Авто/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await user.click(screen.getByRole('menuitemradio', { name: /Тёмная/ }))
    expect(attr()).toBe('dark')
    expect(screen.getByRole('menuitemradio', { name: /Тёмная/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('menuitemradio', { name: /Авто/ })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('кнопка на экране входа: авто → светлая → тёмная → авто', async () => {
    const user = userEvent.setup()
    render(<ThemeToggleButton />)
    const button = () => screen.getByRole('button', { name: /^Тема:/ })

    expect(button()).toHaveAccessibleName('Тема: авто. Переключить на «светлая»')
    await user.click(button())
    expect(attr()).toBe('light')
    await user.click(button())
    expect(attr()).toBe('dark')
    await user.click(button())
    expect(attr()).toBeNull()
    expect(localStorage.getItem(THEME_KEY)).toBe('auto')
  })
})
