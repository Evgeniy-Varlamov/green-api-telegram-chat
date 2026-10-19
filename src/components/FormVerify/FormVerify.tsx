import { useId, useState, type FormEvent } from 'react'
import { DEFAULT_API_URL } from '../../api/client'
import { errorMessage } from '../../api/errors'
import type { Credentials } from '../../api/types'
import styles from './FormVerify.module.css'

interface FormVerifyProps {
  onSubmit: (credentials: Credentials) => Promise<void>
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function FormVerify({ onSubmit }: FormVerifyProps) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [showToken, setShowToken] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = useId()

  const canSubmit =
    idInstance.length > 0 && apiTokenInstance.trim().length > 0 && isHttpUrl(apiUrl) && !pending

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setPending(true)
    setError(null)
    try {
      await onSubmit({
        apiUrl: apiUrl.trim().replace(/\/+$/, ''),
        idInstance,
        apiTokenInstance: apiTokenInstance.trim(),
      })
    } catch (err) {
      setError(errorMessage(err))
      setPending(false)
    }
  }

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>Вход</h1>
        <p className={styles.subtitle}>
          Введите данные инстанса из личного кабинета{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            GREEN-API
          </a>
        </p>

        <label className={styles.field} htmlFor={`${ids}-id`}>
          <span className={styles.label}>idInstance</span>
          <input
            id={`${ids}-id`}
            className={styles.input}
            inputMode="numeric"
            autoComplete="username"
            placeholder="1101000001"
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value.replace(/\D/g, ''))}
            disabled={pending}
            autoFocus
          />
        </label>

        <label className={styles.field} htmlFor={`${ids}-token`}>
          <span className={styles.label}>apiTokenInstance</span>
          <span className={styles.withAction}>
            <input
              id={`${ids}-token`}
              className={styles.input}
              type={showToken ? 'text' : 'password'}
              autoComplete="current-password"
              spellCheck={false}
              value={apiTokenInstance}
              onChange={(e) => setApiTokenInstance(e.target.value)}
              disabled={pending}
            />
            <button
              type="button"
              className={styles.inputAction}
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
              aria-pressed={showToken}
            >
              {showToken ? 'Скрыть' : 'Показать'}
            </button>
          </span>
        </label>

        <details className={styles.advanced}>
          <summary>Дополнительно</summary>
          <label className={styles.field} htmlFor={`${ids}-url`}>
            <span className={styles.label}>apiUrl</span>
            <input
              id={`${ids}-url`}
              className={styles.input}
              inputMode="url"
              spellCheck={false}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              disabled={pending}
              aria-invalid={!isHttpUrl(apiUrl)}
              aria-describedby={`${ids}-url-hint`}
            />
          </label>
          <p id={`${ids}-url-hint`} className={styles.hint}>
            Обычно менять не нужно. Если вход не проходит, укажите apiUrl из карточки инстанса.
          </p>
        </details>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={!canSubmit}>
          {pending ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
