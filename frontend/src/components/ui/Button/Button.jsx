import styles from "./Button.module.css";
import { Spinner } from "../Spinner/Spinner.jsx";

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  type = "button",
  className = "",
  onClick,
  ...props
}) {
  const isDisabled = disabled || loading;
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    loading ? styles.loading : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      onClick={onClick}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className={styles.spinnerWrapper} aria-hidden="true">
          <Spinner size="sm" />
        </span>
      )}
      <span className={loading ? styles.labelHidden : ""}>{children}</span>
    </button>
  );
}

export default Button;
