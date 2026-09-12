/**
 * Course, Document, Conversation types matching backend contract
 */

export interface Course {
  id: number;
  name: string;
  code: string;
  description: string;
  aliases: string[];
}

export interface CreateCourseRequest {
  name: string;
  code?: string;
  description?: string;
}

export interface CourseDocument {
  id: number;
  title: string;
  file_type: string;
}

export interface UploadDocumentRequest {
  file: File;
  course_id: number;
  title?: string;
}

export interface UploadDocumentResponse {
  id: number;
  title: string;
  course_id: number;
  chunks_created: number;
}

export interface Conversation {
  id: number;
  title: string;
  course_id: number | null;
  created_at: string;
}

export interface CreateConversationRequest {
  title?: string;
  course_id?: number;
}

export interface Evidence {
  chunk_id: string;
  document: string;
  page: number | null;
}

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  evidence: Evidence[];
}

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  id: number;
  user_message_id: number;
  role: string;
  content: string;
  evidence: Evidence[];
}