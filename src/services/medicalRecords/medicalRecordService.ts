import { SupabaseRepository } from '../../repositories';
import { TABLES, STORAGE_BUCKETS } from '../../constants';
import type { MedicalRecord } from '../../types';
import { storageService } from '../storage';

export class MedicalRecordService {
  private readonly repository = new SupabaseRepository<MedicalRecord>(TABLES.medicalRecords);

  listByPet(petId: string) {
    return this.repository.list({ filters: { pet_id: petId }, orderBy: 'created_at' });
  }

  listByOwner(ownerId: string) {
    return this.repository.list({ filters: { owner_id: ownerId }, orderBy: 'created_at' });
  }

  createRecord(payload: Partial<MedicalRecord>) {
    return this.repository.create(payload);
  }

  deleteRecord(id: string) {
    return this.repository.remove(id);
  }

  async uploadReport(ownerId: string, file: { uri: string; fileName?: string | null; mimeType?: string | null }) {
    return storageService.uploadFile(STORAGE_BUCKETS.medicalReports, ownerId, file);
  }
}

export const medicalRecordService = new MedicalRecordService();
