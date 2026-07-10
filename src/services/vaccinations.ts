import { SupabaseRepository } from '../repositories';
import { TABLES } from '../constants';

export type VaccinationRecord = {
  id?: string;
  user_id?: string;
  pet_id?: string | null;
  pet_name?: string | null;
  vaccine_name: string;
  given_date?: string | null;
  next_due?: string | null;
  vet_name?: string | null;
  status?: 'completed' | 'due' | 'overdue';
  notes?: string | null;
  created_at?: string;
};

export class VaccinationService {
  private readonly repository = new SupabaseRepository<VaccinationRecord>(TABLES.vaccinations);

  listVaccinations() {
    return this.repository.list({ orderBy: 'next_due', ascending: true });
  }

  createVaccination(payload: Partial<VaccinationRecord>) {
    return this.repository.create(payload);
  }
}

export const vaccinationService = new VaccinationService();

