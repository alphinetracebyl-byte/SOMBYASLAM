export interface MovementPermit {
  id: string;
  permit_number: string;
  movement_code: string | null;
  status: string; // ACTIVE | EXPIRED | CANCELLED | USED
  animal_count: number | null;
  animal_ids: string[] | null;
  origin_premises_code: string | null;
  origin_premises_name: string | null;
  destination_premises_code: string | null;
  destination_premises_name: string | null;
  owner_name: string | null;
  vehicle_registration: string | null;
  valid_from: string | null;
  valid_to: string | null;
  conditions: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuarantineBatch {
  id: string;
  batch_code: string;
  facility_id: string;
  facility_code: string;
  movement_permit_id: string | null;
  vehicle_reg: string | null;
  driver_name: string | null;
  seal_number: string | null;
  permit_qr_data: string | null;
  status: string;
  quarantine_purpose: string;
  pen_assignment: string | null;
  isolation_pen: string | null;
  admission_date: string;
  quarantine_days: number;
  expected_completion_date: string | null;
  actual_completion_date: string | null;
  animal_count: number;
  vet_officer_id: string | null;
  vet_officer_name: string | null;
  health_hold_reason: string | null;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchAnimal {
  id: string;
  batch_id: string;
  facility_id: string;
  animal_id: string | null;
  tag_number: string | null;
  species: string;
  sex: string | null;
  estimated_age: string | null;
  weight_kg: number | null;
  pen_assignment: string | null;
  isolation_required: boolean;
  arrival_condition: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface HealthInspection {
  id: string;
  inspection_code: string;
  batch_id: string;
  facility_id: string;
  inspection_type: string;
  inspection_date: string;
  inspector_id: string;
  inspector_name: string;
  status: string;
  general_health: string | null;
  behaviour: string | null;
  temperature_avg: number | null;
  clinical_observations: string | null;
  symptoms: string[] | null;
  injuries: string | null;
  fitness_assessment: string | null;
  vet_recommendation: string | null;
  notes: string | null;
  created_at: string;
}

export interface LabSample {
  id: string;
  sample_code: string;
  batch_id: string;
  facility_id: string;
  animal_id: string | null;
  tag_number: string | null;
  sample_type: string;
  test_type: string;
  collection_date: string;
  collector_id: string;
  collector_name: string;
  lab_destination: string | null;
  status: string;
  result: string;
  result_date: string | null;
  result_notes: string | null;
  auto_hold_triggered: boolean;
  created_at: string;
}

export interface DailyMonitoring {
  id: string;
  batch_id: string;
  facility_id: string;
  monitoring_date: string;
  recorded_by_id: string;
  recorded_by_name: string;
  feed_available: boolean;
  water_available: boolean;
  general_behaviour: string | null;
  visible_symptoms: string | null;
  sick_count: number;
  injured_count: number;
  dead_count: number;
  missing_count: number;
  isolation_actions: string | null;
  pen_incidents: string | null;
  biosecurity_incidents: string | null;
  verified_by_name: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface TreatmentRecord {
  id: string;
  batch_id: string;
  facility_id: string;
  animal_id: string | null;
  tag_number: string | null;
  treatment_type: string;
  medicine_name: string;
  dose: string | null;
  administration_route: string | null;
  date_administered: string;
  batch_lot_number: string | null;
  treating_vet_id: string;
  treating_vet_name: string;
  next_dose_date: string | null;
  withdrawal_period_days: number | null;
  withdrawal_end_date: string | null;
  treatment_outcome: string;
  notes: string | null;
  created_at: string;
}

export interface QuarantineClearance {
  id: string;
  clearance_code: string;
  batch_id: string;
  facility_id: string;
  decision: string;
  decision_date: string;
  decided_by_id: string;
  decided_by_name: string;
  checklist: Record<string, boolean>;
  certificate_number: string | null;
  valid_until: string | null;
  extension_days: number | null;
  notes: string | null;
  created_at: string;
}

export interface SlaughterRecord {
  id: string;
  slaughter_code: string;
  facility_id: string;
  facility_code: string;
  movement_permit_id: string | null;
  session_date: string;
  animal_id: string | null;
  tag_number: string;
  species: string;
  origin_facility_code: string | null;
  owner_name: string | null;
  pen_assignment: string | null;
  arrival_condition: string;
  status: string;
  slaughter_date: string | null;
  slaughter_time: string | null;
  slaughter_line: string | null;
  carcass_code: string | null;
  weight_before_kg: number | null;
  carcass_weight_kg: number | null;
  received_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnteMortemInspection {
  id: string;
  slaughter_id: string;
  facility_id: string;
  tag_number: string;
  inspection_date: string;
  inspector_id: string;
  inspector_name: string;
  health_condition: string | null;
  behaviour: string | null;
  mobility: string | null;
  injuries: string | null;
  visible_symptoms: string | null;
  testing_required: boolean;
  isolation_required: boolean;
  decision: string;
  conditions: string | null;
  notes: string | null;
  created_at: string;
}

export interface HalalVerification {
  id: string;
  slaughter_id: string;
  facility_id: string;
  tag_number: string;
  verification_date: string;
  slaughter_time: string | null;
  verified_by_id: string;
  verified_by_name: string;
  slaughterer_name: string | null;
  slaughterer_verified: boolean;
  animal_alive_confirmed: boolean;
  slaughter_method: string | null;
  stunning_used: boolean;
  stunning_method: string | null;
  equipment_condition: string | null;
  tasmiyah_recited: boolean;
  non_compliance_notes: string | null;
  decision: string;
  rejection_reason: string | null;
  created_at: string;
}

export interface PostMortemInspection {
  id: string;
  slaughter_id: string;
  facility_id: string;
  carcass_code: string;
  inspection_date: string;
  inspector_id: string;
  inspector_name: string;
  carcass_condition: string | null;
  head_findings: string | null;
  organ_findings: string | null;
  visible_lesions: string | null;
  contamination: string | null;
  suspected_disease: string | null;
  samples_collected: boolean;
  sample_details: string | null;
  decision: string;
  conditions_notes: string | null;
  condemnation_reason: string | null;
  condemned_parts: string | null;
  condemned_weight_kg: number | null;
  disposal_method: string | null;
  notes: string | null;
  created_at: string;
}

export interface ExportConsignment {
  id: string;
  consignment_code: string;
  facility_id: string;
  facility_code: string;
  status: string;
  destination: string | null;
  exporter_name: string | null;
  container_vehicle: string | null;
  container_seal: string | null;
  loading_date: string | null;
  loading_time: string | null;
  total_items: number;
  total_weight_kg: number | null;
  supervisor_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
