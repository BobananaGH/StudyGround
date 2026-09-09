import { API_ENDPOINTS } from './api/endpoints.js'
import { get, post } from './api/client.js'

export async function getConversations() {
  return get(API_ENDPOINTS.CONVERSATIONS)
}

export async function getConversation(conversationId) {
  return get(`${API_ENDPOINTS.CONVERSATIONS}${conversationId}/`)
}

export async function createConversation(data) {
  return post(API_ENDPOINTS.CONVERSATIONS, data)
}

export async function getMessages(conversationId) {
  return get(`${API_ENDPOINTS.CONVERSATIONS}${conversationId}/messages/`)
}

export async function sendMessage(conversationId, content) {
  return post(`${API_ENDPOINTS.CONVERSATIONS}${conversationId}/messages/`, { content })
}

export async function deleteConversation(conversationId) {
  // TODO: Backend does not currently have a delete endpoint
  // Would need: DELETE /api/conversations/<conversationId>/
  throw new Error('Delete conversation not yet implemented on backend')
}

export async function renameConversation(conversationId, title) {
  // TODO: Backend does not currently have an update endpoint
  // Would need: PATCH /api/conversations/<conversationId>/
  throw new Error('Rename conversation not yet implemented on backend')
}

export const conversationsService = {
  getConversations,
  getConversation,
  createConversation,
  getMessages,
  sendMessage,
  deleteConversation,
  renameConversation,
}

export default conversationsService