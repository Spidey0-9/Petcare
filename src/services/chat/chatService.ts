import { SupabaseRepository } from '../../repositories';
import { TABLES, STORAGE_BUCKETS } from '../../constants';
import type { MessageRecord } from '../../types';
import { storageService } from '../storage';

export class ChatService {
  private readonly messages = new SupabaseRepository<MessageRecord>(TABLES.messages);

  listConversation(conversationId: string, page = 1) {
    return this.messages.list({ filters: { conversation_id: conversationId }, page, orderBy: 'created_at', ascending: false });
  }

  sendMessage(payload: Partial<MessageRecord>) {
    return this.messages.create(payload);
  }

  markRead(id: string) {
    return this.messages.update(id, { is_read: true });
  }

  async uploadAttachment(conversationId: string, file: { uri: string; fileName?: string | null; mimeType?: string | null }) {
    return storageService.uploadFile(STORAGE_BUCKETS.medicalReports, `chat/${conversationId}`, file);
  }

  subscribeToConversation(callback: (payload: unknown) => void) {
    return this.messages.subscribe('*', callback);
  }
}

export const chatService = new ChatService();
