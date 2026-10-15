export type AnimalStatus =
  | 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'ACTIVE'
  | 'RESTRICTED' | 'MISSING' | 'DEAD' | 'SLAUGHTERED'
  | 'EXPORTED' | 'CONFISCATED' | 'ARCHIVED';

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AnimalSummary {
  id: string;
  animalCode: string;
  status: AnimalStatus;
  species: string;
  breed: string;
  sex: 'MALE' | 'FEMALE' | 'UNKNOWN';
  dob: string | null;
  dobPrecision: string;
  coatColor: string | null;
  distinguishingMarks: string | null;
  sourceType: string;
  activeTagSerial: string | null;
  currentOwnerId: string;
  currentPremisesId: string;
  registeredAt: string;
  terminatedAt: string | null;
}

export interface RegistrationSubmission {
  id: string;
  submissionCode: string;
  submissionType: string;
  status: SubmissionStatus;
  species: string;
  breed: string;
  sex: string;
  dob: string | null;
  dobPrecision: string;
  coatColor: string | null;
  distinguishingMarks: string | null;
  tagSerial: string;
  ownerId: string;
  premisesId: string;
  animalId: string | null;
  animalCode: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
}

export interface PhotoRecord {
  id: string;
  animalId: string;
  photoType: string;
  status: string;
  blobUrl: string;
  caption: string | null;
  uploadedAt: string;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const SPECIES_LABEL: Record<string, string> = {
  CATTLE: 'Cattle', CAMEL: 'Camel', GOAT: 'Goat', SHEEP: 'Sheep',
};

export const STATUS_COLORS: Record<AnimalStatus, { bg: string; color: string }> = {
  DRAFT:       { bg: '#f3f4f6', color: '#6b7280' },
  SUBMITTED:   { bg: '#fef3c7', color: '#92400e' },
  VERIFIED:    { bg: '#dbeafe', color: '#1d4ed8' },
  ACTIVE:      { bg: '#dcfce7', color: '#166534' },
  RESTRICTED:  { bg: '#fde68a', color: '#92400e' },
  MISSING:     { bg: '#fee2e2', color: '#991b1b' },
  DEAD:        { bg: '#f3f4f6', color: '#374151' },
  SLAUGHTERED: { bg: '#f3f4f6', color: '#374151' },
  EXPORTED:    { bg: '#ede9fe', color: '#6d28d9' },
  CONFISCATED: { bg: '#fee2e2', color: '#991b1b' },
  ARCHIVED:    { bg: '#f3f4f6', color: '#9ca3af' },
};
