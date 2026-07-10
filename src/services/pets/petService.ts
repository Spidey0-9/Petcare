import { SupabaseRepository } from '../../repositories';
import { TABLES, STORAGE_BUCKETS } from '../../constants';
import type { AppointmentStatus, PetRecord } from '../../types';
import { storageService } from '../storage';
import { supabase } from '../../core/services/supabase';
import { throwIfError } from '../errors';

export type PetListItem = PetRecord & {
  type?: string | null;
  age?: number | null;
  color?: string | null;
  vaccination_status?: string | null;
  microchip_number?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  medical_conditions?: string | null;
  owner_name?: string | null;
  emergency_contact?: string | null;
};

export type PetAppointmentSummary = {
  id: string;
  pet_id: string;
  scheduled_at: string;
  status: AppointmentStatus;
};

export class PetService {
  private readonly repository = new SupabaseRepository<PetListItem>(TABLES.pets);

  listPets() {
    return this.repository.list({ orderBy: 'created_at' });
  }

  listByOwner(ownerId: string) {
    return this.repository.list({ filters: { owner_id: ownerId }, orderBy: 'created_at' });
  }

  getPet(id: string) {
    return this.repository.getById(id);
  }

  createPet(payload: Partial<PetListItem>) {
    const species = payload.species ?? payload.type ?? null;
    return this.repository.create({ ...payload, species, type: payload.type ?? species });
  }

  updatePet(id: string, payload: Partial<PetListItem>) {
    const species = payload.species ?? payload.type;
    const normalized = species ? { ...payload, species, type: payload.type ?? species } : payload;
    return this.repository.update(id, normalized);
  }

  deletePet(id: string) {
    return this.repository.remove(id);
  }

  async uploadPetImage(
    ownerId: string,
    petId: string,
    file: { uri: string; fileName?: string | null; mimeType?: string | null },
  ): Promise<string> {
    console.log(
      `[PetService] uploadPetImage → ownerId="${ownerId}" petId="${petId}" ` +
      `uri="${file.uri}" mimeType="${file.mimeType ?? 'image/jpeg'}"`,
    );

    // storageService.uploadFile throws an AppError with full detail on failure.
    // We let it propagate so AddPetModal's catch block shows the real message.
    const imageUrl = await storageService.uploadFile(
      STORAGE_BUCKETS.petImages,
      `${ownerId}/${petId}`,
      file,
    );

    // Persist the public URL into the pet row
    await this.updatePet(petId, { image_url: imageUrl });
    console.log(`[PetService] uploadPetImage success → imageUrl="${imageUrl}"`);
    return imageUrl;
  }

  async listUpcomingAppointmentsByOwner(ownerId: string) {
    const { data, error } = await supabase
      .from(TABLES.appointments)
      .select('id, pet_id, scheduled_at, status')
      .eq('owner_id', ownerId)
      .gte('scheduled_at', new Date().toISOString())
      .not('status', 'in', '(cancelled,rejected,completed)')
      .order('scheduled_at', { ascending: true });
    throwIfError(error, 'Unable to load upcoming pet appointments.');
    return (data ?? []) as PetAppointmentSummary[];
  }

  subscribeToOwnerPets(ownerId: string, callback: (payload: unknown) => void) {
    return this.repository.subscribe('*', (payload) => {
      const record = payload as { new?: { owner_id?: string }; old?: { owner_id?: string } };
      if (record.new?.owner_id === ownerId || record.old?.owner_id === ownerId) callback(payload);
    });
  }
}

export const petService = new PetService();
