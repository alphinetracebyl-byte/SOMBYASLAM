import Dexie, { type Table } from 'dexie';

export interface PendingOperation {
  id?: number;
  method: 'POST' | 'PUT' | 'PATCH';
  url: string;
  payload: unknown;
  correlationId: string;
  dependsOn: number[];
  createdAt: number;
  retryCount: number;
}

export interface CachedAnimal {
  id: string;
  tagCode: string;
  species: string;
  sex: string;
  dateOfBirth: string | null;
  currentPremisesId: string | null;
  status: string;
  syncedAt: number;
}

export interface CachedPremises {
  id: string;
  premisesCode: string;
  name: string;
  regionCode: string;
  districtCode: string;
  status: string;
  syncedAt: number;
}

class QxlitsFieldDb extends Dexie {
  pendingOperations!: Table<PendingOperation>;
  animals!: Table<CachedAnimal>;
  premises!: Table<CachedPremises>;

  constructor() {
    super('qxlits-field');
    this.version(1).stores({
      pendingOperations: '++id, createdAt',
      animals: 'id, tagCode, status, currentPremisesId, syncedAt',
      premises: 'id, premisesCode, regionCode, districtCode, syncedAt',
    });
  }
}

export const db = new QxlitsFieldDb();
