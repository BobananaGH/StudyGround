import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button/Button.jsx'
import { Spinner } from '../../components/ui/Spinner/Spinner.jsx'
import { coursesService } from '../../services/courses.service.js'
import { documentsService } from '../../services/documents.service.js'
import { createConversation } from '../../services/conversations.service.js'
import { ApiError } from '../../services/api/client.js'
import styles from './CourseDetail.module.css'

const DOCUMENT_STATUSES = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileExtension(fileName) {
  if (!fileName) return ''
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop().toUpperCase() : ''
}

function DocumentIcon({ extension }) {
  const icon = extension === 'PDF' ? '📄' : extension === 'DOCX' ? '📝' : '📄'
  return <span className={styles.documentIcon} aria-hidden="true">{icon}</span>
}

function StatusBadge({ status }) {
  let className = styles.status

  if (status === DOCUMENT_STATUSES.PROCESSING) {
    className += ` ${styles.statusProcessing}`
  } else if (status === DOCUMENT_STATUSES.COMPLETED) {
    className += ` ${styles.statusCompleted}`
  } else if (status === DOCUMENT_STATUSES.FAILED) {
    className += ` ${styles.statusFailed}`
  } else {
    className += ` ${styles.statusCompleted}`
  }

  const label = status === DOCUMENT_STATUSES.PROCESSING ? 'Processing'
    : status === DOCUMENT_STATUSES.FAILED ? 'Failed'
    : 'Ready'

  return (
    <span className={className} role="status">
      {label}
   </span>
  )
}

export function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [error, setError] = useState('')
  const [uploadFile, setUploadFile] = useState(null)

  const fetchCourseAndDocuments = useCallback(async () => {
    if (!courseId) return

    setIsLoading(true)
    setError('')

    try {
      const [courseData, docsData] = await Promise.all([
        coursesService.getCourse(courseId),
        documentsService.getDocuments(courseId),
      ])

      setCourse(courseData)
      setDocuments(docsData)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Course not found.')
      } else if (err instanceof ApiError) {
        setError(err.message || 'Failed to load course.')
      } else {
        setError('Cannot connect to server. Check your connection.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchCourseAndDocuments()
  }, [fetchCourseAndDocuments])

  const handleUploadClick = () => {
    document.getElementById('document-upload-input')?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (!file) return
    setUploadFile(file)
    setError('')
  }

  const handleUpload = async () => {
    if (!uploadFile) return

    const errors = documentsService.validateDocument(uploadFile)
    if (errors.length > 0) {
      setError(errors.join(' '))
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError('')

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev))
    }, 200)

    try {
      await documentsService.uploadDocument(
        courseId,
        uploadFile,
        uploadFile.name
      )

      setUploadProgress(100)
      await fetchCourseAndDocuments()
      setUploadFile(null)

      const input = document.getElementById('document-upload-input')
      if (input) input.value = ''
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Upload failed. Please try again.')
      } else {
        setError('Upload failed. Please try again.')
      }
    } finally {
      clearInterval(progressInterval)
      setUploadProgress(null)
      setIsUploading(false)
    }
  }

  const handleCreateConversation = async () => {
    try {
      const response = await createConversation({ course_id: courseId })
      navigate(`/conversations/${response.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to create conversation.')
      } else {
        setError('Failed to create conversation. Please try again.')
      }
    }
  }

  if (isLoading) {
    return (
      <section className={styles.courseDetail}>
        <div className={styles.loading}>
          <Spinner label="Loading course" />
          <p>Loading course</p>
       </div>
     </section>
    )
  }

  if (error && !course) {
    return (
      <section className={styles.courseDetail}>
        <div className={styles.error}>
          <h2 className={styles.errorTitle}>Something went wrong</h2>
          <p className={styles.errorMessage}>{error}</p>
          <Button
            variant="primary"
            onClick={fetchCourseAndDocuments}
            style={{ margin: 'var(--space-4) auto 0' }}
          >
            Retry
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.courseDetail}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Course</p>
          <h1 className={styles.title}>
            {course?.name || 'Course'}
            {course?.code ? <span className={styles.code}>{course.code}</span> : null}
         </h1>
          {course?.description ? (
            <p className={styles.description}>{course.description}</p>
          ) : null}
          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <span aria-hidden="true">📄</span>
              {documents.length} document{documents.length !== 1 ? 's' : ''}
           </span>
         </div>
       </div>

        <div className={styles.headerActions}>
          <Button
            variant="primary"
            onClick={handleCreateConversation}
            disabled={!documents.length}
            title={!documents.length ? 'Upload documents first' : 'Start a new conversation'}
          >
            New Conversation
         </Button>
          <Button
            variant="secondary"
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            Upload Document
         </Button>
          <input
            id="document-upload-input"
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            disabled={isUploading}
            style={{ display: 'none' }}
          />
       </div>
     </header>

      {uploadFile && !isUploading ? (
        <div className={styles.progress}>
          <div className={styles.progressHeader}>
            <span>Ready to upload: <strong>{uploadFile.name}</strong> ({formatFileSize(uploadFile.size)})</span>
            <div className={styles.progressActions}>
              <Button variant="ghost" size="sm" onClick={() => setUploadFile(null)}>
                Cancel
             </Button>
              <Button variant="primary" size="sm" onClick={handleUpload}>
                Upload
             </Button>
           </div>
         </div>
       </div>
      ) : null}

      {isUploading && uploadProgress !== null ? (
        <div className={styles.progress}>
          <div className={styles.progressHeader}>
            <span>Uploading {uploadFile?.name}... {uploadProgress}%</span>
            <Spinner size="sm" />
         </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
         </div>
       </div>
      ) : null}

      {error && course ? (
        <div className={styles.error}>
          <h3 className={styles.errorTitle}>Error</h3>
          <p className={styles.errorMessage}>{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError('')}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <section className={styles.section} aria-labelledby="documents-heading">
        <div className={styles.sectionHeader}>
          <h2 id="documents-heading" className={styles.sectionTitle}>
            Documents
         </h2>
       </div>

        {documents.length > 0 ? (
          <div className={styles.documentList}>
            {documents.map((doc) => (
              <article key={doc.id} className={styles.documentCard}>
                <div className={styles.documentInfo}>
                  <DocumentIcon extension={getFileExtension(doc.title || doc.file_name || 'file')} />
                  <div className={styles.documentDetails}>
                    <h3 className={styles.documentName}>
                      {doc.title || doc.file_name || 'Untitled'}
                   </h3>
                    <div className={styles.documentMeta}>
                      <span className={styles.documentType}>
                        {getFileExtension(doc.title || doc.file_name || 'file')}
                     </span>
                      <span>{doc.chunks_created ?? '?'} chunks</span>
                   </div>
                 </div>
               </div>

                <div className={styles.documentActions}>
                  <StatusBadge status={doc.status || DOCUMENT_STATUSES.COMPLETED} />
               </div>
             </article>
            ))}
         </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">📄</span>
            <h3 className={styles.emptyTitle}>No documents yet</h3>
            <p className={styles.emptyHint}>
              Upload your first document to start learning from this course.
           </p>
            <Button variant="primary" onClick={handleUploadClick} disabled={isUploading}>
              Upload First Document
           </Button>
         </div>
        )}
     </section>
   </section>
  )
}

export default CourseDetail