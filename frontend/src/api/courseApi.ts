import axiosClient from './axiosClient';
import type {
  Course,
  CreateCourseRequest,
  CourseDocument,
  UploadDocumentResponse,
} from '@/types/course';

export const courseApi = {
  list() {
    return axiosClient.get<Course[]>('courses/');
  },

  get(courseId: number) {
    return axiosClient.get<Course>(`courses/${courseId}/`);
  },

  create(data: CreateCourseRequest) {
    return axiosClient.post<Course>('courses/', data);
  },

  delete(courseId: number) {
    return axiosClient.delete(`courses/${courseId}/`);
  },

  getDocuments(courseId: number) {
    return axiosClient.get<CourseDocument[]>(`courses/${courseId}/documents/`);
  },

  uploadDocument(file: File, courseId: number, title?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', String(courseId));
    if (title) {
      formData.append('title', title);
    }
    return axiosClient.post<UploadDocumentResponse>('documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteDocument(documentId: number) {
    return axiosClient.delete(`documents/${documentId}/`);
  },
};