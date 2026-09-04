// frontend/src/layout/AppLayout/AppLayout.jsx
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar/Sidebar.jsx";
import { Header } from "../../components/layout/Header/Header.jsx";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileSidebarOpen]);

  return (
    <div
      className={[styles.shell, sidebarCollapsed ? styles.collapsed : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      />

      {mobileSidebarOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <div className={styles.mainWrapper}>
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
