
import { TradingSignal, SignalHistory } from '../utils/signalPersistence';

interface DBSchema {
  signals: TradingSignal;
  config: { key: string; value: any };
}

class IndexedDBService {
  private dbName = 'TradingSignalsDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create signals store
        if (!db.objectStoreNames.contains('signals')) {
          const signalsStore = db.createObjectStore('signals', { keyPath: 'id' });
          signalsStore.createIndex('symbol', 'symbol', { unique: false });
          signalsStore.createIndex('strategy', 'strategy', { unique: false });
          signalsStore.createIndex('timestamp', 'timestamp', { unique: false });
          signalsStore.createIndex('active', 'active', { unique: false });
        }

        // Create config store
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
        }
      };
    });
  }

  async saveSignal(signal: TradingSignal): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['signals'], 'readwrite');
      const store = transaction.objectStore('signals');
      const request = store.put(signal);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`💾 Signal saved to IndexedDB: ${signal.id}`);
        resolve();
      };
    });
  }

  async getSignals(limit = 1000): Promise<TradingSignal[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['signals'], 'readonly');
      const store = transaction.objectStore('signals');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Latest first

      const signals: TradingSignal[] = [];
      let count = 0;

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && count < limit) {
          signals.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(signals);
        }
      };
    });
  }

  async getActiveSignals(): Promise<TradingSignal[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['signals'], 'readonly');
      const store = transaction.objectStore('signals');
      const index = store.index('active');
      const request = index.getAll(IDBKeyRange.only(true));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const activeSignals = request.result.filter(signal => !signal.executed);
        resolve(activeSignals);
      };
    });
  }

  async updateSignal(signal: TradingSignal): Promise<void> {
    return this.saveSignal(signal);
  }

  async deleteSignal(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['signals'], 'readwrite');
      const store = transaction.objectStore('signals');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllSignals(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['signals'], 'readwrite');
      const store = transaction.objectStore('signals');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveConfig(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['config'], 'readwrite');
      const store = transaction.objectStore('config');
      const request = store.put({ key, value });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getConfig(key: string): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['config'], 'readonly');
      const store = transaction.objectStore('config');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
    });
  }

  // Migration helper - move from localStorage to IndexedDB
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const localData = localStorage.getItem('trading_signals');
      if (localData) {
        const history: SignalHistory = JSON.parse(localData);
        console.log(`🔄 Migrating ${history.signals.length} signals from localStorage to IndexedDB`);

        for (const signal of history.signals) {
          await this.saveSignal(signal);
        }

        // Save Google Sheets config if exists
        const sheetsConfig = localStorage.getItem('googleSheetsConfig');
        if (sheetsConfig) {
          await this.saveConfig('googleSheetsConfig', JSON.parse(sheetsConfig));
        }

        console.log('✅ Migration completed successfully');
        
        // Optional: Clear localStorage after successful migration
        // localStorage.removeItem('trading_signals');
        // localStorage.removeItem('googleSheetsConfig');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  }
}

export const indexedDBService = new IndexedDBService();
