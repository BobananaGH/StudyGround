import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Register.module.css'
import { Button } from '../../components/ui/Button/Button.jsx'
import { Input } from '../../components/ui/Input/Input.jsx'
import { Spinner } from '../../components/ui/Spinner/Spinner.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { ApiError } from '../../services/api/client.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(formData) {
  const nextErrors = {}

  if (!formData.username.trim()) {
    nextErrors.username = 'Username is required.'
  }

  if (!formData.email.trim()) {
    nextErrors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(formData.email.trim())) {
    nextErrors.email = 'Please enter a valid email address.'
  }

  if (!formData.password) {
    nextErrors.password = 'Password is required.'
  } else if (formData.password.length < 8) {
    nextErrors.password = 'Password must be at least 8 characters.'
  }

  if (!formData.confirmPassword) {
    nextErrors.confirmPassword = 'Please confirm your password.'
  } else if (formData.confirmPassword !== formData.password) {
    nextErrors.confirmPassword = 'Passwords do not match.'
  }

  return nextErrors
}

function getErrorMessage(value) {
  if (Array.isArray(value) && value.length > 0) {
    return value[0]
  }

  if (typeof value === 'string') {
    return value
  }

  return ''
}

function mapRegisterErrors(payload) {
  const fieldErrors = {}
  const formErrors = []

  if (!payload) {
    return {
      fieldErrors,
      formError: 'Unable to create your account. Please try again.',
    }
  }

  if (typeof payload === 'string') {
    return { fieldErrors, formError: payload }
  }

  if (typeof payload === 'object') {
    if (payload.detail && typeof payload.detail === 'string') {
      formErrors.push(payload.detail)
    }

    for (const [field, value] of Object.entries(payload)) {
      const message = getErrorMessage(value)

      if (!message || field === 'detail') {
        continue
      }

      if (field === 'username') {
        fieldErrors.username = message
        continue
      }

      if (field === 'email') {
        fieldErrors.email = message
        continue
      }

      if (field === 'password') {
        fieldErrors.password = message
        continue
      }

      if (field === 'non_field_errors') {
        formErrors.push(message)
        continue
      }

      formErrors.push(message)
    }
  }

  return {
    fieldErrors,
    formError: formErrors[0] || '',
  }
}

export function Register() {
  const navigate = useNavigate()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  function handleChange(field) {
    return (event) => {
      const { value } = event.target

      setFormData((current) => ({
        ...current,
        [field]: value,
      }))
      setApiError('')
      setErrors((current) => {
        if (!current[field] && field !== 'password' && field !== 'confirmPassword') {
          return current
        }

        const nextErrors = { ...current }
        delete nextErrors[field]

        if (field === 'password' || field === 'confirmPassword') {
          delete nextErrors.confirmPassword
        }

        return nextErrors
      })
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setApiError('')

    const validationErrors = validateForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      await register(
        {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
        },
        { rememberMe: true },
      )

      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        const { fieldErrors, formError } = mapRegisterErrors(err.detail)
        setErrors(fieldErrors)
        setApiError(formError)
      } else if (err instanceof Error) {
        setApiError('Unable to connect to the server. Please check your connection and try again.')
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="register-title">
        <div className={styles.brandRow}>
          <div className={styles.logo}>✦</div>
          <div>
            <p className={styles.brand}>StudyAI</p>
            <p className={styles.brandMeta}>RAG-powered study companion</p>
          </div>
        </div>

        <div className={styles.headerBlock}>
          <h1 id="register-title" className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Start learning with your AI-powered study assistant.</p>
        </div>

        <div className={styles.themeBar} aria-label="Theme switcher">
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
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            label="Username"
            name="username"
            type="text"
            placeholder="studyai_learner"
            value={formData.username}
            onChange={handleChange('username')}
            autoComplete="username"
            error={errors.username}
            disabled={isSubmitting}
            required
          />

          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="john@email.com"
            value={formData.email}
            onChange={handleChange('email')}
            autoComplete="email"
            error={errors.email}
            disabled={isSubmitting}
            required
          />

          <div className={styles.passwordRow}>
            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange('password')}
              autoComplete="new-password"
              error={errors.password}
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={isSubmitting}
            >
            </button>
          </div>

          <div className={styles.passwordRow}>
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              autoComplete="new-password"
              error={errors.confirmPassword}
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              disabled={isSubmitting}
            >
            </button>
          </div>

          {apiError ? <div className={styles.errorBox} role="alert">{apiError}</div> : null}

          <Button type="submit" loading={isSubmitting} fullWidth>
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className={styles.footerText}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        <div className={styles.loadingHint}>
          {isSubmitting ? (
            <>
              <Spinner size="sm" label="Creating account" />
              <span>Creating account...</span>
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default Register
