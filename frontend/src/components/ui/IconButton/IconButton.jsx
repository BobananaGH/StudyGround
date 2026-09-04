import styles from './IconButton.module.css'

export function IconButton({
  children,
  className = '',
  variant = 'ghost',
  size = 'md',
  'aria-label': ariaLabel,
  ...props
}) {
  const classes = [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} aria-label={ariaLabel} {...props}>
      {children}
    </button>
  )
}

export default IconButton
