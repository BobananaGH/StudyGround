// frontend/src/components/layout/Sidebar/Sidebar.jsx
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { get, del } from "../../../services/api/client.js";
import { API_ENDPOINTS } from "../../../services/api/endpoints.js";
import {
  APP_EVENTS,
  emitAppEvent,
  subscribeAppEvent,
} from "../../../services/appEvents.js";
import { UserMenu } from "../UserMenu/UserMenu.jsx";
import { ConfirmDialog } from "../../ui/ConfirmDialog/ConfirmDialog.jsx";
import "@fortawesome/fontawesome-free/css/all.min.css";
import styles from "./Sidebar.module.css";

export function Sidebar({ mobileOpen = false, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [courses, setCourses] = useState([]);
  const [conversations, setConversations] = useState([]);

  // { type: "course" | "conversation", item: object }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function loadSidebarData() {
      try {
        const [coursesData, conversationsData] = await Promise.all([
          get(API_ENDPOINTS.COURSES),
          get(API_ENDPOINTS.CONVERSATIONS),
        ]);

        setCourses(coursesData || []);
        setConversations((conversationsData || []).slice(0, 5));
      } catch (error) {
        console.error("Failed to load sidebar data:", error);
      }
    }

    loadSidebarData();

    const unsubscribeCourses = subscribeAppEvent(
      APP_EVENTS.COURSES_CHANGED,
      loadSidebarData,
    );

    const unsubscribeConversations = subscribeAppEvent(
      APP_EVENTS.CONVERSATIONS_CHANGED,
      loadSidebarData,
    );

    return () => {
      unsubscribeCourses();
      unsubscribeConversations();
    };
  }, []);

  function handleNavigate(path) {
    if (onClose) {
      onClose();
    }

    navigate(path);
  }

  // ============================================================
  // DELETE
  // ============================================================

  function handleDeleteClick(event, type, item) {
    event.stopPropagation();

    setDeleteTarget({
      type,
      item,
    });
  }

  function handleCancelDelete() {
    if (deleteLoading) {
      return;
    }

    setDeleteTarget(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || deleteLoading) {
      return;
    }

    const { type, item } = deleteTarget;

    setDeleteLoading(true);

    try {
      if (type === "conversation") {
        // ======================================================
        // DELETE CONVERSATION
        // ======================================================

        await del(`${API_ENDPOINTS.CONVERSATIONS}${item.id}/`);

        // Notify other components that conversations changed.
        emitAppEvent(APP_EVENTS.CONVERSATIONS_CHANGED);

        // Remove immediately from the local sidebar state.
        setConversations((current) =>
          current.filter((conversation) => conversation.id !== item.id),
        );

        const currentConversationPath = `/conversations/${item.id}`;

        if (location.pathname === currentConversationPath) {
          setDeleteTarget(null);
          navigate("/dashboard");

          if (onClose) {
            onClose();
          }
        } else {
          setDeleteTarget(null);
        }
      } else if (type === "course") {
        // ======================================================
        // DELETE COURSE
        // ======================================================

        await del(`${API_ENDPOINTS.COURSES}${item.id}/`);

        // Notify other components that courses changed.
        emitAppEvent(APP_EVENTS.COURSES_CHANGED);

        // The backend deletes conversations belonging to the course.
        emitAppEvent(APP_EVENTS.CONVERSATIONS_CHANGED);

        // Remove the deleted course immediately.
        setCourses((current) =>
          current.filter((course) => course.id !== item.id),
        );

        // Remove conversations belonging to the deleted course.
        setConversations((current) =>
          current.filter(
            (conversation) =>
              Number(conversation.course_id) !== Number(item.id),
          ),
        );

        const currentCoursePath = `/courses/${item.id}`;

        // If currently viewing the deleted course,
        // go back to dashboard.
        if (location.pathname === currentCoursePath) {
          setDeleteTarget(null);
          navigate("/dashboard");

          if (onClose) {
            onClose();
          }
        } else {
          setDeleteTarget(null);
        }
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
    } finally {
      setDeleteLoading(false);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <aside
        className={[styles.sidebar, mobileOpen ? styles.mobileOpen : ""]
          .filter(Boolean)
          .join(" ")}
        aria-label="Main navigation"
      >
        {/* =====================================================
            BRAND
            ===================================================== */}

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

        {/* =====================================================
            NAVIGATION
            ===================================================== */}

        <nav className={styles.nav} aria-label="Primary">
          <p className={styles.sectionLabel}>Main</p>

          <ul className={styles.navList}>
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive
                    ? `${styles.navItem} ${styles.active}`
                    : styles.navItem
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

        {/* =====================================================
            COURSES
            ===================================================== */}

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
              <li key={course.id} className={styles.courseRow}>
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

                {/* DELETE COURSE */}
                <button
                  type="button"
                  className={styles.deleteCourse}
                  onClick={(event) =>
                    handleDeleteClick(event, "course", course)
                  }
                  aria-label={`Delete ${course.name}`}
                  title="Delete course"
                >
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* =====================================================
            RECENT CONVERSATIONS
            ===================================================== */}

        {conversations.length > 0 && (
          <div className={styles.recent}>
            <p className={styles.sectionLabel}>Recent</p>

            <ul className={styles.conversationList}>
              {conversations.map((conversation) => (
                <li key={conversation.id} className={styles.conversationRow}>
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

                    <span className={styles.itemLabel}>
                      {conversation.title}
                    </span>
                  </button>

                  {/* DELETE CONVERSATION */}
                  <button
                    type="button"
                    className={styles.deleteConversation}
                    onClick={(event) =>
                      handleDeleteClick(event, "conversation", conversation)
                    }
                    aria-label={`Delete ${conversation.title}`}
                    title="Delete conversation"
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* =====================================================
            FOOTER / PROFILE
            ===================================================== */}

        <div className={styles.footer}>
          <UserMenu placement="top" />
        </div>
      </aside>

      {/* =======================================================
          DELETE CONFIRMATION
          ======================================================= */}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.type === "course"
            ? "Delete course?"
            : "Delete conversation?"
        }
        description={
          deleteTarget?.type === "course"
            ? `"${deleteTarget.item.name}" and all of its study materials, document chunks, and course conversations will be permanently deleted. This action cannot be undone.`
            : deleteTarget
              ? `"${deleteTarget.item.title}" will be permanently deleted. This action cannot be undone.`
              : ""
        }
        confirmLabel={
          deleteTarget?.type === "course" ? "Delete course" : "Delete"
        }
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={deleteLoading}
        icon="fa-trash"
      />
    </>
  );
}

export default Sidebar;
