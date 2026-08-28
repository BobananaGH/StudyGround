import { NavLink, useNavigate } from 'react-router-dom'
import { mockCourses } from '../../../data/mockCourses.js'
import { mockConversations } from '../../../data/mockConversations.js'
import { UserMenu } from '../UserMenu/UserMenu.jsx'
import styles from './Sidebar.module.css'

export function Sidebar({ collapsed = false, mobileOpen = false, onClose, onToggleCollapsed }) {
  const navigate = useNavigate()

  function handleNavigate(path) {
    if (onClose) {
      onClose()
    }
    navigate(path)
  }

  return (
    <aside
      className={[
        styles.sidebar,
        collapsed ? styles.collapsed : '',
        mobileOpen ? styles.mobileOpen : '',
      ].filter(Boolean).join(' ')}
      aria-label="Main navigation"
    >
      <div className={styles.brand}>
        <div className={styles.brandMark} aria-hidden="true">✦</div>
        <span className={styles.brandName}>StudyAI</span>
      </div>

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
              <span aria-hidden="true">◉</span>
              <span className={styles.itemLabel}>Dashboard</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className={styles.courses}>
        <p className={styles.sectionLabel}>Courses</p>
        <ul className={styles.courseList}>
          <li>
            <button
              type="button"
              className={styles.createCourse}
              onClick={() => handleNavigate('/courses/new')}
              title="Create Course"
            >
              <span aria-hidden="true">+</span>
              <span className={styles.itemLabel}>Create Course</span>
            </button>
          </li>
          {mockCourses.map((course) => (
            <li key={course.id}>
              <button
                type="button"
                className={styles.courseItem}
                onClick={() => handleNavigate(`/courses/${course.id}`)}
                title={course.name}
              >
                <span aria-hidden="true">▣</span>
                <span className={styles.itemLabel}>{course.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.recent}>
        <p className={styles.sectionLabel}>Recent</p>
        <ul className={styles.conversationList}>
          {mockConversations.map((conv) => (
            <li key={conv.id}>
              <button
                type="button"
                className={styles.conversationItem}
                onClick={() => handleNavigate(`/conversations/${conv.id}`)}
                title={conv.title}
              >
                <span aria-hidden="true">◇</span>
                <span className={styles.itemLabel}>{conv.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.footer}>
        <UserMenu compact={collapsed} placement="top" />
        <button
          type="button"
          className={styles.collapseButton}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          <span aria-hidden="true">{collapsed ? '▶' : '◀'}</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
