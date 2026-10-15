import { supabase } from '@/lib/supabase';

export interface AvailableBatch {
  id: string;
  batchCode: string;
  batchName: string;
  species: string;
  breed: string;
  count: number;
  status: string;
  premisesCode: string;
  region: string;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
}

export interface IncomingBatch {
  id: string;
  moveCode: string;
  batchName: string;
  species: string;
  count: number;
  fromPremises: string;
  fromRegion: string;
  fromOwner: string;
  status: string;
  expectedArrival: string;
  departedAt?: string;
}

export interface OutgoingBatch {
  id: string;
  moveCode: string;
  batchName: string;
  species: string;
  count: number;
  toPremises: string;
  toRegion: string;
  toOwner: string;
  status: string;
  departureDate: string;
}

export interface ExportedBatch {
  id: string;
  exportCode: string;
  batchName: string;
  species: string;
  count: number;
  destinationCountry: string;
  port: string;
  exportCompany: string;
  status: string;
  departureDate: string;
  clearedAt?: string;
}

export interface MyAnimal {
  id: string;
  animalCode: string;
  species: string;
  breed: string;
  sex: string;
  status: string;
  tagSerial: string | null;
  tagStatus: string;
  premisesCode: string;
  dob: string | null;
  ageMonths: number | null;
  weightKg: number | null;
  coatColor: string | null;
  submissionType: string;
  registeredAt: string;
  batchId: string | null;
}

export async function fetchMyAnimals(premisesCodes: string[]): Promise<MyAnimal[]> {
  if (premisesCodes.length === 0) return [];
  const { data, error } = await supabase
    .from('animals')
    .select('id, animal_code, species, breed, sex, status, tag_serial, tag_status, current_premises_id, dob, age_months, weight_kg, coat_color, submission_type, registered_at, batch_id')
    .in('current_premises_id', premisesCodes)
    .order('registered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => ({
    id:             r.id,
    animalCode:     r.animal_code,
    species:        r.species,
    breed:          r.breed,
    sex:            r.sex,
    status:         r.status,
    tagSerial:      r.tag_serial,
    tagStatus:      r.tag_status,
    premisesCode:   r.current_premises_id,
    dob:            r.dob,
    ageMonths:      r.age_months,
    weightKg:       r.weight_kg,
    coatColor:      r.coat_color,
    submissionType: r.submission_type,
    registeredAt:   r.registered_at,
    batchId:        r.batch_id,
  }));
}

export async function fetchBatchAnimals(batchId: string): Promise<MyAnimal[]> {
  const { data, error } = await supabase
    .from('animals')
    .select('id, animal_code, species, breed, sex, status, tag_serial, tag_status, current_premises_id, dob, age_months, weight_kg, coat_color, submission_type, registered_at, batch_id')
    .eq('batch_id', batchId)
    .order('registered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => ({
    id:             r.id,
    animalCode:     r.animal_code,
    species:        r.species,
    breed:          r.breed,
    sex:            r.sex,
    status:         r.status,
    tagSerial:      r.tag_serial,
    tagStatus:      r.tag_status,
    premisesCode:   r.current_premises_id,
    dob:            r.dob,
    ageMonths:      r.age_months,
    weightKg:       r.weight_kg,
    coatColor:      r.coat_color,
    submissionType: r.submission_type,
    registeredAt:   r.registered_at,
    batchId:        r.batch_id,
  }));
}

export async function fetchAnimalsByPremises(premisesCode: string): Promise<MyAnimal[]> {
  const { data, error } = await supabase
    .from('animals')
    .select('id, animal_code, species, breed, sex, status, tag_serial, tag_status, current_premises_id, dob, age_months, weight_kg, coat_color, submission_type, registered_at, batch_id')
    .eq('current_premises_id', premisesCode)
    .order('registered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => ({
    id:             r.id,
    animalCode:     r.animal_code,
    species:        r.species,
    breed:          r.breed,
    sex:            r.sex,
    status:         r.status,
    tagSerial:      r.tag_serial,
    tagStatus:      r.tag_status,
    premisesCode:   r.current_premises_id,
    dob:            r.dob,
    ageMonths:      r.age_months,
    weightKg:       r.weight_kg,
    coatColor:      r.coat_color,
    submissionType: r.submission_type,
    registeredAt:   r.registered_at,
    batchId:        r.batch_id,
  }));
}

export async function fetchBatches(premisesCodes?: string[]): Promise<AvailableBatch[]> {
  let query = supabase.from('batches').select('*').order('created_at', { ascending: false });
  if (premisesCodes && premisesCodes.length > 0) {
    query = query.in('premises_code', premisesCodes);
  } else if (premisesCodes !== undefined) {
    return []; // empty filter list → no results
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(r => ({
    id:           r.id,
    batchCode:    r.batch_code,
    batchName:    r.batch_name,
    species:      r.species,
    breed:        r.breed,
    count:        r.count,
    status:       r.status,
    premisesCode: r.premises_code,
    region:       r.region,
    createdAt:    r.created_at,
    submittedAt:  r.submitted_at ?? undefined,
    approvedAt:   r.approved_at ?? undefined,
  }));
}

export async function fetchIncoming(userId?: string | null): Promise<IncomingBatch[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('incoming_movements')
    .select('*')
    .eq('to_owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(r => ({
    id:              r.id,
    moveCode:        r.move_code,
    batchName:       r.batch_name,
    species:         r.species,
    count:           r.count,
    fromPremises:    r.from_premises,
    fromRegion:      r.from_region,
    fromOwner:       r.from_owner,
    status:          r.status,
    expectedArrival: r.expected_arrival,
    departedAt:      r.departed_at ?? undefined,
  }));
}

export async function fetchOutgoing(userId?: string | null): Promise<OutgoingBatch[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('outgoing_movements')
    .select('*')
    .eq('from_owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(r => ({
    id:            r.id,
    moveCode:      r.move_code,
    batchName:     r.batch_name,
    species:       r.species,
    count:         r.count,
    toPremises:    r.to_premises,
    toRegion:      r.to_region,
    toOwner:       r.to_owner,
    status:        r.status,
    departureDate: r.departure_date,
  }));
}

export async function fetchExported(userId?: string | null): Promise<ExportedBatch[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('exported_batches')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(r => ({
    id:                 r.id,
    exportCode:         r.export_code,
    batchName:          r.batch_name,
    species:            r.species,
    count:              r.count,
    destinationCountry: r.destination_country,
    port:               r.port,
    exportCompany:      r.export_company,
    status:             r.status,
    departureDate:      r.departure_date,
    clearedAt:          r.cleared_at ?? undefined,
  }));
}
