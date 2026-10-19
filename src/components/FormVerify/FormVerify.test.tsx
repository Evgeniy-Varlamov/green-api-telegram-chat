import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../../api/errors'
import { FormVerify } from './FormVerify'

const setup = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
  render(<FormVerify onSubmit={onSubmit} />)
  return {
    onSubmit,
    user: userEvent.setup(),
    id: screen.getByLabelText('idInstance'),
    token: screen.getByLabelText('apiTokenInstance'),
    submit: screen.getByRole('button', { name: 'Войти' }),
  }
}

describe('FormVerify', () => {
  it('кнопка неактивна, пока не заполнены оба поля', async () => {
    const { user, id, token, submit } = setup()
    expect(submit).toBeDisabled()
    await user.type(id, '1101000001')
    expect(submit).toBeDisabled()
    await user.type(token, 'abc')
    expect(submit).toBeEnabled()
  })

  it('в idInstance вводятся только цифры', async () => {
    const { user, id } = setup()
    await user.type(id, '11a0-1')
    expect(id).toHaveValue('1101')
  })

  it('отправляет данные с apiUrl по умолчанию', async () => {
    const { user, id, token, submit, onSubmit } = setup()
    await user.type(id, '1101000001')
    await user.type(token, '  tok  ')
    await user.click(submit)
    expect(onSubmit).toHaveBeenCalledWith({
      apiUrl: 'https://api.green-api.com',
      idInstance: '1101000001',
      apiTokenInstance: 'tok',
    })
  })

  it('свой apiUrl из блока «Дополнительно», без слэша в конце', async () => {
    const { user, id, token, submit, onSubmit } = setup()
    await user.click(screen.getByText('Дополнительно'))
    const url = screen.getByLabelText('apiUrl')
    await user.clear(url)
    await user.type(url, 'https://4100.api.green-api.com/')
    await user.type(id, '1')
    await user.type(token, 't')
    await user.click(submit)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl: 'https://4100.api.green-api.com' }),
    )
  })

  it('некорректный apiUrl блокирует вход', async () => {
    const { user, id, token, submit } = setup()
    await user.click(screen.getByText('Дополнительно'))
    const url = screen.getByLabelText('apiUrl')
    await user.clear(url)
    await user.type(url, 'not a url')
    await user.type(id, '1')
    await user.type(token, 't')
    expect(submit).toBeDisabled()
  })

  it('показывает понятную ошибку и сохраняет введённые значения', async () => {
    const { user, id, token, submit } = setup(
      vi.fn().mockRejectedValue(new ApiError('unauthorized', 401, '')),
    )
    await user.type(id, '1101000001')
    await user.type(token, 'bad')
    await user.click(submit)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Неверный idInstance или apiTokenInstance',
    )
    expect(id).toHaveValue('1101000001')
    expect(submit).toBeEnabled()
  })

  it('кнопка «Показать» раскрывает токен', async () => {
    const { user, token } = setup()
    expect(token).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Показать токен' }))
    expect(token).toHaveAttribute('type', 'text')
  })
})
