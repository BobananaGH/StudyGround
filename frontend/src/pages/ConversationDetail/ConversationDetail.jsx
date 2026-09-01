// frontend/src/pages/ConversationDetail/ConversationDetail.jsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { del, get, post } from "../../services/api/client.js";
import { API_ENDPOINTS } from "../../services/api/endpoints.js";

import { APP_EVENTS, emitAppEvent } from "../../services/appEvents.js";

import Button from "../../components/ui/Button/Button.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog/ConfirmDialog.jsx";
import styles from "./ConversationDetail.module.css";

export function ConversationDetail() {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // =========================
  // LOAD CONVERSATION
  // =========================

  async function loadConversation() {
    try {
      setLoading(true);
      setError("");

      const [conversationData, messagesData] = await Promise.all([
        get(`${API_ENDPOINTS.CONVERSATIONS}${conversationId}/`),
        get(`${API_ENDPOINTS.CONVERSATIONS}${conversationId}/messages/`),
      ]);

      setConversation(conversationData);
      setMessages(messagesData);
    } catch (error) {
      console.error("Failed to load conversation:", error);
      setError(error.message || "Unable to load conversation.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  // =========================
  // SEND MESSAGE
  // =========================

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || sending || deleting) {
      return;
    }

    try {
      setSending(true);
      setError("");

      const response = await post(
        `${API_ENDPOINTS.CONVERSATIONS}${conversationId}/messages/`,
        {
          content: trimmedMessage,
        },
      );

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: response.user_message_id || `user-${Date.now()}`,
          role: "user",
          content: trimmedMessage,
        },
        {
          id: response.id,
          role: response.role,
          content: response.content,
          evidence: response.evidence || [],
        },
      ]);

      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      setError(error.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  // =========================
  // DELETE CONVERSATION
  // =========================

  async function handleDelete() {
    if (deleting) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      await del(`${API_ENDPOINTS.CONVERSATIONS}${conversationId}/`);

      emitAppEvent(APP_EVENTS.CONVERSATIONS_CHANGED);

      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to delete conversation:", error);

      setError(error.message || "Unable to delete conversation.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  // =========================
  // NAVIGATION
  // =========================

  function handleBackToDashboard() {
    if (deleting || sending) {
      return;
    }

    navigate("/dashboard");
  }

  // =========================
  // SUGGESTIONS
  // =========================

  function handleSuggestion(text) {
    setMessage(text);
  }

  // =========================
  // KEYBOARD
  // =========================

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <section className={styles.conversationDetail}>
        <div className={styles.loadingState}>
          <p>Loading conversation...</p>
        </div>
      </section>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error && !conversation) {
    return (
      <section className={styles.conversationDetail}>
        <div className={styles.errorState}>
          <p className={styles.error}>
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            <span>{error}</span>
          </p>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleBackToDashboard}
          >
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.conversationDetail}>
      {/* =========================
          HEADER
          ========================= */}

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Study Session</p>

          <h1 className={styles.title}>
            {conversation?.title || "Study Session"}
          </h1>

          <p className={styles.subtitle}>
            Ask questions about the study materials uploaded to this course.
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* =========================
              DELETE BUTTON
              ========================= */}

          <button
            type="button"
            className={styles.deleteConversation}
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting || sending}
            aria-label="Delete conversation"
            title="Delete conversation"
          >
            <i className="fa-solid fa-trash" aria-hidden="true" />
          </button>

          {/* =========================
              BACK TO DASHBOARD
              ========================= */}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleBackToDashboard}
            disabled={deleting || sending}
          >
            <i className="fa-solid fa-house" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* =========================
          DELETE CONFIRMATION
          ========================= */}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this study session?"
        description="This will permanently delete the conversation and all of its messages."
        confirmLabel="Delete session"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleting}
        icon="fa-trash"
      />

      {/* =========================
          CHAT
          ========================= */}

      <div className={styles.chat}>
        {/* =========================
            MESSAGE AREA
            ========================= */}

        <div className={styles.messageArea}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon} aria-hidden="true">
                <i className="fa-solid fa-comments" />
              </div>

              <h2>Start studying</h2>

              <p>
                Ask a question about your course materials and StudyGround will
                help you find the answer.
              </p>

              {/* =========================
                  SUGGESTIONS
                  ========================= */}

              <div className={styles.suggestions}>
                <button
                  type="button"
                  className={styles.suggestion}
                  onClick={() =>
                    handleSuggestion("Can you summarize the main topics?")
                  }
                  disabled={sending || deleting}
                >
                  <i className="fa-solid fa-list" aria-hidden="true" />
                  <span>Summarize the main topics</span>
                </button>

                <button
                  type="button"
                  className={styles.suggestion}
                  onClick={() =>
                    handleSuggestion("Explain the most important concept.")
                  }
                  disabled={sending || deleting}
                >
                  <i className="fa-solid fa-lightbulb" aria-hidden="true" />
                  <span>Explain an important concept</span>
                </button>

                <button
                  type="button"
                  className={styles.suggestion}
                  onClick={() =>
                    handleSuggestion("What should I focus on for an exam?")
                  }
                  disabled={sending || deleting}
                >
                  <i
                    className="fa-solid fa-graduation-cap"
                    aria-hidden="true"
                  />
                  <span>Help me prepare for an exam</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.messageList}>
              {messages.map((item) => (
                <article
                  key={item.id}
                  className={`${styles.message} ${
                    item.role === "user"
                      ? styles.userMessage
                      : styles.assistantMessage
                  }`}
                >
                  {/* =========================
                      MESSAGE ICON
                      ========================= */}

                  <div className={styles.messageIcon} aria-hidden="true">
                    <i
                      className={
                        item.role === "user"
                          ? "fa-solid fa-user"
                          : "fa-solid fa-sparkles"
                      }
                    />
                  </div>

                  {/* =========================
                      MESSAGE CONTENT
                      ========================= */}

                  <div className={styles.messageContent}>
                    <span className={styles.messageRole}>
                      {item.role === "user" ? "You" : "StudyGround"}
                    </span>

                    <p>{item.content}</p>

                    {/* =========================
                        EVIDENCE
                        ========================= */}

                    {item.role === "assistant" && item.evidence?.length > 0 && (
                      <div className={styles.evidence}>
                        <span className={styles.evidenceTitle}>Sources</span>

                        {item.evidence.map((source, index) => (
                          <div
                            key={`${source.chunk_id}-${index}`}
                            className={styles.evidenceItem}
                          >
                            <i
                              className="fa-solid fa-file-lines"
                              aria-hidden="true"
                            />

                            <span>
                              {source.document}
                              {source.page ? ` · Page ${source.page}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {/* =========================
                  THINKING / LOADING
                  ========================= */}

              {sending && (
                <article
                  className={`${styles.message} ${styles.assistantMessage}`}
                >
                  <div className={styles.messageIcon} aria-hidden="true">
                    <i className="fa-solid fa-sparkles" />
                  </div>

                  <div className={styles.messageContent}>
                    <span className={styles.messageRole}>StudyGround</span>

                    <div className={styles.typingIndicator}>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </article>
              )}
            </div>
          )}
        </div>

        {/* =========================
            COMPOSER
            ========================= */}

        <div className={styles.composerWrapper}>
          {error && (
            <p className={styles.error} role="alert">
              <i
                className="fa-solid fa-circle-exclamation"
                aria-hidden="true"
              />
              <span>{error}</span>
            </p>
          )}

          <form className={styles.composer} onSubmit={handleSubmit}>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your study materials..."
              rows={1}
              disabled={sending || deleting}
              aria-label="Message"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={sending}
              disabled={!message.trim() || sending || deleting}
            >
              {!sending && (
                <i className="fa-solid fa-paper-plane" aria-hidden="true" />
              )}
            </Button>
          </form>

          <p className={styles.composerHint}>
            Press Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </div>
    </section>
  );
}

export default ConversationDetail;
