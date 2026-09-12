import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/test-utils';
import ConversationDetail from '@/pages/ConversationDetail/ConversationDetail';
import { mockMessages } from '@/test/mocks/mockData';

const convApi = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('@/api', () => ({
  conversationApi: {
    list: convApi.list,
    get: convApi.get,
    create: convApi.create,
    delete: convApi.delete,
    getMessages: convApi.getMessages,
    sendMessage: convApi.sendMessage,
  },
  courseApi: { get: vi.fn(), list: vi.fn(), getDocuments: vi.fn() },
}));

describe('ConversationDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    convApi.get.mockResolvedValue({ data: { id: 1, title: 'Test', course_id: null } });
    convApi.getMessages.mockResolvedValue({ data: mockMessages });
    convApi.sendMessage.mockResolvedValue({
      data: { id: 3, user_message_id: 4, role: 'assistant', content: 'Mock assistant answer', evidence: [] },
    });
  });

  it('should render messages on load', async () => {
    renderWithProviders(<ConversationDetail />);

    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(mockMessages[0].content)).toBeInTheDocument();
      expect(screen.getByText(mockMessages[1].content)).toBeInTheDocument();
    });

    expect(screen.getByText('Nguồn trích dẫn')).toBeInTheDocument();
    expect(screen.getByText(/Lecture 1.pdf/)).toBeInTheDocument();
  });

  it('should send a new message and display it', async () => {
    renderWithProviders(<ConversationDetail />);

    const input = await screen.findByPlaceholderText(/Hỏi về tài liệu học tập/i);
    await userEvent.type(input, 'New question{enter}');

    await waitFor(() => {
      expect(convApi.sendMessage).toHaveBeenCalledWith(expect.any(Number), 'New question');
    });

    await waitFor(() => {
      expect(screen.getByText('New question')).toBeInTheDocument();
      expect(screen.getByText('Mock assistant answer')).toBeInTheDocument();
    });
  });

  it('should show error toast if sending message fails', async () => {
    convApi.sendMessage.mockRejectedValueOnce({ response: { data: { error: 'Backend error' } } });

    renderWithProviders(<ConversationDetail />);
    const input = await screen.findByPlaceholderText(/Hỏi về tài liệu học tập/i);
    await userEvent.type(input, 'Crash me{enter}');

    await waitFor(() => {
      expect(screen.getByText('Backend error')).toBeInTheDocument();
    });
  });
});