import { render, screen } from '@testing-library/react'
import App from './App'

test('рендерит приложение', () => {
  render(<App />)
  expect(screen.getByText('Чат GREEN-API')).toBeInTheDocument()
})
