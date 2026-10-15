export type AnimalStatus =
  | 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'ACTIVE'
  | 'RESTRICTED' | 'MISSING' | 'DEAD' | 'SLAUGHTERED'
  | 'EXPORTED' | 'CONFISCATED' | 'ARCHIVED'
  | 'PENDING_QUARANTINE' | 'QUARANTINE';

export type Species = 'CATTLE' | 'CAMEL' | 'GOAT' | 'SHEEP';
export type Sex = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type SubmissionType = 'BIRTH' | 'PURCHASE' | 'IMPORT';

export interface AnimalSummary {
  id: string;
  animalCode: string;
  species: Species;
  breed: string;
  sex: Sex;
  dob: string | null;
  dobPrecision: string;
  coatColor: string | null;
  distinguishingMarks: string | null;
  status: AnimalStatus;
  currentOwnerId: string;
  currentPremisesId: string;
  activeTagSerial: string | null;
  primaryPhotoId: string | null;
  sourceType: SubmissionType;
  terminatedAt: string | null;
  registeredAt: string;
}

export interface RegistrationResult {
  animalId: string;
  animalCode: string;
  submissionType: SubmissionType;
  status: string;
  submittedAt: string;
}

export interface PhotoUploadUrlResponse {
  photoId: string;
  uploadUrl: string;
  expiresAt: string;
  maxSizeBytes: number;
}

export interface PhotoRecord {
  id: string;
  animalId: string;
  photoType: string;
  status: string;
  blobUrl: string;
  fileSizeBytes: number | null;
  contentType: string;
  takenAt: string | null;
  caption: string | null;
  uploadedAt: string;
  confirmedAt: string | null;
}

export interface RegistrationFormData {
  submissionType: SubmissionType;
  species: Species | '';
  breed: string;
  sex: Sex | '';
  dob: string;
  dobPrecision: 'EXACT' | 'ESTIMATED' | 'UNKNOWN';
  coatColor: string;
  distinguishingMarks: string;
  tagSerial: string;
  premisesId: string;
  photoFile: File | null;
  photoCaption: string;

  // Physical additions
  ageMonths: string;
  weightKg: string;
  bodyConditionScore: string; // '1'–'5'
  coatPattern: string;        // 'SOLID' | 'SPOTTED' | 'PIEBALD' | 'STRIPED'
  hornStatus: string;         // 'HORNED' | 'POLLED' | 'DEHORNED' | 'NA'

  // Origin — birth
  damTagSerial: string;
  sireTagSerial: string;

  // Origin — purchase
  sourceOwnerName: string;
  sourcePremisesId: string;
  purchaseDate: string;
  purchasePrice: string;

  // Origin — import
  countryOfOrigin: string;
  importPermitNumber: string;
  portOfEntry: string;
  importDate: string;

  // Batch — optional; links animal to an active batch registration session
  batchCode: string;
  batchId: string;

  // Tag extras
  tagType: string;            // 'EAR_TAG' | 'RFID' | 'BOTH'
  tagColor: string;
  tagPlacement: string;       // 'LEFT_EAR' | 'RIGHT_EAR' | 'BOTH_EARS'
  secondaryTagSerial: string;

  // Health
  healthStatus: string;       // 'HEALTHY' | 'SICK' | 'UNKNOWN'
  vaccinationStatus: string;  // 'VACCINATED' | 'UNVACCINATED' | 'UNKNOWN'
  lastVaccinationDate: string;
  vaccinationTypes: string[];
  dewormingStatus: string;    // 'DONE' | 'NOT_DONE' | 'UNKNOWN'
  veterinaryNotes: string;

  // Additional photos
  rightSidePhoto: File | null;
  frontPhoto: File | null;
  tagCloseupPhoto: File | null;
}

export const BREEDS: Record<Species, string[]> = {
  CATTLE: ['ZEBU', 'BORAN', 'SOMALI_ZEBU', 'CROSSBREED', 'OTHER'],
  CAMEL:  ['DROMEDARY', 'CROSSBREED', 'OTHER'],
  GOAT:   ['SOMALI_GOAT', 'GALLA', 'BENADIR', 'OTHER'],
  SHEEP:  ['SOMALI_BLACKHEAD', 'OGADEN', 'BENADIR', 'OTHER'],
};

export const BREED_LABELS: Record<string, string> = {
  ZEBU: 'Zebu', BORAN: 'Boran', SOMALI_ZEBU: 'Somali Zebu',
  DROMEDARY: 'Dromedary (One Hump)',
  SOMALI_GOAT: 'Somali Goat', GALLA: 'Galla', BENADIR: 'Benadir',
  SOMALI_BLACKHEAD: 'Somali Blackhead', OGADEN: 'Ogaden',
  CROSSBREED: 'Crossbreed', OTHER: 'Other',
};

export const STATUS_LABELS: Record<AnimalStatus, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', VERIFIED: 'Verified',
  ACTIVE: 'Active', RESTRICTED: 'Restricted', MISSING: 'Missing',
  DEAD: 'Dead', SLAUGHTERED: 'Slaughtered', EXPORTED: 'Exported',
  CONFISCATED: 'Confiscated', ARCHIVED: 'Archived',
  PENDING_QUARANTINE: 'Awaiting Inspection', QUARANTINE: 'In Quarantine',
};

export const STATUS_COLORS: Record<AnimalStatus, { bg: string; text: string }> = {
  DRAFT:       { bg: '#f3f4f6', text: '#6b7280' },
  SUBMITTED:   { bg: '#fef3c7', text: '#d97706' },
  VERIFIED:    { bg: '#dbeafe', text: '#2563eb' },
  ACTIVE:      { bg: '#dcfce7', text: '#16a34a' },
  RESTRICTED:  { bg: '#fde68a', text: '#b45309' },
  MISSING:     { bg: '#fee2e2', text: '#ef4444' },
  DEAD:        { bg: '#f3f4f6', text: '#374151' },
  SLAUGHTERED: { bg: '#f3f4f6', text: '#374151' },
  EXPORTED:    { bg: '#ede9fe', text: '#7c3aed' },
  CONFISCATED:        { bg: '#fee2e2', text: '#dc2626' },
  ARCHIVED:           { bg: '#f3f4f6', text: '#9ca3af' },
  PENDING_QUARANTINE: { bg: '#fef3c7', text: '#b45309' },
  QUARANTINE:         { bg: '#ffedd5', text: '#d97706' },
};
