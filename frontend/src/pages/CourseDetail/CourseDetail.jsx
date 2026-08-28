import { useParams } from 'react-router-dom'
import styles from './CourseDetail.module.css'

export function CourseDetail() {
  const { courseId } = useParams()

  return (
    <section className={styles.courseDetail}>
      <h2>Course</h2>
      <p className={styles.subtitle}>Course detail will be available in a future phase.</p>
      <p className={styles.meta}>
        Route parameter: <code>{courseId}</code>
      </p>
    </section>
  )
}

export default CourseDetail
