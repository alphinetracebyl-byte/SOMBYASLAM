import Dexie, { type Table } from 'dexie';

export interface PendingOperation {
  id?: number;
  method: 'POST' | 'PUT' | 'PATCH';
  url: string;
  payload: unknown;
  correlationId: string;
  createdAt: number;
  retryCount: number;
}

export interface CachedAnimal {
  id: string;
  tagCode: string;
  species: string;
  sex: string;
  dateOfBirth: string | null;
  status: string;
  syncedAt: number;
}

class QxlitsDb extends Dexie {
  pendingOperations!: Table<PendingOperation>;
  animals!: Table<CachedAnimal>;

  constructor() {
    super('qxlits-farmer');
    this.version(1).stores({
      pendingOperations: '++id, createdAt',
      animals: 'id, tagCode, status, syncedAt',
    });
  }
}

export const db = new QxlitsDb();
