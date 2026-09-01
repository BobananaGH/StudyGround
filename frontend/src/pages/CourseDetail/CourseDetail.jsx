// frontend/src/pages/CourseDetail/CourseDetail.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { del, get, post } from "../../services/api/client.js";
import { API_ENDPOINTS } from "../../services/api/endpoints.js";

import { APP_EVENTS, emitAppEvent } from "../../services/appEvents.js";

import Button from "../../components/ui/Button/Button.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog/ConfirmDialog.jsx";

import styles from "./CourseDetail.module.css";

export function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  const [deletingCourse, setDeletingCourse] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [documentTitle, setDocumentTitle] = useState("");

  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");

  const [showDeleteCourseConfirm, setShowDeleteCourseConfirm] = useState(false);

  const [showDeleteDocumentConfirm, setShowDeleteDocumentConfirm] =
    useState(false);

  const [documentToDelete, setDocumentToDelete] = useState(null);

  // =========================
  // LOAD COURSE
  // =========================

  async function loadCourse() {
    try {
      setLoading(true);
      setError("");

      const [courseData, documentsData] = await Promise.all([
        get(`${API_ENDPOINTS.COURSES}${courseId}/`),
        get(`${API_ENDPOINTS.COURSES}${courseId}/documents/`),
      ]);

      setCourse(courseData);
      setDocuments(documentsData);
    } catch (error) {
      console.error("Failed to load course:", error);
      setError(error.message || "Unable to load course.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshDocuments() {
    try {
      const documentsData = await get(
        `${API_ENDPOINTS.COURSES}${courseId}/documents/`,
      );

      setDocuments(documentsData);
    } catch (error) {
      console.error("Failed to refresh documents:", error);
      setUploadError(error.message || "Unable to refresh documents.");
    }
  }

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  // =========================
  // FILE SELECTION
  // =========================

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;

    setUploadError("");

    if (!file) {
      setSelectedFile(null);
      setDocumentTitle("");
      return;
    }

    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith(".pdf") && !fileName.endsWith(".docx")) {
      setSelectedFile(null);
      setDocumentTitle("");

      setUploadError("Unsupported file type. Please select a PDF or DOCX.");

      event.target.value = "";
      return;
    }

    setSelectedFile(file);

    const filename = file.name.replace(/\.(pdf|docx)$/i, "");

    setDocumentTitle(filename);
  }

  // =========================
  // UPLOAD DOCUMENT
  // =========================

  async function handleUpload(event) {
    event.preventDefault();

    if (!selectedFile) {
      setUploadError("Please select a PDF or DOCX file.");
      return;
    }

    try {
      setUploading(true);
      setUploadError("");

      const formData = new FormData();

      formData.append("file", selectedFile);
      formData.append("course_id", courseId);
      formData.append("title", documentTitle.trim() || selectedFile.name);

      await post(API_ENDPOINTS.DOCUMENTS, formData);

      setSelectedFile(null);
      setDocumentTitle("");

      const fileInput = document.getElementById("document-file");

      if (fileInput) {
        fileInput.value = "";
      }

      await refreshDocuments();
    } catch (error) {
      console.error("Failed to upload document:", error);

      setUploadError(error.message || "Unable to upload document.");
    } finally {
      setUploading(false);
    }
  }

  // =========================
  // DELETE COURSE
  // =========================

  async function handleDeleteCourse() {
    if (deletingCourse) {
      return;
    }

    try {
      setDeletingCourse(true);
      setError("");

      await del(`${API_ENDPOINTS.COURSES}${courseId}/`);

      // Notify the rest of the application that the course and
      // its related conversations changed.
      emitAppEvent(APP_EVENTS.COURSES_CHANGED);
      emitAppEvent(APP_EVENTS.CONVERSATIONS_CHANGED);

      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to delete course:", error);

      setError(error.message || "Unable to delete course.");

      setDeletingCourse(false);
      setShowDeleteCourseConfirm(false);
    }
  }

  function handleDeleteDocumentClick(document) {
    setDocumentToDelete(document);
    setShowDeleteDocumentConfirm(true);
  }

  function handleCancelDeleteDocument() {
    if (deletingDocument) {
      return;
    }

    setShowDeleteDocumentConfirm(false);
    setDocumentToDelete(null);
  }

  async function handleDeleteDocument() {
    if (deletingDocument || !documentToDelete) {
      return;
    }

    try {
      setDeletingDocument(true);
      setUploadError("");

      await del(`${API_ENDPOINTS.DOCUMENTS}${documentToDelete.id}/`);

      setShowDeleteDocumentConfirm(false);
      setDocumentToDelete(null);

      await refreshDocuments();
    } catch (error) {
      console.error("Failed to delete document:", error);

      setUploadError(error.message || "Unable to delete document.");
    } finally {
      setDeletingDocument(false);
    }
  }

  function handleCancelDeleteCourse() {
    if (deletingCourse) {
      return;
    }

    setShowDeleteCourseConfirm(false);
  }

  // =========================
  // START CONVERSATION
  // =========================

  async function handleStartConversation() {
    try {
      setCreatingConversation(true);
      setUploadError("");

      const conversations = await get(API_ENDPOINTS.CONVERSATIONS);

      const courseConversations = (conversations || [])
        .filter(
          (conversation) => Number(conversation.course_id) === Number(courseId),
        )
        .sort((a, b) => {
          const dateA = new Date(a.updated_at || a.updatedAt || 0).getTime();

          const dateB = new Date(b.updated_at || b.updatedAt || 0).getTime();

          return dateB - dateA;
        });

      // Reuse the most recently updated conversation for this course.
      if (courseConversations.length > 0) {
        navigate(`/conversations/${courseConversations[0].id}`);

        return;
      }

      // No existing conversation for this course -> create the first one.
      const conversation = await post(API_ENDPOINTS.CONVERSATIONS, {
        title: course?.name ? `${course.name} Study Session` : "Study Session",
        course_id: Number(courseId),
      });

      // Notify the rest of the application that a new conversation was created.
      emitAppEvent(APP_EVENTS.CONVERSATIONS_CHANGED);

      navigate(`/conversations/${conversation.id}`);
    } catch (error) {
      console.error("Failed to start conversation:", error);

      setUploadError(error.message || "Unable to start conversation.");
    } finally {
      setCreatingConversation(false);
    }
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <section className={styles.courseDetail}>
        <div className={styles.loadingState}>
          <p>Loading course...</p>
        </div>
      </section>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error) {
    return (
      <section className={styles.courseDetail}>
        <div className={styles.errorState}>
          <p className={styles.error}>
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />

            <span>{error}</span>
          </p>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            <i className="fa-solid fa-house" aria-hidden="true" />
          </Button>
        </div>
      </section>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <section className={styles.courseDetail}>
      {/* =========================
          COURSE HEADER
          ========================= */}

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>{course.code || "Course"}</p>

          <h1 className={styles.title}>{course.name}</h1>

          {course.description && (
            <p className={styles.subtitle}>{course.description}</p>
          )}
        </div>

        <div className={styles.headerActions}>
          {/* DELETE COURSE */}

          <button
            type="button"
            className={styles.deleteCourse}
            onClick={() => setShowDeleteCourseConfirm(true)}
            disabled={
              deletingCourse ||
              deletingDocument ||
              uploading ||
              creatingConversation
            }
            aria-label="Delete course"
            title="Delete course"
          >
            <i className="fa-solid fa-trash" aria-hidden="true" />
          </button>

          {/* BACK TO DASHBOARD */}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate("/dashboard")}
            disabled={
              deletingCourse ||
              deletingDocument ||
              uploading ||
              creatingConversation
            }
          >
            <i className="fa-solid fa-house" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* =========================
          DELETE COURSE CONFIRMATION
          ========================= */}

      <ConfirmDialog
        open={showDeleteCourseConfirm}
        title="Delete this course?"
        description="This will permanently delete the course, all of its study materials, document chunks, and course conversations."
        confirmLabel="Delete course"
        cancelLabel="Cancel"
        onConfirm={handleDeleteCourse}
        onCancel={handleCancelDeleteCourse}
        loading={deletingCourse}
        icon="fa-trash"
      />

      {/* =========================
          DELETE DOCUMENT CONFIRMATION
          ========================= */}

      <ConfirmDialog
        open={showDeleteDocumentConfirm}
        title="Delete this study material?"
        description={
          documentToDelete
            ? `"${documentToDelete.title}" and all of its processed study data will be permanently deleted.`
            : "This study material and all of its processed study data will be permanently deleted."
        }
        confirmLabel="Delete material"
        cancelLabel="Cancel"
        onConfirm={handleDeleteDocument}
        onCancel={handleCancelDeleteDocument}
        loading={deletingDocument}
        icon="fa-trash"
      />

      {/* =========================
          STUDY MATERIALS
          ========================= */}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionInfo}>
            <h2 className={styles.sectionTitle}>Study Materials</h2>

            <span className={styles.documentCount}>
              {documents.length}{" "}
              {documents.length === 1 ? "document" : "documents"}
            </span>
          </div>

          {documents.length > 0 && (
            <div className={styles.startButton}>
              <Button
                type="button"
                variant="primary"
                size="md"
                loading={creatingConversation}
                onClick={handleStartConversation}
                disabled={deletingCourse || deletingDocument || uploading}
              >
                <i className="fa-solid fa-book-open" aria-hidden="true" />

                <span>Start Studying</span>
              </Button>
            </div>
          )}
        </div>

        {documents.length > 0 ? (
          <div className={styles.documentList}>
            {documents.map((document) => (
              <article key={document.id} className={styles.documentCard}>
                <div className={styles.documentIcon} aria-hidden="true">
                  <i className="fa-solid fa-file-lines" />
                </div>

                <div className={styles.documentContent}>
                  <h3 className={styles.documentTitle}>{document.title}</h3>

                  <p className={styles.documentMeta}>
                    {document.file_type || "Document"}
                  </p>
                </div>

                {/* DELETE DOCUMENT */}

                <button
                  type="button"
                  className={styles.deleteDocument}
                  onClick={() => handleDeleteDocumentClick(document)}
                  disabled={
                    deletingCourse ||
                    deletingDocument ||
                    uploading ||
                    creatingConversation
                  }
                  aria-label={`Delete ${document.title}`}
                  title="Delete document"
                >
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <i className="fa-solid fa-file-arrow-up" />
            </div>

            <h3>No study materials yet</h3>

            <p className={styles.emptyHint}>
              Upload a PDF or DOCX to start studying with this course.
            </p>
          </div>
        )}
      </section>

      {/* =========================
          ADD STUDY MATERIAL
          ========================= */}

      <section className={styles.section}>
        <div className={styles.uploadHeader}>
          <h2 className={styles.sectionTitle}>Add Study Material</h2>

          <p className={styles.uploadSubtitle}>
            Upload a PDF or DOCX and StudyGround will process it for your study
            sessions.
          </p>
        </div>

        <form className={styles.uploadForm} onSubmit={handleUpload}>
          {/* =========================
              FILE PICKER
              ========================= */}

          <div className={styles.formGroup}>
            <label htmlFor="document-file">Study Material</label>

            <label
              className={`${styles.filePicker} ${
                selectedFile ? styles.filePickerSelected : ""
              }`}
              htmlFor="document-file"
            >
              <div className={styles.filePickerIcon} aria-hidden="true">
                <i
                  className={
                    selectedFile
                      ? "fa-solid fa-file-lines"
                      : "fa-solid fa-cloud-arrow-up"
                  }
                />
              </div>

              <div className={styles.filePickerContent}>
                <span className={styles.filePickerTitle}>
                  {selectedFile ? selectedFile.name : "Choose a file"}
                </span>

                <span className={styles.filePickerHint}>
                  {selectedFile
                    ? "Click to choose a different file"
                    : "PDF or DOCX · Click to browse"}
                </span>
              </div>

              <input
                id="document-file"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                disabled={uploading || deletingCourse || deletingDocument}
              />
            </label>

            <span className={styles.inputHint}>
              Accepted formats: PDF and DOCX
            </span>
          </div>

          {/* =========================
              DOCUMENT TITLE
              ========================= */}

          <div className={styles.formGroup}>
            <label htmlFor="document-title">Document Title</label>

            <input
              id="document-title"
              type="text"
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
              placeholder="e.g. Chapter 1 - Introduction"
              disabled={uploading || deletingCourse || deletingDocument}
            />
          </div>

          {/* =========================
              UPLOAD ERROR
              ========================= */}

          {uploadError && (
            <p className={styles.error} role="alert">
              <i
                className="fa-solid fa-circle-exclamation"
                aria-hidden="true"
              />

              <span>{uploadError}</span>
            </p>
          )}

          {/* =========================
              ACTIONS
              ========================= */}

          <div className={styles.uploadActions}>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={uploading}
              disabled={
                !selectedFile || uploading || deletingCourse || deletingDocument
              }
            >
              <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />

              <span>Upload Material</span>
            </Button>
          </div>
        </form>
      </section>
    </section>
  );
}

export default CourseDetail;
