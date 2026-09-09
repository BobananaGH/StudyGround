import { API_ENDPOINTS } from './api/endpoints.js'
import { get, post, request } from './api/client.js'
import { ApiError } from './api/client.js'

const ALLOWED_FILE_TYPES = ['.pdf', '.docx']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export function validateDocument(file) {
  const errors = []

  if (!file) {
    errors.push('No file selected.')
    return errors
  }

  const fileName = file.name.toLowerCase()
  const isAllowed = ALLOWED_FILE_TYPES.some((ext) => fileName.endsWith(ext))

  if (!isAllowed) {
    errors.push('Unsupported file type. Use PDF or DOCX.')
  }

  if (file.size === 0) {
    errors.push('File is empty.')
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`)
  }

  return errors
}

export async function getDocuments(courseId) {
  return get(`${API_ENDPOINTS.COURSES}${courseId}/documents/`)
}

export async function uploadDocument(courseId, file, title = null) {
  const validationErrors = validateDocument(file)

  if (validationErrors.length > 0) {
    const error = new Error(validationErrors.join(' '))
    error.name = 'ValidationError'
    error.fieldErrors = validationErrors
    throw error
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('course_id', courseId)

  if (title) {
    formData.append('title', title)
  }

  // Use custom request to handle multipart/form-data without Content-Type header
  return request('documents/', {
    method: 'POST',
    body: formData,
  })
}

export async function deleteDocument(documentId) {
  // TODO: Backend does not currently support document deletion endpoint
  // Endpoint: DELETE /api/documents/<documentId>/
  return request(`documents/${documentId}/`, {
    method: 'DELETE',
  })
}

export async function getDocumentChunks(documentId) {
  // TODO: Backend does not currently have a chunks API endpoint
  // Would need: GET /api/documents/<documentId>/chunks/
  throw new Error('Document chunks API not yet implemented on backend')
}

export const documentsService = {
  getDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentChunks,
  validateDocument,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
}

export default documentsService