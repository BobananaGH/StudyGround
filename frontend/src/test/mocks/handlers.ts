import { vi } from 'vitest';
import { mockConversations, mockCourses, mockDocuments, mockMessages, mockTokens, mockUser } from './mockData';

export const mockAuthApi = {
  login: vi.fn().mockResolvedValue({ data: { user: mockUser, tokens: mockTokens } }),
  register: vi.fn().mockResolvedValue({ data: { user: mockUser, tokens: mockTokens } }),
  me: vi.fn().mockResolvedValue({ data: mockUser }),
};

export const mockCourseApi = {
  list: vi.fn().mockResolvedValue({ data: mockCourses }),
  get: vi.fn().mockResolvedValue({ data: mockCourses[0] }),
  create: vi.fn().mockResolvedValue({ data: mockCourses[0] }),
  delete: vi.fn().mockResolvedValue({ data: undefined }),
  getDocuments: vi.fn().mockResolvedValue({ data: mockDocuments }),
  uploadDocument: vi.fn().mockResolvedValue({ data: { id: 3, title: 'Upload.pdf', course_id: 1, chunks_created: 2 } }),
  deleteDocument: vi.fn().mockResolvedValue({ data: undefined }),
};

export const mockConversationApi = {
  list: vi.fn().mockResolvedValue({ data: mockConversations }),
  get: vi.fn().mockResolvedValue({ data: mockConversations[0] }),
  create: vi.fn().mockResolvedValue({ data: mockConversations[0] }),
  delete: vi.fn().mockResolvedValue({ data: undefined }),
  getMessages: vi.fn().mockResolvedValue({ data: mockMessages }),
  sendMessage: vi.fn().mockResolvedValue({
    data: {
      id: 3,
      user_message_id: 4,
      role: 'assistant',
      content: 'Mock assistant answer',
      evidence: [],
    },
  }),
};

export function resetApiMocks() {
  Object.values(mockAuthApi).forEach((mock) => mock.mockClear());
  Object.values(mockCourseApi).forEach((mock) => mock.mockClear());
  Object.values(mockConversationApi).forEach((mock) => mock.mockClear());
}