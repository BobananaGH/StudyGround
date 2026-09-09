import { useAuth } from '../../context/AuthContext.jsx'
import { coursesService } from '../../services/courses.service.js'
import { conversationsService } from '../../services/conversations.service.js'
import { documentsService } from '../../services/documents.service.js'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { Spinner } from '../../components/ui/Spinner/Spinner.jsx'
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
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [recentConversations, setRecentConversations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [docCount, setDocCount] = useState(0)
  const [docCountError, setDocCountError] = useState(false)

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ')
    || user?.username
    || user?.email
    || 'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  // Create course lookup for conversation display
  const courseLookup = useMemo(() => {
    const lookup = {}
    courses.forEach((course) => {
      lookup[course.id] = course.name
    })
    return lookup
  }, [courses])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError('')
        const [coursesData, conversationsData] = await Promise.all([
          coursesService.getCourses(),
          conversationsService.getConversations(),
        ])
        setCourses(coursesData)
        setRecentConversations((conversationsData || []).slice(0, 5))

        // Fetch documents count for each course
        let totalDocs = 0
        let docsFailed = false
        if (coursesData && coursesData.length > 0) {
          for (const course of coursesData) {
            try {
              const docs = await documentsService.getDocuments(course.id)
              totalDocs += (docs || []).length
            } catch {
              docsFailed = true
            }
          }
        }
        setDocCount(totalDocs)
        setDocCountError(docsFailed)
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <section className={styles.dashboard}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Good {greeting}</p>
          <h1 className={styles.title}>Welcome back, {displayName}.</h1>
          <p className={styles.subtitle}>
            Pick up where you left off or start a new study session.
          </p>
        </header>

        <section className={styles.statGrid} aria-label="Stats loading">
          <div className={styles.statCardSkeleton} />
          <div className={styles.statCardSkeleton} />
          <div className={styles.statCardSkeleton} />
        </section>

        <section className={styles.section} aria-labelledby="courses-heading">
          <div className={styles.sectionHeader}>
            <h2 id="courses-heading" className={styles.sectionTitle}>Your Courses</h2>
          </div>
          <div className={styles.courseGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.courseCardSkeleton} />
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="recent-heading">
          <div className={styles.sectionHeader}>
            <h2 id="recent-heading" className={styles.sectionTitle}>Recent Conversations</h2>
          </div>
          <div className={styles.conversationList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.conversationCardSkeleton} />
            ))}
          </div>
        </section>
      </section>
    )
  }

  if (error) {
    return (
      <section className={styles.dashboard}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.retryBtn}>
            Retry
          </button>
        </div>
      </section>
    )
  }

  const stats = [
    { label: 'Courses', value: courses.length, icon: '📚', error: false },
    { label: 'Conversations', value: recentConversations.length, icon: '💬', error: false },
    { label: 'Documents', value: docCount, icon: '📄', error: docCountError },
  ]

  return (
    <section className={styles.dashboard}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Good {greeting}</p>
        <h1 className={styles.title}>Welcome back, {displayName}.</h1>
        <p className={styles.subtitle}>
          Pick up where you left off or start a new study session.
        </p>
      </header>

      <section className={styles.statGrid} aria-label="Overview stats">
        {stats.map((stat) => (
          <article key={stat.label} className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden="true">{stat.icon}</span>
            <div className={styles.statValue}>{stat.error ? '—' : stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </article>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="courses-heading">
        <div className={styles.sectionHeader}>
          <h2 id="courses-heading" className={styles.sectionTitle}>Your Courses</h2>
          <Link to="/courses/new" className={styles.createLink}>
            <span aria-hidden="true">+</span> Create Course
          </Link>
        </div>
        {courses.length > 0 ? (
          <div className={styles.courseGrid}>
            {courses.map((course) => (
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
        ) : (
          <div className={styles.emptyState}>
            <p>No courses yet.</p>
            <p className={styles.emptyHint}>Create your first course to get started.</p>
            <Link to="/courses/new" className={styles.createLink}>
              <span aria-hidden="true">+</span> Create Course
            </Link>
          </div>
        )}
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
                    <div className={styles.conversationTitleRow}>
                      <h3 className={styles.conversationTitle}>{conv.title}</h3>
                      {conv.courseId && courseLookup[conv.courseId] && (
                        <span className={styles.courseTag}>{courseLookup[conv.courseId]}</span>
                      )}
                      {conv.courseId && !courseLookup[conv.courseId] && (
                        <span className={styles.courseTagUnknown}>Unknown Course</span>
                      )}
                    </div>
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
          <div
            className={styles.actionCard}
            onClick={() => navigate('/courses/new')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/courses/new')}
          >
            <span className={styles.actionIcon} aria-hidden="true">+</span>
            <h3 className={styles.actionTitle}>Create Course</h3>
            <p className={styles.actionDesc}>Add a new course and upload study materials</p>
          </div>
          <div
            className={styles.actionCard}
            onClick={() => {
              if (courses.length === 0) {
                navigate('/courses/new')
                  return
              }
              navigate('/courses')
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && (courses.length === 0 ? navigate('/courses/new') : navigate('/courses'))}
          >
            <span className={styles.actionIcon} aria-hidden="true">💬</span>
            <h3 className={styles.actionTitle}>Start a Conversation</h3>
            <p className={styles.actionDesc}>Pick a course and begin a new study chat</p>
          </div>
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