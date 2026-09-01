// frontend/src/components/layout/Sidebar/Sidebar.jsx

import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { get } from "../../../services/api/client.js";
import { API_ENDPOINTS } from "../../../services/api/endpoints.js";
import { UserMenu } from "../UserMenu/UserMenu.jsx";

import "@fortawesome/fontawesome-free/css/all.min.css";
import styles from "./Sidebar.module.css";

export function Sidebar({ mobileOpen = false, onClose }) {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    async function loadSidebarData() {
      try {
        const [coursesData, conversationsData] = await Promise.all([
          get(API_ENDPOINTS.COURSES),
          get(API_ENDPOINTS.CONVERSATIONS),
        ]);

        setCourses(coursesData);
        setConversations(conversationsData.slice(0, 5));
      } catch (error) {
        console.error("Failed to load sidebar data:", error);
      }
    }

    loadSidebarData();
  }, []);

  function handleNavigate(path) {
    if (onClose) {
      onClose();
    }

    navigate(path);
  }

  return (
    <aside
      className={[styles.sidebar, mobileOpen ? styles.mobileOpen : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label="Main navigation"
    >
      {/* =========================
          BRAND
          ========================= */}

      <button
        type="button"
        className={styles.brand}
        onClick={() => handleNavigate("/dashboard")}
        aria-label="Go to Dashboard"
      >
        <div className={styles.brandMark} aria-hidden="true">
          ✦
        </div>

        <span className={styles.brandName}>StudyGround</span>
      </button>

      {/* =========================
          NAVIGATION
          ========================= */}

      <nav className={styles.nav} aria-label="Primary">
        <p className={styles.sectionLabel}>Main</p>

        <ul className={styles.navList}>
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
              onClick={onClose}
            >
              <span className={styles.navIcon} aria-hidden="true">
                <i className="fa-solid fa-house" />
              </span>

              <span className={styles.itemLabel}>Dashboard</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* =========================
          COURSES
          ========================= */}

      <div className={styles.courses}>
        <p className={styles.sectionLabel}>Courses</p>

        <ul className={styles.courseList}>
          <li>
            <button
              type="button"
              className={styles.createCourse}
              onClick={() => handleNavigate("/courses/new")}
              title="Create Course"
            >
              <span className={styles.navIcon} aria-hidden="true">
                <i className="fa-solid fa-plus" />
              </span>

              <span className={styles.itemLabel}>Create Course</span>
            </button>
          </li>

          {courses.map((course) => (
            <li key={course.id}>
              <button
                type="button"
                className={styles.courseItem}
                onClick={() => handleNavigate(`/courses/${course.id}`)}
                title={course.name}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  <i className="fa-solid fa-book" />
                </span>

                <span className={styles.itemLabel}>{course.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* =========================
          RECENT CONVERSATIONS
          ========================= */}

      {conversations.length > 0 && (
        <div className={styles.recent}>
          <p className={styles.sectionLabel}>Recent</p>

          <ul className={styles.conversationList}>
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={styles.conversationItem}
                  onClick={() =>
                    handleNavigate(`/conversations/${conversation.id}`)
                  }
                  title={conversation.title}
                >
                  <span className={styles.navIcon} aria-hidden="true">
                    <i className="fa-regular fa-message" />
                  </span>

                  <span className={styles.itemLabel}>{conversation.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* =========================
          FOOTER / PROFILE
          ========================= */}

      <div className={styles.footer}>
        <UserMenu placement="top" />
      </div>
    </aside>
  );
}

export default Sidebar;
