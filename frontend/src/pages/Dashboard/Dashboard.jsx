import { useAuth } from '../../context/AuthContext.jsx'
import { mockCourses } from '../../data/mockCourses.js'
import { mockConversations } from '../../data/mockConversations.js'
import { Link } from 'react-router-dom'
import styles from './Dashboard.module.css'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatDate(iso) {
  return dateFormatter.format(new Date(iso))
}

export function Dashboard() {
  const { user } = useAuth()

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ')
    || user?.username
    || user?.email
    || 'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const recentConversations = mockConversations.slice(0, 5)

  return (
    <section className={styles.dashboard}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Good {greeting}</p>
        <h1 className={styles.title}>Welcome back, {displayName}.</h1>
        <p className={styles.subtitle}>
          Pick up where you left off or start a new study session.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="courses-heading">
        <div className={styles.sectionHeader}>
          <h2 id="courses-heading" className={styles.sectionTitle}>Your Courses</h2>
          <Link to="/courses/new" className={styles.createLink}>
            <span aria-hidden="true">+</span> Create Course
          </Link>
        </div>
        <div className={styles.courseGrid}>
          {mockCourses.map((course) => (
            <article key={course.id} className={styles.courseCard}>
              <Link to={`/courses/${course.id}`} className={styles.courseLink}>
                <div className={styles.courseIcon} aria-hidden="true">▣</div>
                <h3 className={styles.courseName}>{course.name}</h3>
              </Link>
              <div className={styles.courseMeta}>
                <span className={styles.courseId}>{course.id}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="recent-heading">
        <div className={styles.sectionHeader}>
          <h2 id="recent-heading" className={styles.sectionTitle}>Recent Conversations</h2>
        </div>
        {recentConversations.length > 0 ? (
          <div className={styles.conversationList}>
            {recentConversations.map((conv) => (
              <article key={conv.id} className={styles.conversationCard}>
                <Link to={`/conversations/${conv.id}`} className={styles.conversationLink}>
                  <div className={styles.conversationIcon} aria-hidden="true">◇</div>
                  <div className={styles.conversationContent}>
                    <h3 className={styles.conversationTitle}>{conv.title}</h3>
                    <p className={styles.conversationMeta}>
                      Updated {formatDate(conv.updatedAt)}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No conversations yet.</p>
            <p className={styles.emptyHint}>Start a conversation from a course page to see it here.</p>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="quick-heading">
        <h2 id="quick-heading" className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <Link to="/courses/new" className={styles.actionCard}>
            <span className={styles.actionIcon} aria-hidden="true">+</span>
            <h3 className={styles.actionTitle}>Create Course</h3>
            <p className={styles.actionDesc}>Add a new course and upload study materials</p>
          </Link>
          <Link to="/settings" className={styles.actionCard}>
            <span className={styles.actionIcon} aria-hidden="true">⚙</span>
            <h3 className={styles.actionTitle}>Settings</h3>
            <p className={styles.actionDesc}>Manage your account and preferences</p>
          </Link>
        </div>
      </section>
    </section>
  )
}

export default Dashboard