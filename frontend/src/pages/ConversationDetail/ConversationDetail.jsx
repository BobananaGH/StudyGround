import { useParams } from 'react-router-dom'
import styles from './ConversationDetail.module.css'

export function ConversationDetail() {
  const { conversationId } = useParams()

  return (
    <section className={styles.conversationDetail}>
      <h2>Conversation</h2>
      <p className={styles.subtitle}>
        The RAG chat experience will be available in a future phase.
      </p>
      <p className={styles.meta}>
        Route parameter: <code>{conversationId}</code>
      </p>
    </section>
  )
}

export default ConversationDetail
