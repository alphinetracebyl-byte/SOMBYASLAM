import { apiClient } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import type {
  AnimalSummary, RegistrationFormData, RegistrationResult,
  PhotoUploadUrlResponse, PhotoRecord, SubmissionType,
} from './animals.types';

export interface AnimalSearchParams {
  ownerId?: string;
  status?: string;
  species?: string;
  page?: number;
  size?: number;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export async function fetchAnimals(params: AnimalSearchParams): Promise<PageResult<AnimalSummary>> {
  const res = await apiClient.get<PageResult<AnimalSummary>>('/animals', { params });
  return res.data;
}

export async function fetchAnimal(animalId: string): Promise<AnimalSummary> {
  const res = await apiClient.get<AnimalSummary>(`/animals/${animalId}`);
  return res.data;
}

export async function fetchAnimalPhotos(animalId: string): Promise<PhotoRecord[]> {
  const res = await apiClient.get<PhotoRecord[]>(`/animals/${animalId}/photos`);
  return res.data;
}

function genAnimalCode(): string {
  // Client-generated national code: SOM-XXXXXXXXXX (10 digits)
  // Uses epoch-ms tail + random to avoid collisions without needing sequence privileges.
  const base = Date.now() % 10_000_000_000;
  const rand = Math.floor(Math.random() * 1000);
  const num  = (base + rand) % 10_000_000_000;
  return `SOM-${String(num).padStart(10, '0')}`;
}

export async function submitRegistration(
  data: RegistrationFormData,
  ownerId: string,
): Promise<RegistrationResult> {
  const isRealBatchId = data.batchId && !data.batchId.startsWith('new-');
  const animal_code = genAnimalCode();

  const row = {
    animal_code,
    submission_type:       data.submissionType,
    species:               data.species,
    breed:                 data.breed,
    sex:                   data.sex,
    dob:                   data.dob || null,
    dob_precision:         data.dob ? data.dobPrecision : 'UNKNOWN',
    age_months:            data.ageMonths ? parseInt(data.ageMonths, 10) : null,
    weight_kg:             data.weightKg ? parseFloat(data.weightKg) : null,
    coat_color:            data.coatColor || null,
    coat_pattern:          data.coatPattern || null,
    horn_status:           data.hornStatus || null,
    body_condition_score:  data.bodyConditionScore ? parseInt(data.bodyConditionScore, 10) : null,
    distinguishing_marks:  data.distinguishingMarks || null,
    tag_serial:            data.tagSerial || null,
    tag_type:              'RFID',
    tag_color:             data.tagColor || null,
    tag_placement:         data.tagPlacement || null,
    secondary_tag_serial:  data.secondaryTagSerial || null,
    tag_status:            data.tagSerial ? 'TAGGED' : 'UNTAGGED',
    dam_tag_serial:        data.submissionType === 'BIRTH'     ? (data.damTagSerial || null)       : null,
    sire_tag_serial:       data.submissionType === 'BIRTH'     ? (data.sireTagSerial || null)      : null,
    source_owner_name:     data.submissionType === 'PURCHASE'  ? (data.sourceOwnerName || null)    : null,
    source_premises_id:    data.submissionType === 'PURCHASE'  ? (data.sourcePremisesId || null)   : null,
    purchase_date:         data.submissionType === 'PURCHASE'  ? (data.purchaseDate || null)       : null,
    purchase_price_sos:    data.submissionType === 'PURCHASE' && data.purchasePrice
                             ? parseFloat(data.purchasePrice) : null,
    country_of_origin:     data.submissionType === 'IMPORT'    ? (data.countryOfOrigin || null)    : null,
    import_permit_number:  data.submissionType === 'IMPORT'    ? (data.importPermitNumber || null) : null,
    port_of_entry:         data.submissionType === 'IMPORT'    ? (data.portOfEntry || null)        : null,
    import_date:           data.submissionType === 'IMPORT'    ? (data.importDate || null)         : null,
    health_status:         data.healthStatus || 'UNKNOWN',
    vaccination_status:    data.vaccinationStatus || 'UNKNOWN',
    last_vaccination_date: data.lastVaccinationDate || null,
    vaccination_types:     data.vaccinationTypes.length > 0 ? data.vaccinationTypes : null,
    deworming_status:      data.dewormingStatus || 'UNKNOWN',
    veterinary_notes:      data.veterinaryNotes || null,
    current_owner_id:      ownerId,
    current_premises_id:   data.premisesId,
    status:                'SUBMITTED',
    batch_id:              isRealBatchId ? data.batchId : null,
  };

  const { data: inserted, error } = await supabase
    .from('animals')
    .insert(row)
    .select('id, created_at')
    .single();

  if (error) throw new Error(error.message);

  void logActivity({
    category:      'ANIMAL',
    level:         'INFO',
    title:         'Animal registration submitted',
    detail:        `${data.species} ${data.sex.toLowerCase()} submitted — awaiting field inspector verification`,
    actorRole:     'Farmer',
    referenceCode: animal_code,
    userId:        ownerId,
    farmerId:      ownerId,
  });

  return {
    animalId:       inserted.id as string,
    animalCode:     animal_code,
    submissionType: data.submissionType as SubmissionType,
    status:         'SUBMITTED',
    submittedAt:    inserted.created_at as string,
  };
}

export async function requestPhotoUploadUrl(
  animalId: string,
  file: File,
): Promise<PhotoUploadUrlResponse> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const payload = {
    photoType: 'PRIMARY',
    fileExtension: ext,
    contentType: file.type,
  };
  const res = await apiClient.post<PhotoUploadUrlResponse>(
    `/animals/${animalId}/photos/upload-url`,
    payload,
  );
  return res.data;
}

export async function uploadPhotoToBlob(uploadUrl: string, file: File): Promise<void> {
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type, 'x-ms-blob-type': 'BlockBlob' },
    body: file,
  });
}

export async function confirmPhotoUpload(
  animalId: string,
  photoId: string,
  file: File,
  caption?: string,
): Promise<PhotoRecord> {
  const payload = {
    fileSizeBytes: file.size,
    takenAt: new Date().toISOString(),
    caption: caption || null,
  };
  const res = await apiClient.post<PhotoRecord>(
    `/animals/${animalId}/photos/${photoId}/confirm`,
    payload,
  );
  return res.data;
}
