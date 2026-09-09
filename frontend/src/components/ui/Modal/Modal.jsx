import { useEffect } from 'react'
import styles from './Modal.module.css'

export function Modal({ isOpen, onClose, title, children, size = 'md', showCloseButton = true }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const handleEscape = (e) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleEscape)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      <div className={[styles.modal, styles[size]].filter(Boolean).join(' ')} onClick={(e) => e.stopPropagation()}>
        {(title || showCloseButton) && (
          <header className={styles.header}>
            {title && <h2 id="modal-title" className={styles.title}>{title}</h2>}
            {showCloseButton && (
              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close modal"
              >
                <span aria-hidden="true">✕</span>
              </button>
            )}
          </header>
        )}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal