// frontend/src/components/ui/Input/Input.jsx
import { forwardRef, useId, useState } from "react";
import styles from "./Input.module.css";

export const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    type = "text",
    className = "",
    wrapperClassName = "",
    rightAction,
    ...props
  },
  ref,
) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  const classes = [styles.input, error ? styles.error : "", className]
    .filter(Boolean)
    .join(" ");

  const wrapperClasses = [styles.field, wrapperClassName]
    .filter(Boolean)
    .join(" ");

  const [visiblePassword, setVisiblePassword] = useState(false);

  const resolvedType = type === "password" && visiblePassword ? "text" : type;

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
          aria-invalid={error ? "true" : undefined}
          {...props}
        />

        {type === "password" ? (
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => setVisiblePassword((current) => !current)}
            aria-label="Toggle password visibility"
            disabled={props.disabled}
          >
            <i
              className={
                visiblePassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"
              }
              aria-hidden="true"
            />
          </button>
        ) : null}

        {rightAction ? (
          <div className={styles.rightAction}>{rightAction}</div>
        ) : null}
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
  );
});

export default Input;
