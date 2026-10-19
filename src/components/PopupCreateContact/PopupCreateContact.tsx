import { useEffect, useId, useState, type ClipboardEvent, type FormEvent } from 'react'
import { getActiveFormattingMask, PhoneInput, type ParsedCountry } from 'react-international-phone'
import 'react-international-phone/style.css'
import { errorMessage } from '../../api/errors'
import { isPhoneComplete, isValidPhone, normalizePhone } from '../../utils/phone'
import styles from './PopupCreateContact.module.css'

interface PopupCreateContactProps {
  onClose: () => void
  /** Получает номер цифрами в международном формате, например `79991234567` */
  onCreate: (phone: string) => Promise<void>
}

export function PopupCreateContact({ onClose, onCreate }: PopupCreateContactProps) {
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState<ParsedCountry | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()

  const digits = phone.replace(/\D/g, '')
  const complete = country
    ? isPhoneComplete(digits, country.dialCode, getActiveFormattingMask({ phone, country }))
    : isValidPhone(digits)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, pending])

  // Номер вида «8 (999) 123-45-67» из буфера обмена приводим к +7
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text')
    if (!/\d/.test(text)) return
    event.preventDefault()
    setPhone(`+${normalizePhone(text)}`)
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!complete || pending) return
    setPending(true)
    setError(null)
    try {
      await onCreate(normalizePhone(digits))
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setPending(false)
    }
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={handleSubmit}
        noValidate
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Новый чат
          </h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Закрыть"
            onClick={onClose}
            disabled={pending}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <p className={styles.hint}>Введите номер телефона собеседника в Telegram</p>

        <PhoneInput
          className={styles.phone}
          inputClassName={styles.phoneInput}
          defaultCountry="ru"
          preferredCountries={['ru', 'by', 'kz']}
          value={phone}
          onChange={(value, meta) => {
            setPhone(value)
            setCountry(meta.country)
            setError(null)
          }}
          disabled={pending}
          inputProps={{ 'aria-label': 'Номер телефона', onPaste: handlePaste, autoFocus: true }}
        />

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={!complete || pending}>
          {pending ? 'Ищем…' : 'Создать чат'}
        </button>
      </form>
    </div>
  )
}
