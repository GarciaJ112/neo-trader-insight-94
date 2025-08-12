
import { IndicatorValues } from '../utils/indicators';

interface IndicatorSnapshot {
  timestamp: number;
  values: IndicatorValues;
}

interface SymbolHistory {
  [symbol: string]: IndicatorSnapshot[];
}

class IndicatorHistoryService {
  private history: SymbolHistory = {};
  private readonly maxHistorySeconds = 60;
  private readonly cleanupInterval = 10000; // Clean up every 10 seconds
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Add indicator values for a symbol at current timestamp
   */
  addSnapshot(symbol: string, indicators: IndicatorValues): void {
    const snapshot: IndicatorSnapshot = {
      timestamp: Date.now(),
      values: { ...indicators }
    };

    if (!this.history[symbol]) {
      this.history[symbol] = [];
    }

    this.history[symbol].push(snapshot);
    this.cleanOldSnapshots(symbol);
  }

  /**
   * Get all snapshots for a symbol within the last 60 seconds
   */
  getHistory(symbol: string): IndicatorSnapshot[] {
    return this.history[symbol] || [];
  }

  /**
   * Get snapshots from a specific time range (in seconds ago)
   */
  getHistoryRange(symbol: string, secondsAgo: number): IndicatorSnapshot[] {
    const cutoffTime = Date.now() - (secondsAgo * 1000);
    const symbolHistory = this.history[symbol] || [];
    
    return symbolHistory.filter(snapshot => snapshot.timestamp >= cutoffTime);
  }

  /**
   * Get the latest snapshot for a symbol
   */
  getLatest(symbol: string): IndicatorSnapshot | null {
    const symbolHistory = this.history[symbol] || [];
    return symbolHistory.length > 0 ? symbolHistory[symbolHistory.length - 1] : null;
  }

  /**
   * Get snapshot from N seconds ago (approximate)
   */
  getSnapshotFromSecondsAgo(symbol: string, secondsAgo: number): IndicatorSnapshot | null {
    const targetTime = Date.now() - (secondsAgo * 1000);
    const symbolHistory = this.history[symbol] || [];
    
    // Find the closest snapshot to the target time
    let closest: IndicatorSnapshot | null = null;
    let smallestDiff = Infinity;

    for (const snapshot of symbolHistory) {
      const diff = Math.abs(snapshot.timestamp - targetTime);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closest = snapshot;
      }
    }

    return closest;
  }

  /**
   * Calculate indicator trends over time
   */
  getIndicatorTrend(symbol: string, indicator: keyof IndicatorValues, secondsBack: number = 30): {
    trend: 'up' | 'down' | 'neutral';
    change: number;
    changePercent: number;
  } {
    const snapshots = this.getHistoryRange(symbol, secondsBack);
    
    if (snapshots.length < 2) {
      return { trend: 'neutral', change: 0, changePercent: 0 };
    }

    const oldest = snapshots[0].values[indicator] as number;
    const newest = snapshots[snapshots.length - 1].values[indicator] as number;
    
    if (typeof oldest !== 'number' || typeof newest !== 'number') {
      return { trend: 'neutral', change: 0, changePercent: 0 };
    }

    const change = newest - oldest;
    const changePercent = oldest !== 0 ? (change / Math.abs(oldest)) * 100 : 0;
    
    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (Math.abs(changePercent) > 0.1) { // More than 0.1% change
      trend = change > 0 ? 'up' : 'down';
    }

    return { trend, change, changePercent };
  }

  /**
   * Check if an indicator has been stable (within threshold) for a given time
   */
  isIndicatorStable(
    symbol: string, 
    indicator: keyof IndicatorValues, 
    secondsBack: number = 15,
    thresholdPercent: number = 1
  ): boolean {
    const snapshots = this.getHistoryRange(symbol, secondsBack);
    
    if (snapshots.length < 3) return false;

    const values = snapshots.map(s => s.values[indicator] as number).filter(v => typeof v === 'number');
    if (values.length < 3) return false;

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Check if all values are within threshold of average
    return values.every(value => {
      const deviation = Math.abs((value - avg) / avg) * 100;
      return deviation <= thresholdPercent;
    });
  }

  /**
   * Get indicator statistics over time period
   */
  getIndicatorStats(symbol: string, indicator: keyof IndicatorValues, secondsBack: number = 60): {
    min: number;
    max: number;
    avg: number;
    current: number;
    volatility: number;
  } {
    const snapshots = this.getHistoryRange(symbol, secondsBack);
    const values = snapshots.map(s => s.values[indicator] as number).filter(v => typeof v === 'number');
    
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, current: 0, volatility: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const current = values[values.length - 1];
    
    // Calculate volatility (standard deviation)
    const squaredDiffs = values.map(value => Math.pow(value - avg, 2));
    const volatility = Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length);

    return { min, max, avg, current, volatility };
  }

  private cleanOldSnapshots(symbol: string): void {
    const cutoffTime = Date.now() - (this.maxHistorySeconds * 1000);
    
    if (this.history[symbol]) {
      this.history[symbol] = this.history[symbol].filter(
        snapshot => snapshot.timestamp >= cutoffTime
      );
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      Object.keys(this.history).forEach(symbol => {
        this.cleanOldSnapshots(symbol);
      });
    }, this.cleanupInterval);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.history = {};
  }
}

export const indicatorHistoryService = new IndicatorHistoryService();
