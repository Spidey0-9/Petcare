import { SupabaseRepository } from '../../repositories';
import { TABLES } from '../../constants';

export type FavoriteRecord = {
  id?: string;
  user_id?: string;
  target_type: 'doctor' | 'clinic' | 'product';
  target_id: string;
  created_at?: string;
};

export class FavoriteService {
  private readonly favorites = new SupabaseRepository<FavoriteRecord>(TABLES.favorites);
  private readonly savedClinics = new SupabaseRepository<{ id?: string; user_id?: string; clinic_id: string }>(TABLES.savedClinics);

  listFavorites(userId: string) {
    return this.favorites.list({ filters: { user_id: userId }, orderBy: 'created_at' });
  }

  addFavorite(payload: Partial<FavoriteRecord>) {
    return this.favorites.create(payload);
  }

  removeFavorite(id: string) {
    return this.favorites.remove(id);
  }

  saveClinic(clinicId: string) {
    return this.savedClinics.create({ clinic_id: clinicId });
  }
}

export const favoriteService = new FavoriteService();
