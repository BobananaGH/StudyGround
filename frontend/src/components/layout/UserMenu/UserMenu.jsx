// frontend/src/components/layout/UserMenu/UserMenu.jsx

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import styles from "./UserMenu.module.css";

function getDisplayName(user) {
  return (
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    "User"
  );
}

function getInitials(name) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

export function UserMenu({ placement = "top" }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleNavigate(path) {
    setOpen(false);
    navigate(path);
  }

  function handleLogout() {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  const menuClass = [
    styles.menu,
    placement === "bottom" ? styles.menuBottom : styles.menuTop,
  ].join(" ");

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        aria-label="Open user menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className={styles.avatar}>{initials}</span>

        <span className={styles.identity}>
          <span className={styles.name}>{displayName}</span>

          <span className={styles.email}>{user?.email || "Signed in"}</span>
        </span>
      </button>

      {open ? (
        <div className={menuClass} role="menu">
          <button type="button" role="menuitem" onClick={() => setOpen(false)}>
            Profile
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavigate("/settings")}
          >
            Settings
          </button>

          <div className={styles.divider} />

          <button
            type="button"
            role="menuitem"
            className={styles.danger}
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default UserMenu;
