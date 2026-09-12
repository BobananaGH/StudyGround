import axiosClient from './axiosClient';
import type {
  Conversation,
  CreateConversationRequest,
  Message,
  SendMessageResponse,
} from '@/types/course';

export const conversationApi = {
  list() {
    return axiosClient.get<Conversation[]>('conversations/');
  },

  get(conversationId: number) {
    return axiosClient.get<Conversation>(`conversations/${conversationId}/`);
  },

  create(data: CreateConversationRequest) {
    return axiosClient.post<Conversation>('conversations/', data);
  },

  delete(conversationId: number) {
    return axiosClient.delete(`conversations/${conversationId}/`);
  },

  getMessages(conversationId: number) {
    return axiosClient.get<Message[]>(`conversations/${conversationId}/messages/`);
  },

  sendMessage(conversationId: number, content: string) {
    return axiosClient.post<SendMessageResponse>(
      `conversations/${conversationId}/messages/`,
      { content }
    );
  },
};