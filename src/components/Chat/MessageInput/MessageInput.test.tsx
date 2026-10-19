import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageInput } from './MessageInput'

const setup = () => {
  const onSend = vi.fn()
  render(<MessageInput onSend={onSend} />)
  return {
    onSend,
    user: userEvent.setup(),
    input: screen.getByLabelText('Сообщение'),
    send: screen.getByRole('button', { name: 'Отправить' }),
  }
}

describe('MessageInput', () => {
  it('Enter отправляет текст без пробелов по краям и очищает поле', async () => {
    const { user, input, onSend } = setup()
    await user.type(input, '  Привет  {Enter}')
    expect(onSend).toHaveBeenCalledWith('Привет')
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('Shift+Enter переносит строку', async () => {
    const { user, input, onSend } = setup()
    await user.type(input, 'a{Shift>}{Enter}{/Shift}b')
    expect(onSend).not.toHaveBeenCalled()
    expect(input).toHaveValue('a\nb')
  })

  it('пустое сообщение и пробелы не отправляются', async () => {
    const { user, input, send, onSend } = setup()
    expect(send).toBeDisabled()
    await user.type(input, '   {Enter}')
    expect(send).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('показывает счётчик после 3500 символов и блокирует отправку после 4000', async () => {
    const { user, input, send, onSend } = setup()
    await user.click(input)
    await user.paste('a'.repeat(3501))
    expect(screen.getByText('3501/4000')).toBeInTheDocument()
    expect(send).toBeEnabled()

    await user.paste('a'.repeat(500))
    expect(screen.getByText('4001/4000')).toBeInTheDocument()
    expect(send).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })
})
