import { useTheme } from '../context/ThemeContext'
import './ThemeToggle.css'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      className={`theme-toggle ${isLight ? 'theme-toggle--light' : ''}`}
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <div className="toggle-track">
        <span className="toggle-icon moon">🌙</span>
        <span className="toggle-icon sun">☀️</span>
        <div className="toggle-thumb" />
      </div>
    </button>
  )
}
