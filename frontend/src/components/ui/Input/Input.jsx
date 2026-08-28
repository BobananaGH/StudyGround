import { forwardRef, useId, useState } from 'react'
import styles from './Input.module.css'
import { Button } from '../Button/Button.jsx'

export const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    type = 'text',
    className = '',
    wrapperClassName = '',
    rightAction,
    ...props
  },
  ref,
) {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')
  const classes = [styles.input, error ? styles.error : '', className].filter(Boolean).join(' ')
  const wrapperClasses = [styles.field, wrapperClassName].filter(Boolean).join(' ')
  const [visiblePassword, setVisiblePassword] = useState(false)
  const resolvedType = type === 'password' && visiblePassword ? 'text' : type

  return (
    <label className={wrapperClasses} htmlFor={inputId}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <div className={styles.controlRow}>
        <input
          id={inputId}
          ref={ref}
          type={resolvedType}
          className={classes}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {type === 'password' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={styles.toggleButton}
            onClick={() => setVisiblePassword((current) => !current)}
            aria-label={visiblePassword ? 'Hide password' : 'Show password'}
          >
            {visiblePassword ? 'Hide' : 'Show'}
          </Button>
        ) : null}
        {rightAction ? <div className={styles.rightAction}>{rightAction}</div> : null}
      </div>
      {hint ? (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className={styles.errorText} id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
})

export default Input
