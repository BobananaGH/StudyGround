// frontend/src/pages/CourseDetail/CourseDetail.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { get, post } from "../../services/api/client.js";
import { API_ENDPOINTS } from "../../services/api/endpoints.js";
import Button from "../../components/ui/Button/Button.jsx";

import styles from "./CourseDetail.module.css";

export function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [documentTitle, setDocumentTitle] = useState("");

  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");

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

    // Always update the document title
    // to match the newly selected file.
    const filename = file.name.replace(/\.(pdf|docx)$/i, "");
    setDocumentTitle(filename);
  }

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

      navigate(`/conversations/${conversation.id}`);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setUploadError(error.message || "Unable to start conversation.");
    } finally {
      setCreatingConversation(false);
    }
  }

  if (loading) {
    return (
      <section className={styles.courseDetail}>
        <div className={styles.loadingState}>
          <p>Loading course...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.courseDetail}>
        <div className={styles.errorState}>
          <p className={styles.error}>
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            <span>{error}</span>
          </p>

          <Link to="/dashboard" className={styles.backLink}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>
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

        <Link to="/dashboard" className={styles.backLink}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          <span>Back to Dashboard</span>
        </Link>
      </header>

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
                disabled={uploading}
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
              disabled={uploading}
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
              disabled={!selectedFile}
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
