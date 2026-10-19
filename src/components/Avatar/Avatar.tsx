import { avatarColor, initials } from '../../utils/avatar'
import styles from './Avatar.module.css'

interface AvatarProps {
  title: string
  colorKey: string
  size?: number
}

export function Avatar({ title, colorKey, size = 48 }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: avatarColor(colorKey),
      }}
      aria-hidden="true"
    >
      {initials(title)}
    </span>
  )
}
