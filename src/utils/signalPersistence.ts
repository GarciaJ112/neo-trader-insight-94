import { googleSheetsService } from '../services/googleSheetsService';
import { indexedDBService } from '../services/indexedDbService';
import { signalDebouncer } from './signalDebouncer';

export interface TradingSignal {
  id: string;
  symbol: string;
  strategy: 'scalping' | 'intraday' | 'pump';
  signal: 'LONG' | 'SHORT' | 'WAIT';
  timestamp: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  indicators: {
    rsi: number;
    macd: { macd: number; signal: number; line: number };
    ma5: number;
    ma20: number;
    ma50: number;
    bollingerUpper: number;
    bollingerLower: number;
    currentPrice: number;
    volume: number;
    volumeSpike: boolean;
    cvd: number;
    cvdTrend: string;
  };
  conditions: Record<string, boolean>;
  active: boolean;
  executed?: boolean;
  executedAt?: number;
  pnl?: number;
}

export interface SignalHistory {
  signals: TradingSignal[];
  lastUpdate: number;
}

class SignalPersistenceManager {
  private readonly storageKey = 'trading_signals';
  private readonly maxSignals = 1000;
  private isIndexedDBReady = false;

  constructor() {
    this.initializeIndexedDB();
  }

  private async initializeIndexedDB(): Promise<void> {
    try {
      await indexedDBService.init();
      await indexedDBService.migrateFromLocalStorage();
      this.isIndexedDBReady = true;
      console.log('✅ IndexedDB initialized and migration completed');
    } catch (error) {
      console.error('❌ IndexedDB initialization failed, falling back to localStorage:', error);
      this.isIndexedDBReady = false;
    }
  }

  async saveSignal(signal: TradingSignal): Promise<void> {
    // Apply debouncing to prevent duplicates
    if (!signalDebouncer.shouldProcessSignal(signal.symbol, signal.strategy, signal.signal, signal.timestamp)) {
      return;
    }

    try {
      if (this.isIndexedDBReady) {
        // Use IndexedDB
        await indexedDBService.saveSignal(signal);
      } else {
        // Fallback to localStorage
        const history = await this.getSignalHistory();
        
        // Remove existing signal for same symbol/strategy if exists
        history.signals = history.signals.filter(
          s => !(s.symbol === signal.symbol && s.strategy === signal.strategy && s.active)
        );
        
        // Add new signal
        history.signals.unshift(signal);
        
        // Keep only the most recent signals
        if (history.signals.length > this.maxSignals) {
          history.signals = history.signals.slice(0, this.maxSignals);
        }
        
        history.lastUpdate = Date.now();
        localStorage.setItem(this.storageKey, JSON.stringify(history));
      }

      console.log(`💾 Saved ${signal.signal} signal for ${signal.symbol} (${signal.strategy})`);

      // Send to Google Sheets if configured
      if (googleSheetsService.isConfigured()) {
        try {
          await googleSheetsService.appendSignalToSheet(signal);
          console.log('📊 Signal sent to Google Sheets');
        } catch (error) {
          console.error('Failed to send signal to Google Sheets:', error);
        }
      }
    } catch (error) {
      console.error('Error saving signal:', error);
      throw error;
    }
  }

  async getSignalHistory(): Promise<SignalHistory> {
    try {
      // Try to get from Google Sheets first
      if (googleSheetsService.isConfigured()) {
        const sheetsSignals = await googleSheetsService.readSignalsFromSheet();
        if (sheetsSignals.length > 0) {
          return {
            signals: sheetsSignals,
            lastUpdate: Date.now()
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load from Google Sheets, falling back to local storage:', error);
    }

    // Fallback to local storage
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading signal history:', error);
    }
    
    return { signals: [], lastUpdate: Date.now() };
  }

  async getActiveSignals(): Promise<TradingSignal[]> {
    try {
      if (this.isIndexedDBReady) {
        return await indexedDBService.getActiveSignals();
      } else {
        const history = await this.getSignalHistory();
        return history.signals.filter(signal => signal.active && !signal.executed);
      }
    } catch (error) {
      console.error('Error getting active signals:', error);
      return [];
    }
  }

  async getSignalsBySymbol(symbol: string): Promise<TradingSignal[]> {
    try {
      // Try Google Sheets first
      if (googleSheetsService.isConfigured()) {
        return await googleSheetsService.getSignalsBySymbol(symbol);
      }
      
      // Fallback to local/IndexedDB
      if (this.isIndexedDBReady) {
        const allSignals = await indexedDBService.getSignals();
        return allSignals.filter(signal => signal.symbol === symbol);
      } else {
        const history = await this.getSignalHistory();
        return history.signals.filter(signal => signal.symbol === symbol);
      }
    } catch (error) {
      console.error('Error getting signals by symbol:', error);
      return [];
    }
  }

  async getSignalsByStrategy(strategy: string): Promise<TradingSignal[]> {
    try {
      if (this.isIndexedDBReady) {
        const allSignals = await indexedDBService.getSignals();
        return allSignals.filter(signal => signal.strategy === strategy);
      } else {
        const history = await this.getSignalHistory();
        return history.signals.filter(signal => signal.strategy === strategy);
      }
    } catch (error) {
      console.error('Error getting signals by strategy:', error);
      return [];
    }
  }

  async deactivateSignal(signalId: string): Promise<void> {
    try {
      if (this.isIndexedDBReady) {
        const signals = await indexedDBService.getSignals();
        const signal = signals.find(s => s.id === signalId);
        
        if (signal) {
          signal.active = false;
          await indexedDBService.updateSignal(signal);
          console.log(`🔕 Deactivated signal ${signalId}`);
        }
      } else {
        const history = await this.getSignalHistory();
        const signal = history.signals.find(s => s.id === signalId);
        
        if (signal) {
          signal.active = false;
          history.lastUpdate = Date.now();
          localStorage.setItem(this.storageKey, JSON.stringify(history));
          console.log(`🔕 Deactivated signal ${signalId}`);
        }
      }
    } catch (error) {
      console.error('Error deactivating signal:', error);
      throw error;
    }
  }

  async markSignalExecuted(signalId: string, executionPrice: number): Promise<void> {
    try {
      if (this.isIndexedDBReady) {
        const signals = await indexedDBService.getSignals();
        const signal = signals.find(s => s.id === signalId);
        
        if (signal) {
          signal.executed = true;
          signal.executedAt = Date.now();
          signal.active = false;
          
          // Calculate P&L based on signal type
          if (signal.signal === 'LONG') {
            signal.pnl = executionPrice - signal.entryPrice;
          } else if (signal.signal === 'SHORT') {
            signal.pnl = signal.entryPrice - executionPrice;
          }
          
          await indexedDBService.updateSignal(signal);
          console.log(`✅ Marked signal ${signalId} as executed at ${executionPrice}`);
        }
      } else {
        const history = await this.getSignalHistory();
        const signal = history.signals.find(s => s.id === signalId);
        
        if (signal) {
          signal.executed = true;
          signal.executedAt = Date.now();
          signal.active = false;
          
          // Calculate P&L based on signal type
          if (signal.signal === 'LONG') {
            signal.pnl = executionPrice - signal.entryPrice;
          } else if (signal.signal === 'SHORT') {
            signal.pnl = signal.entryPrice - executionPrice;
          }
          
          history.lastUpdate = Date.now();
          localStorage.setItem(this.storageKey, JSON.stringify(history));
          console.log(`✅ Marked signal ${signalId} as executed at ${executionPrice}`);
        }
      }
    } catch (error) {
      console.error('Error marking signal as executed:', error);
      throw error;
    }
  }

  generateSignalId(symbol: string, strategy: string, timestamp: number): string {
    return `${symbol}_${strategy}_${timestamp}`;
  }

  async clearHistory(): Promise<void> {
    try {
      if (this.isIndexedDBReady) {
        await indexedDBService.clearAllSignals();
      }
      localStorage.removeItem(this.storageKey);
      console.log('🗑️ Cleared signal history');
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  async exportHistory(): Promise<string> {
    try {
      let signals: TradingSignal[] = [];
      
      if (this.isIndexedDBReady) {
        signals = await indexedDBService.getSignals();
      } else {
        const history = await this.getSignalHistory();
        signals = history.signals;
      }

      const exportData = {
        signals,
        lastUpdate: Date.now(),
        exportedAt: new Date().toISOString(),
        totalSignals: signals.length
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting history:', error);
      throw error;
    }
  }
}

export const signalPersistence = new SignalPersistenceManager();
