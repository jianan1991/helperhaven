import { api } from './api';

// ---------- Types mirroring backend DTOs ----------

export interface ConversationView {
  id: string;
  counterpartyUserId: string;
  counterpartyDisplayName: string;
  counterpartyPhotoUrl: string | null;
  lastMessageAt: string | null;       // ISO-8601
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;                  // ISO-8601
}

export interface MessageView {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  sentAt: string;                     // ISO-8601
  readAt: string | null;
}

// ---------- API ----------

export async function listConversations(): Promise<ConversationView[]> {
  const { data } = await api.get<ConversationView[]>('/chats');
  return data;
}

/** Idempotent: opens or fetches the unique 1:1 conversation with `counterpartyUserId`. */
export async function openChat(counterpartyUserId: string): Promise<ConversationView> {
  const { data } = await api.post<ConversationView>('/chats/open', { counterpartyUserId });
  return data;
}

export async function getConversation(conversationId: string): Promise<ConversationView> {
  const { data } = await api.get<ConversationView>(`/chats/${conversationId}`);
  return data;
}

/**
 * Poll the message thread. `since` is the ISO-8601 timestamp of the last message
 * the client already has — passing it returns only the delta. Omit on first load.
 */
export async function listMessages(
  conversationId: string,
  since?: string,
): Promise<MessageView[]> {
  const { data } = await api.get<MessageView[]>(`/chats/${conversationId}/messages`, {
    params: since ? { since } : undefined,
  });
  return data;
}

export async function sendMessage(conversationId: string, body: string): Promise<MessageView> {
  const { data } = await api.post<MessageView>(`/chats/${conversationId}/messages`, { body });
  return data;
}

export async function markRead(conversationId: string): Promise<void> {
  await api.post(`/chats/${conversationId}/read`);
}
