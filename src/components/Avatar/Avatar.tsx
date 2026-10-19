import { avatarBackground } from '../../utils/avatar'
import styles from './Avatar.module.css'

interface AvatarProps {
  /** Буквы на аватаре; null — значок-силуэт */
  letters: string | null
  colorKey: string
  size?: number
}

export function Avatar({ letters, colorKey, size = 48 }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: avatarBackground(colorKey),
      }}
      aria-hidden="true"
    >
      {letters ?? (
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4.2" fill="currentColor" />
          <path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" fill="currentColor" />
        </svg>
      )}
    </span>
  )
}
