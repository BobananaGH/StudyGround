import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button/Button.jsx'
import styles from './CreateCourse.module.css'

export function CreateCourse() {
  const navigate = useNavigate()

  return (
    <section className={styles.createCourse}>
      <h2>Create Course</h2>
      <p className={styles.subtitle}>
        Course creation will be available in a future phase.
      </p>
      <div className={styles.actions}>
        <Button onClick={() => navigate('/dashboard', { replace: true })}>
          Back to Dashboard
        </Button>
      </div>
    </section>
  )
}

export default CreateCourse
