import { apiClient } from '../api';
import { SupabaseRepository } from '../../repositories';

export type AiPredictionRecord = {
  id?: string;
  user_id: string;
  pet_id?: string | null;
  prompt: string;
  result?: string | null;
  image_url?: string | null;
  created_at?: string;
};

export class AIService {
  private readonly history = new SupabaseRepository<AiPredictionRecord>('ai_predictions');

  async askAssistant(prompt: string, context?: Record<string, unknown>) {
    const endpoint = process.env.EXPO_PUBLIC_AI_API_URL;
    if (!endpoint) throw new Error('Missing EXPO_PUBLIC_AI_API_URL.');

    const { data } = await apiClient.post(endpoint, { prompt, context });
    return data;
  }

  async checkSymptoms(userId: string, petId: string | null, symptoms: string[]) {
    const result = await this.askAssistant('Analyze these pet symptoms and suggest next steps.', { petId, symptoms });
    await this.history.create({
      user_id: userId,
      pet_id: petId,
      prompt: symptoms.join(', '),
      result: JSON.stringify(result),
    });
    return result;
  }

  listPredictionHistory(userId: string) {
    return this.history.list({ filters: { user_id: userId }, orderBy: 'created_at' });
  }
}

export const aiService = new AIService();
