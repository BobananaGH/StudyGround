import styles from './Spinner.module.css'

export function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  const sizeDim = size === 'sm' ? 16 : 20
  const classes = [styles.spinner, className].filter(Boolean).join(' ')

  return (
    <svg
      className={classes}
      role="status"
      aria-label={label}
      width={sizeDim}
      height={sizeDim}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="2" fill="none" />
      <path
        d="M12 2a10 10 0 0 1 0 20M12 22a10 10 0 0 1 0-20"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  )
}

export default Spinner