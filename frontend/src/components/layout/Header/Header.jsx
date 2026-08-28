import { useLocation } from 'react-router-dom'
import { getTitleForPath } from '../../../data/routes.js'
import { useTheme } from '../../../hooks/useTheme.js'
import { UserMenu } from '../UserMenu/UserMenu.jsx'
import styles from './Header.module.css'

export function Header({ onMenuClick }) {
  const location = useLocation()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const pageTitle = getTitleForPath(location.pathname)

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuTrigger}
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <h1 className={styles.title}>{pageTitle}</h1>
      </div>

      <div className={styles.right}>
        <div className={styles.themeSelector} aria-label="Theme switcher">
          <button
            type="button"
            className={theme === 'light' ? styles.themeActive : styles.themeOption}
            onClick={() => setTheme('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={theme === 'dark' ? styles.themeActive : styles.themeOption}
            onClick={() => setTheme('dark')}
          >
            Dark
          </button>
          <button
            type="button"
            className={theme === 'system' ? styles.themeActive : styles.themeOption}
            onClick={() => setTheme('system')}
          >
            System
          </button>
          <span className={styles.themeLabel}>{resolvedTheme}</span>
        </div>

        <UserMenu compact placement="bottom" />
      </div>
    </header>
  )
}

export default Header
