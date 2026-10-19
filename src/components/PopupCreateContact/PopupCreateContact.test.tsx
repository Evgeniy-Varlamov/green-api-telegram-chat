import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../../api/errors'
import { PopupCreateContact } from './PopupCreateContact'

const setup = (onCreate = vi.fn().mockResolvedValue(undefined)) => {
  const onClose = vi.fn()
  render(<PopupCreateContact onClose={onClose} onCreate={onCreate} />)
  return {
    onCreate,
    onClose,
    user: userEvent.setup(),
    input: screen.getByLabelText('Номер телефона'),
    submit: screen.getByRole('button', { name: 'Создать чат' }),
  }
}

describe('PopupCreateContact', () => {
  it('неполный номер не отправляется', async () => {
    const { user, input, submit } = setup()
    expect(submit).toBeDisabled()
    await user.type(input, '999123')
    expect(submit).toBeDisabled()
  })

  it('полный российский номер → цифры в международном формате, окно закрывается', async () => {
    const { user, input, submit, onCreate, onClose } = setup()
    await user.type(input, '9991234567')
    expect(submit).toBeEnabled()
    await user.click(submit)
    expect(onCreate).toHaveBeenCalledWith('79991234567')
    expect(onClose).toHaveBeenCalled()
  })

  it('вставка номера в формате 8 (…) приводится к +7', async () => {
    const { user, input, submit, onCreate } = setup()
    await user.click(input)
    await user.paste('8 (999) 123-45-67')
    await user.click(submit)
    expect(onCreate).toHaveBeenCalledWith('79991234567')
  })

  it('показывает ошибку «не найден» и не закрывается', async () => {
    const { user, input, submit, onClose } = setup(
      vi.fn().mockRejectedValue(new ApiError('accountNotFound', 200, '')),
    )
    await user.type(input, '9991234567')
    await user.click(submit)
    expect(await screen.findByRole('alert')).toHaveTextContent('не найден')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('закрывается по Esc и по кнопке ×', async () => {
    const { user, onClose } = setup()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Закрыть' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
