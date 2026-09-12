import type { User } from '@/types/auth';
import type { Course, CourseDocument, Conversation, Message } from '@/types/course';

export const mockUser: User = {
  id: 1,
  username: 'student1',
  email: 'student@example.com',
  first_name: 'Study',
  last_name: 'User',
  role: 'student',
};

export const mockTokens = {
  access: 'mock-access-token',
  refresh: 'mock-refresh-token',
};

export const mockCourses: Course[] = [
  {
    id: 1,
    name: 'Artificial Intelligence',
    code: 'AI101',
    description: 'Introductory AI course',
    aliases: ['AI'],
  },
  {
    id: 2,
    name: 'Machine Learning',
    code: 'ML201',
    description: 'Machine learning fundamentals',
    aliases: ['ML'],
  },
];

export const mockDocuments: CourseDocument[] = [
  {
    id: 1,
    title: 'Lecture 1.pdf',
    file_type: 'pdf',
  },
  {
    id: 2,
    title: 'Chapter 2.docx',
    file_type: 'docx',
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 1,
    title: 'AI Study Session',
    course_id: 1,
    created_at: '2026-09-10T08:00:00Z',
  },
  {
    id: 2,
    title: 'General Review',
    course_id: null,
    created_at: '2026-09-09T08:00:00Z',
  },
];

export const mockMessages: Message[] = [
  {
    id: 1,
    role: 'user',
    content: 'What is artificial intelligence?',
    evidence: [],
  },
  {
    id: 2,
    role: 'assistant',
    content: 'Artificial intelligence is a field of computer science.',
    evidence: [
      {
        chunk_id: 'chunk-1',
        document: 'Lecture 1.pdf',
        page: 3,
      },
    ],
  },
];