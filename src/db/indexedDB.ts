import { AppDatabase, Personnel, CaseFile, Vehicle, MechanicalRepair, OvertimeDuty, TrainingLecture, SystemCatalogs, LetterheadConfig, SupabaseConfig } from '../types/police';
import { initialDatabase } from './initialData';

const DB_NAME = 'SisPolDB';
const DB_VERSION = 1;
const LOCAL_STORAGE_KEY = 'sis_pol_database_v1';

class PoliceDatabaseManager {
  private memoryDb: AppDatabase | null = null;
  private listeners: Set<() => void> = new Set();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    this.init();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in db subscriber', err);
      }
    });
  }

  private openIndexedDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const stores = ['appState'];
          stores.forEach((storeName) => {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName);
            }
          });
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (err) => {
          console.warn('IndexedDB failed to open, falling back to localStorage', err);
          resolve(null);
        };
      } catch (e) {
        console.warn('IndexedDB exception, using localStorage fallback', e);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private loadFromLocalStorage(): AppDatabase | null {
    try {
      const item = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (item) {
        return JSON.parse(item);
      }
    } catch (e) {
      console.error('Failed to parse localStorage db', e);
    }
    return null;
  }

  private saveToLocalStorage(data: AppDatabase) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  public async init(): Promise<AppDatabase> {
    if (this.memoryDb) return this.memoryDb;

    // Check IndexedDB first
    const idb = await this.openIndexedDB();
    if (idb) {
      try {
        const stored = await new Promise<AppDatabase | null>((resolve) => {
          const transaction = idb.transaction(['appState'], 'readonly');
          const store = transaction.objectStore('appState');
          const req = store.get('database');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });

        if (stored && stored.personnel && stored.cases) {
          this.memoryDb = stored;
          this.saveToLocalStorage(this.memoryDb);
          return this.memoryDb;
        }
      } catch (err) {
        console.warn('Could not read from IndexedDB, checking localStorage', err);
      }
    }

    // Check localStorage
    const local = this.loadFromLocalStorage();
    if (local && local.personnel && local.cases) {
      this.memoryDb = local;
      this.persistToIDB(this.memoryDb);
      return this.memoryDb;
    }

    // Fallback to initial seeds
    this.memoryDb = JSON.parse(JSON.stringify(initialDatabase)) as AppDatabase;
    await this.persist(this.memoryDb);
    return this.memoryDb;
  }

  private async persistToIDB(data: AppDatabase): Promise<void> {
    const idb = await this.openIndexedDB();
    if (!idb) return;

    try {
      await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction(['appState'], 'readwrite');
        const store = tx.objectStore('appState');
        const req = store.put(data, 'database');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IDB write failed', e);
    }
  }

  private async persist(data: AppDatabase): Promise<void> {
    this.memoryDb = data;
    this.saveToLocalStorage(data);
    await this.persistToIDB(data);
    this.notify();
  }

  public getDatabaseSync(): AppDatabase {
    if (!this.memoryDb) {
      const local = this.loadFromLocalStorage();
      if (local) {
        this.memoryDb = local;
        return this.memoryDb;
      }
      return initialDatabase;
    }
    return this.memoryDb;
  }

  // --- Personnel Actions ---
  public async savePersonnel(person: Personnel): Promise<void> {
    const db = await this.init();
    const index = db.personnel.findIndex((p) => p.id === person.id);
    if (index >= 0) {
      db.personnel[index] = person;
    } else {
      db.personnel.unshift(person);
    }
    await this.persist(db);
  }

  public async deletePersonnel(id: string): Promise<void> {
    const db = await this.init();
    db.personnel = db.personnel.filter((p) => p.id !== id);
    await this.persist(db);
  }

  // --- Case Files Actions ---
  public async saveCase(caseItem: CaseFile): Promise<void> {
    const db = await this.init();
    const index = db.cases.findIndex((c) => c.id === caseItem.id);
    if (index >= 0) {
      db.cases[index] = caseItem;
    } else {
      db.cases.unshift(caseItem);
    }
    await this.persist(db);
  }

  public async deleteCase(id: string): Promise<void> {
    const db = await this.init();
    db.cases = db.cases.filter((c) => c.id !== id);
    await this.persist(db);
  }

  // Mark Falta de Oficio as received
  public async markOficioReceived(caseId: string, officialLetterNumber: string): Promise<void> {
    const db = await this.init();
    const item = db.cases.find((c) => c.id === caseId);
    if (item) {
      item.isFaltaOficio = false;
      item.oficioReceived = true;
      item.officialLetterNumber = officialLetterNumber;
      await this.persist(db);
    }
  }

  // Group multiple Falta de Oficio cases into a single consolidated Case
  public async groupFaltaOficioCases(
    caseIds: string[],
    newCaseData: Omit<CaseFile, 'id' | 'createdAt' | 'groupedCaseIds' | 'isFaltaOficio'>
  ): Promise<CaseFile> {
    const db = await this.init();
    const selectedCases = db.cases.filter((c) => caseIds.includes(c.id));
    
    // Create new parent case
    const newCaseId = `EXP-GRP-${Date.now()}`;
    const consolidatedCase: CaseFile = {
      ...newCaseData,
      id: newCaseId,
      isFaltaOficio: false,
      groupedCaseIds: caseIds,
      createdAt: new Date().toISOString()
    };

    // Mark original cases as linked to parent case while retaining their dates & tasks for statistical history
    db.cases = db.cases.map((c) => {
      if (caseIds.includes(c.id)) {
        return {
          ...c,
          parentCaseId: newCaseId,
          oficioReceived: true,
          observations: (c.observations ? c.observations + '\n' : '') + `[Vinculado y Agrupado en Exp: ${newCaseData.caseNumber} - Oficio: ${newCaseData.officialLetterNumber}]`
        };
      }
      return c;
    });

    db.cases.unshift(consolidatedCase);
    await this.persist(db);
    return consolidatedCase;
  }

  // --- Vehicles & Repairs Actions ---
  public async saveVehicle(vehicle: Vehicle): Promise<void> {
    const db = await this.init();
    const index = db.vehicles.findIndex((v) => v.id === vehicle.id);
    if (index >= 0) {
      db.vehicles[index] = vehicle;
    } else {
      db.vehicles.unshift(vehicle);
    }
    await this.persist(db);
  }

  public async deleteVehicle(id: string): Promise<void> {
    const db = await this.init();
    db.vehicles = db.vehicles.filter((v) => v.id !== id);
    db.repairs = db.repairs.filter((r) => r.vehicleId !== id);
    await this.persist(db);
  }

  public async saveRepair(repair: MechanicalRepair): Promise<void> {
    const db = await this.init();
    const index = db.repairs.findIndex((r) => r.id === repair.id);
    if (index >= 0) {
      db.repairs[index] = repair;
    } else {
      db.repairs.unshift(repair);
    }

    // Auto-update vehicle mileage if repair mileage is higher
    const vehicle = db.vehicles.find((v) => v.id === repair.vehicleId);
    if (vehicle && repair.mileage > vehicle.currentMileage) {
      vehicle.currentMileage = repair.mileage;
    }
    if (vehicle && repair.interventionType === 'Service Periódico') {
      vehicle.lastServiceDate = repair.date;
      vehicle.lastServiceMileage = repair.mileage;
      vehicle.nextServiceMileage = repair.mileage + 10000;
    }

    await this.persist(db);
  }

  public async deleteRepair(id: string): Promise<void> {
    const db = await this.init();
    db.repairs = db.repairs.filter((r) => r.id !== id);
    await this.persist(db);
  }

  // --- Overtime Actions ---
  public async saveOvertime(item: OvertimeDuty): Promise<void> {
    const db = await this.init();
    const index = db.overtime.findIndex((o) => o.id === item.id);
    if (index >= 0) {
      db.overtime[index] = item;
    } else {
      db.overtime.unshift(item);
    }
    await this.persist(db);
  }

  public async deleteOvertime(id: string): Promise<void> {
    const db = await this.init();
    db.overtime = db.overtime.filter((o) => o.id !== id);
    await this.persist(db);
  }

  // --- Trainings Actions ---
  public async saveTraining(item: TrainingLecture): Promise<void> {
    const db = await this.init();
    const index = db.trainings.findIndex((t) => t.id === item.id);
    if (index >= 0) {
      db.trainings[index] = item;
    } else {
      db.trainings.unshift(item);
    }
    await this.persist(db);
  }

  public async deleteTraining(id: string): Promise<void> {
    const db = await this.init();
    db.trainings = db.trainings.filter((t) => t.id !== id);
    await this.persist(db);
  }

  // --- Settings & Catalogs Actions ---
  public async updateCatalogs(catalogs: SystemCatalogs): Promise<void> {
    const db = await this.init();
    db.catalogs = catalogs;
    await this.persist(db);
  }

  public async updateLetterhead(letterhead: LetterheadConfig): Promise<void> {
    const db = await this.init();
    db.letterhead = letterhead;
    await this.persist(db);
  }

  public async updateSupabaseConfig(config: SupabaseConfig): Promise<void> {
    const db = await this.init();
    db.supabaseConfig = config;
    await this.persist(db);
  }

  // --- Full DB Restore & Reset ---
  public async restoreFullDatabase(newDb: AppDatabase): Promise<void> {
    if (!newDb || !newDb.personnel || !newDb.cases) {
      throw new Error('Formato de base de datos inválido o dañado.');
    }
    await this.persist(newDb);
  }

  public async resetToFactoryData(): Promise<void> {
    await this.persist(JSON.parse(JSON.stringify(initialDatabase)));
  }
}

export const dbManager = new PoliceDatabaseManager();
