import { SupabaseRepository } from '../../repositories';
import { TABLES } from '../../constants';

export type ReviewRecord = {
  id?: string;
  user_id?: string;
  target_type: 'doctor' | 'clinic' | 'product' | 'grooming';
  target_id: string;
  rating: number;
  comment?: string | null;
  created_at?: string;
};

export class ReviewService {
  private readonly repository = new SupabaseRepository<ReviewRecord>(TABLES.reviews);

  listForTarget(targetType: ReviewRecord['target_type'], targetId: string) {
    return this.repository.list({ filters: { target_type: targetType, target_id: targetId }, orderBy: 'created_at' });
  }

  upsertReview(payload: Partial<ReviewRecord>) {
    return this.repository.create(payload);
  }

  deleteReview(id: string) {
    return this.repository.remove(id);
  }
}

export const reviewService = new ReviewService();
