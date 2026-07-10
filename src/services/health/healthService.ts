import { SupabaseRepository } from '../../repositories';
import { TABLES } from '../../constants';

export type PetHealthLog = {
  id?: string;
  pet_id: string;
  user_id?: string;
  weight?: number | null;
  health_score?: number | null;
  mood?: string | null;
  appetite?: string | null;
  notes?: string | null;
  logged_at?: string;
};

export class HealthService {
  private readonly logs = new SupabaseRepository<PetHealthLog>(TABLES.petHealthLogs);

  listPetLogs(petId: string) {
    return this.logs.list({ filters: { pet_id: petId }, orderBy: 'logged_at' });
  }

  addPetLog(payload: Partial<PetHealthLog>) {
    return this.logs.create(payload);
  }
}

export const healthService = new HealthService();
