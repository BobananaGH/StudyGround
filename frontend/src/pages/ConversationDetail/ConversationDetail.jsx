import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMessages, sendMessage, getConversation } from '../../services/conversations.service.js'
import styles from './ConversationDetail.module.css'

export function ConversationDetail() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState(null)
  const [placeholderMessageId, setPlaceholderMessageId] = useState(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversation = async () => {
    try {
      setLoading(true)
      setError(null)
      const [conversationData, messagesData] = await Promise.all([
        getConversation(conversationId),
        getMessages(conversationId),
      ])
      setMessages(messagesData)
    } catch (err) {
      setError(err.message || 'Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (conversationId) {
      loadConversation()
    }
  }, [conversationId])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: newMessage,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentMessage = newMessage
    setNewMessage('')
    setSending(true)
    setIsStreaming(true)
    setStreamError(null)
    setPlaceholderMessageId(Date.now())

    try {
      const response = await sendMessage(conversationId, currentMessage)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let isClosed = false

      // Create placeholder message for assistant with blinking cursor
      const placeholderMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '', // Will be updated incrementally
        createdAt: new Date().toISOString(),
        isPlaceholder: true,
      }
      setMessages((prev) => [...prev, placeholderMessage])
      setPlaceholderMessageId(placeholderMessage.id)

      while (!isClosed) {
        const { done, value } = await reader.read()
        if (done) {
          isClosed = true
          break
        }
        buffer += decoder.decode(value, { stream: true })

        // Update placeholder message content incrementally
        setMessages((prev) => {
          const updatedMessages = [...prev]
          const messageIndex = updatedMessages.findIndex(m => m.id === placeholderMessage.id)
          if (messageIndex !== -1) {
            updatedMessages[messageIndex].content = buffer
          }
          return updatedMessages
        })
      }

      // Finalize message after stream completes
      if (response.ok) {
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: buffer,
          citations: response.citations || [],
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => {
          const updatedMessages = [...prev]
          const messageIndex = updatedMessages.findIndex(m => m.id === placeholderMessage.id)
          if (messageIndex !== -1) {
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              role: 'assistant',
              content: buffer,
              isPlaceholder: false,
              citations: response.citations || [],
            }
          }
          return updatedMessages
        })
      } else {
        throw new Error(`Server error: ${response.status}`)
      }

    } catch (err) {
      // Handle streaming errors
      setStreamError(err.message || 'Stream error')
      setMessages((prev) => prev.filter(m => m.id !== placeholderMessage.id))
    } finally {
      setSending(false)
      setIsStreaming(false)
    }
  }

  if (loading) {
    return (
      <section className={styles.conversationDetail}>
        <div className={styles.loading}>Loading conversation...</div>
      </section>
    )
  }

  if (error) {
    return (
      <section className={styles.conversationDetail}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={loadConversation} className={styles.retryBtn}>
            Retry
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.conversationDetail}>
      <header className={styles.header}>
        <button
          onClick={() => navigate(-1)}
          className={styles.backBtn}
          aria-label="Back"
        >
          ← Back
        </button>
        <h2 className={styles.title}>Conversation</h2>
      </header>

      <div className={styles.messagesContainer} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.message} ${styles[msg.role]}`}
              style={{
                animation: msg.isPlaceholder ? 'blink 1s infinite' : 'none'
              }}
            >
              <div className={styles.messageBubble}>
                <span className={styles.messageRole}>
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </span>
                <p className={styles.messageContent}>
                  {msg.isPlaceholder
                    ? '...'
                    : msg.content}
                </p>
                {msg.citations && msg.citations.length > 0 && (
                  <details className={styles.citations}>
                    <summary>Sources ({msg.citations.length})</summary>
                    <ul>
                      {msg.citations.map((citation, idx) => (
                        <li key={idx}>
                          <code>{citation.chunk_id || citation.id || `Source ${idx + 1}`}</code>
                          {citation.score && <span className={styles.score}>({citation.score})</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <time className={styles.messageTime} dateTime={msg.createdAt}>
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </time>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className={styles.inputForm}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className={styles.input}
          disabled={sending || !newMessage.trim()}
          aria-label="Message input"
        />
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={sending || !newMessage.trim()}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </section>
  )
}

export default ConversationDetail