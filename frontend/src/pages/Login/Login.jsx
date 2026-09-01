// frontend/src/pages/Login/Login.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Login.module.css";

import { Button } from "../../components/ui/Button/Button.jsx";
import { Input } from "../../components/ui/Input/Input.jsx";
import { Spinner } from "../../components/ui/Spinner/Spinner.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { ApiError } from "../../services/api/client.js";

function formatErrorMessage(payload) {
  if (!payload) {
    return "Unable to sign in. Please try again.";
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload === "object") {
    if (payload.detail) {
      return payload.detail;
    }

    for (const value of Object.values(payload)) {
      if (Array.isArray(value) && value.length > 0) {
        return value[0];
      }

      if (typeof value === "string") {
        return value;
      }
    }
  }

  return "Unable to sign in. Please try again.";
}

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);

    try {
      await login({
        username: email.trim(),
        password,
        rememberMe,
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatErrorMessage(err.detail));
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        {/* =========================
            BRAND
            ========================= */}

        <div className={styles.brandRow}>
          <div className={styles.logo}>✦</div>

          <div>
            <p className={styles.brand}>StudyGround</p>
            <p className={styles.brandMeta}>RAG-powered study companion</p>
          </div>
        </div>

        {/* =========================
            HEADER
            ========================= */}

        <div className={styles.headerBlock}>
          <h1 id="login-title" className={styles.title}>
            Welcome back
          </h1>

          <p className={styles.subtitle}>
            Continue your learning journey with grounded answers from your
            course materials
          </p>
        </div>

        {/* =========================
            LOGIN FORM
            ========================= */}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="john@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled={loading}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={loading}
            required
          />

          {/* =========================
              OPTIONS
              ========================= */}

          <div className={styles.metaRow}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={loading}
              />

              <span>Remember me</span>
            </label>

            <a href="#forgot-password" className={styles.forgotLink}>
              Forgot password
            </a>
          </div>

          {/* =========================
              ERROR
              ========================= */}

          {error ? (
            <div className={styles.errorBox} role="alert">
              {error}
            </div>
          ) : null}

          {/* =========================
              SIGN IN
              ========================= */}

          <Button type="submit" loading={loading} fullWidth>
            {loading ? "Signing in" : "Sign In"}
          </Button>
        </form>

        {/* =========================
            REGISTER LINK
            ========================= */}

        <p className={styles.footerText}>
          Don&apos;t have an account? <Link to="/register">Sign up</Link>
        </p>

        {/* =========================
            LOADING STATUS
            ========================= */}

        <div className={styles.loadingHint}>
          {loading ? (
            <>
              <Spinner size="sm" label="Signing in" />
              <span>Signing in...</span>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default Login;
