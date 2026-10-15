import { supabase } from '@/lib/supabase';

export interface Farmer {
  id:              string;
  userId:          string | null;
  farmerCode:      string;
  fullName:        string;
  dateOfBirth:     string | null;
  gender:          string | null;
  phoneE164:       string;
  altPhone:        string | null;
  email:           string | null;
  nationalId:      string;
  idType:          string;
  accountType:     string | null;
  companyName:     string | null;
  licenseNumber:   string | null;
  companyAddress:  string | null;
  region:          string;
  village:         string | null;
  photoUrl:        string | null;
  idFrontUrl:      string | null;
  idBackUrl:       string | null;
  status:          'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason: string | null;
  approvedAt:      string | null;
  approvedBy:      string | null;
  createdAt:       string;
  updatedAt:       string;
}

function mapRow(r: Record<string, unknown>): Farmer {
  return {
    id:              r.id as string,
    userId:          r.user_id as string | null,
    farmerCode:      r.farmer_code as string,
    fullName:        r.full_name as string,
    dateOfBirth:     r.date_of_birth as string | null,
    gender:          r.gender as string | null,
    phoneE164:       r.phone_e164 as string,
    altPhone:        r.alt_phone as string | null,
    email:           r.email as string | null,
    nationalId:      r.national_id as string,
    idType:          r.id_type as string,
    accountType:     (r.account_type as string | null) ?? null,
    companyName:     (r.company_name as string | null) ?? null,
    licenseNumber:   (r.license_number as string | null) ?? null,
    companyAddress:  (r.company_address as string | null) ?? null,
    region:          r.region as string,
    village:         r.village as string | null,
    photoUrl:        r.photo_url as string | null,
    idFrontUrl:      r.id_front_url as string | null,
    idBackUrl:       r.id_back_url as string | null,
    status:          r.status as Farmer['status'],
    rejectionReason: r.rejection_reason as string | null,
    approvedAt:      r.approved_at as string | null,
    approvedBy:      r.approved_by as string | null,
    createdAt:       r.created_at as string,
    updatedAt:       r.updated_at as string,
  };
}

export async function fetchFarmers(status?: string, region?: string): Promise<Farmer[]> {
  const { data, error } = await supabase.rpc('get_all_farmers', {
    p_status: status ?? null,
    p_region: region ?? null,
  });
  console.log('[farmers] fetchFarmers →', { rowCount: data?.length, error });
  if (error) throw error;
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>));
}

export async function fetchFarmer(id: string): Promise<Farmer> {
  const { data, error } = await supabase.rpc('get_farmer_by_id', { p_id: id });
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Farmer not found');
  return mapRow((data as Record<string, unknown>[])[0]);
}

export async function fetchFarmerByCode(farmerCode: string): Promise<Farmer> {
  const { data, error } = await supabase.rpc('get_all_farmers', { p_status: null, p_region: null });
  if (error) throw error;
  const row = (data as Record<string, unknown>[]).find(r => r.farmer_code === farmerCode);
  if (!row) throw new Error('Farmer not found');
  return mapRow(row);
}

export async function approveFarmer(id: string, officerId: string): Promise<void> {
  const { error } = await supabase.rpc('update_farmer_status', {
    p_id: id, p_status: 'APPROVED', p_rejection_reason: null, p_approved_by: officerId,
  });
  if (error) throw error;
}

export async function rejectFarmer(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('update_farmer_status', {
    p_id: id, p_status: 'REJECTED', p_rejection_reason: reason, p_approved_by: null,
  });
  if (error) throw error;
}

export async function suspendFarmer(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('update_farmer_status', {
    p_id: id, p_status: 'SUSPENDED', p_rejection_reason: reason, p_approved_by: null,
  });
  if (error) throw error;
}

export async function reinstateFarmer(id: string, officerId: string): Promise<void> {
  const { error } = await supabase.rpc('update_farmer_status', {
    p_id: id, p_status: 'APPROVED', p_rejection_reason: null, p_approved_by: officerId,
  });
  if (error) throw error;
}

export async function updateFarmer(id: string, fields: Partial<{
  fullName: string; dateOfBirth: string; gender: string;
  region: string; village: string;
  phoneE164: string; altPhone: string; email: string;
  nationalId: string; idType: string;
}>): Promise<void> {
  const patch: Record<string, string | null> = {};
  if (fields.fullName    !== undefined) patch.full_name     = fields.fullName;
  if (fields.dateOfBirth !== undefined) patch.date_of_birth = fields.dateOfBirth;
  if (fields.gender      !== undefined) patch.gender        = fields.gender;
  if (fields.region      !== undefined) patch.region        = fields.region;
  if (fields.village     !== undefined) patch.village       = fields.village || null;
  if (fields.phoneE164   !== undefined) patch.phone_e164    = fields.phoneE164;
  if (fields.altPhone    !== undefined) patch.alt_phone     = fields.altPhone || null;
  if (fields.email       !== undefined) patch.email         = fields.email || null;
  if (fields.nationalId  !== undefined) patch.national_id   = fields.nationalId;
  if (fields.idType      !== undefined) patch.id_type       = fields.idType;
  const { error } = await supabase.rpc('update_farmer_fields', { p_id: id, p_patch: patch });
  if (error) throw error;
}

/* ── Farmer-linked data (graceful empty if tables not yet built) ── */

export interface FarmerAnimal {
  id: string; tagNumber: string; species: string;
  breed: string | null; sex: string; status: string; createdAt: string;
}
export async function fetchFarmerAnimals(farmerId: string): Promise<FarmerAnimal[]> {
  const { data, error } = await supabase.rpc('get_farmer_animals', { p_farmer_id: farmerId });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:        r.id as string,
    tagNumber: r.tag_number as string,
    species:   r.species as string,
    breed:     r.breed as string | null,
    sex:       r.sex as string,
    status:    r.status as string,
    createdAt: r.created_at as string,
  }));
}

export interface FarmerPremises {
  id: string; premisesCode: string; name: string;
  premisesType: string; region: string; status: string;
}
export async function fetchFarmerPremises(farmerId: string): Promise<FarmerPremises[]> {
  const { data, error } = await supabase.rpc('get_farmer_premises', { p_farmer_id: farmerId });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:           r.id as string,
    premisesCode: r.premises_code as string,
    name:         r.name as string,
    premisesType: r.premises_type as string,
    region:       r.region as string,
    status:       r.status as string,
  }));
}

export interface FarmerExport {
  id: string; certNumber: string; destination: string;
  animalCount: number; species: string; exportDate: string; status: string;
}
export async function fetchFarmerExports(farmerId: string): Promise<FarmerExport[]> {
  const { data, error } = await supabase.rpc('get_farmer_exports', { p_farmer_id: farmerId });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:          r.id as string,
    certNumber:  r.cert_number as string,
    destination: r.destination_country as string,
    animalCount: r.animal_count as number,
    species:     r.species as string,
    exportDate:  r.export_date as string,
    status:      r.status as string,
  }));
}

export interface Batch {
  id: string; batchCode: string; batchDate: string | null;
  species: string; animalCount: number; status: string;
}
export async function fetchPremisesBatches(premisesId: string): Promise<Batch[]> {
  const { data, error } = await supabase.rpc('get_premises_batches', { p_premises_id: premisesId });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:          r.id as string,
    batchCode:   r.batch_code as string,
    batchDate:   r.batch_date as string | null,
    species:     r.species as string,
    animalCount: (r.animal_count as number) ?? 0,
    status:      r.status as string,
  }));
}

export async function fetchBatchAnimals(batchId: string): Promise<FarmerAnimal[]> {
  const { data, error } = await supabase.rpc('get_batch_animals', { p_batch_id: batchId });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:        r.id as string,
    tagNumber: (r.tag_serial as string) ?? (r.animal_code as string) ?? '—',
    species:   '—',
    breed:     (r.breed as string) ?? null,
    sex:       r.sex as string,
    status:    (r.tag_status as string) ?? '—',
    createdAt: '',
  }));
}

/* ── Farmer documents ── */

export interface FarmerDocument {
  id: string; farmerId: string; documentType: string;
  label: string; fileUrl: string; uploadedBy: string; uploadedAt: string;
}

export async function fetchFarmerDocuments(farmerId: string): Promise<FarmerDocument[]> {
  const { data, error } = await supabase.rpc('get_farmer_documents', { p_farmer_id: farmerId });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:           r.id as string,
    farmerId:     r.farmer_id as string,
    documentType: r.document_type as string,
    label:        r.label as string,
    fileUrl:      r.file_url as string,
    uploadedBy:   r.uploaded_by as string,
    uploadedAt:   r.uploaded_at as string,
  }));
}

export async function uploadFarmerDocument(
  farmerId: string, officerId: string,
  file: File, label: string, documentType: string,
): Promise<void> {
  const ext  = file.name.split('.').pop() ?? 'bin';
  const path = `${farmerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: upErr } = await supabase.storage.from('farmer-documents').upload(path, file);
  if (upErr) throw upErr;
  const { data: { publicUrl } } = supabase.storage.from('farmer-documents').getPublicUrl(path);
  const { error } = await supabase.from('farmer_documents').insert({
    farmer_id:     farmerId,
    document_type: documentType,
    label:         label || documentType,
    file_url:      publicUrl,
    uploaded_by:   officerId,
    uploaded_at:   new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteFarmerDocument(docId: string, fileUrl: string): Promise<void> {
  try {
    const match = fileUrl.match(/farmer-documents\/(.+)$/);
    if (match) await supabase.storage.from('farmer-documents').remove([match[1]]);
  } catch { /* storage cleanup non-fatal */ }
  const { error } = await supabase.from('farmer_documents').delete().eq('id', docId);
  if (error) throw error;
}

export async function notifyFarmer(
  to: string,
  farmerName: string,
  farmerCode: string,
  status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'REINSTATED',
  reason?: string,
): Promise<void> {
  if (!to) return;
  try {
    await supabase.functions.invoke('notify-farmer', {
      body: { to, farmerName, farmerCode, status, reason },
    });
  } catch {
    // Fire-and-forget — never block the user action
  }
}

/* ── Farmer activity log ── */

export interface FarmerActivityLog {
  id: string;
  category: string;
  level: string;
  title: string;
  detail: string | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
}

export async function fetchFarmerActivityLog(farmerId: string): Promise<FarmerActivityLog[]> {
  const { data } = await supabase
    .from('activity_log')
    .select('id, category, level, title, detail, actor_name, actor_role, created_at')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(r => ({
    id:        r.id as string,
    category:  r.category as string,
    level:     r.level as string,
    title:     r.title as string,
    detail:    r.detail as string | null,
    actorName: r.actor_name as string | null,
    actorRole: r.actor_role as string | null,
    createdAt: r.created_at as string,
  }));
}

export async function countByStatus(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('get_farmers_status_counts');
  console.log('[farmers] countByStatus →', { rowCount: data?.length, error });
  if (error) throw error;
  const counts: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0, SUSPENDED: 0 };
  (data ?? []).forEach((r: { status: string; cnt: number }) => { counts[r.status] = Number(r.cnt); });
  return counts;
}
