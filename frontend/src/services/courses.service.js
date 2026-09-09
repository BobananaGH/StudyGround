import { API_ENDPOINTS } from './api/endpoints.js'
import { get, post } from './api/client.js'

export async function getCourses() {
  return get(API_ENDPOINTS.COURSES)
}

export async function getCourse(courseId) {
  return get(`${API_ENDPOINTS.COURSES}${courseId}/`)
}

export async function createCourse(data) {
  return post(API_ENDPOINTS.COURSES, data)
}

export const coursesService = {
  getCourses,
  getCourse,
  createCourse,
}

export default coursesService