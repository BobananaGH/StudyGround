// frontend/src/pages/Dashboard/Dashboard.jsx

import { useAuth } from "../../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { get } from "../../services/api/client.js";
import { API_ENDPOINTS } from "../../services/api/endpoints.js";
import { Button } from "../../components/ui/Button/Button.jsx";

import "@fortawesome/fontawesome-free/css/all.min.css";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState(null);

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState(null);

  useEffect(() => {
    async function loadCourses() {
      try {
        setCoursesLoading(true);
        setCoursesError(null);

        const data = await get(API_ENDPOINTS.COURSES);

        setCourses(data);
      } catch (error) {
        console.error("Failed to load courses:", error);
        setCoursesError(error.message || "Unable to load courses.");
      } finally {
        setCoursesLoading(false);
      }
    }

    loadCourses();
  }, []);

  useEffect(() => {
    async function loadConversations() {
      try {
        setConversationsLoading(true);
        setConversationsError(null);

        const data = await get(API_ENDPOINTS.CONVERSATIONS);

        setConversations(data);
      } catch (error) {
        console.error("Failed to load conversations:", error);
        setConversationsError(error.message || "Unable to load conversations.");
      } finally {
        setConversationsLoading(false);
      }
    }

    loadConversations();
  }, []);

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    "there";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const recentConversations = conversations.slice(0, 5);

  return (
    <section className={styles.dashboard}>
      {/* =========================
          HERO
          ========================= */}

      <header className={styles.hero}>
        <p className={styles.eyebrow}>Good {greeting}</p>

        <h1 className={styles.title}>Welcome back, {displayName}.</h1>

        <p className={styles.subtitle}>
          Pick up where you left off or start a new study session.
        </p>
      </header>

      {/* =========================
          COURSES
          ========================= */}

      <section className={styles.section} aria-labelledby="courses-heading">
        <div className={styles.sectionHeader}>
          <h2 id="courses-heading" className={styles.sectionTitle}>
            Your Courses
          </h2>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate("/courses/new")}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" />

            <span>Create Course</span>
          </Button>
        </div>

        {coursesLoading ? (
          <p>Loading courses...</p>
        ) : coursesError ? (
          <p>Failed to load courses: {coursesError}</p>
        ) : courses.length > 0 ? (
          <div className={styles.courseGrid}>
            {courses.map((course) => (
              <article key={course.id} className={styles.courseCard}>
                <Link
                  to={`/courses/${course.id}`}
                  className={styles.courseLink}
                >
                  <div className={styles.courseIcon} aria-hidden="true">
                    <i className="fa-solid fa-book" />
                  </div>

                  <h3 className={styles.courseName}>{course.name}</h3>
                </Link>

                <div className={styles.courseMeta}>
                  <span className={styles.courseId}>
                    {course.code || "No code"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>No courses yet.</p>
        )}
      </section>

      {/* =========================
          RECENT CONVERSATIONS
          ========================= */}

      <section className={styles.section} aria-labelledby="recent-heading">
        <div className={styles.sectionHeader}>
          <h2 id="recent-heading" className={styles.sectionTitle}>
            Recent Conversations
          </h2>
        </div>

        {conversationsLoading ? (
          <p>Loading conversations...</p>
        ) : conversationsError ? (
          <p>Failed to load conversations: {conversationsError}</p>
        ) : recentConversations.length > 0 ? (
          <div className={styles.conversationList}>
            {recentConversations.map((conv) => (
              <article key={conv.id} className={styles.conversationCard}>
                <Link
                  to={`/conversations/${conv.id}`}
                  className={styles.conversationLink}
                >
                  <div className={styles.conversationIcon} aria-hidden="true">
                    <i className="fa-regular fa-message" />
                  </div>

                  <div className={styles.conversationContent}>
                    <h3 className={styles.conversationTitle}>{conv.title}</h3>

                    {conv.course_id && (
                      <p className={styles.conversationMeta}>
                        Course study session
                      </p>
                    )}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No conversations yet.</p>

            <p className={styles.emptyHint}>
              Start a conversation from a course page to see it here.
            </p>
          </div>
        )}
      </section>

      {/* =========================
          QUICK ACTIONS
          ========================= */}

      <section className={styles.section} aria-labelledby="quick-heading">
        <h2 id="quick-heading" className={styles.sectionTitle}>
          Quick Actions
        </h2>

        <div className={styles.actionGrid}>
          <Link to="/courses/new" className={styles.actionCard}>
            <span className={styles.actionIcon} aria-hidden="true">
              <i className="fa-solid fa-plus" />
            </span>

            <h3 className={styles.actionTitle}>Create Course</h3>

            <p className={styles.actionDesc}>
              Add a new course and upload study materials
            </p>
          </Link>

          <Link to="/settings" className={styles.actionCard}>
            <span className={styles.actionIcon} aria-hidden="true">
              <i className="fa-solid fa-gear" />
            </span>

            <h3 className={styles.actionTitle}>Settings</h3>

            <p className={styles.actionDesc}>
              Manage your account and preferences
            </p>
          </Link>
        </div>
      </section>
    </section>
  );
}

export default Dashboard;
