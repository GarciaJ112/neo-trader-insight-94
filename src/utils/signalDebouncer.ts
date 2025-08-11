
interface PendingSignal {
  id: string;
  symbol: string;
  strategy: string;
  timestamp: number;
  timeoutId: NodeJS.Timeout;
}

class SignalDebouncer {
  private pendingSignals: Map<string, PendingSignal> = new Map();
  private readonly debounceTime = 5000; // 5 seconds
  private readonly duplicateWindow = 15000; // Reduced from 30 to 15 seconds

  private getSignalKey(symbol: string, strategy: string, signal: string): string {
    return `${symbol}_${strategy}_${signal}`;
  }

  shouldProcessSignal(symbol: string, strategy: string, signal: string, timestamp: number): boolean {
    const key = this.getSignalKey(symbol, strategy, signal);
    const pending = this.pendingSignals.get(key);

    // Check if there's a pending signal that's too recent
    if (pending && timestamp - pending.timestamp < this.duplicateWindow) {
      const timeSinceLastSignal = Math.round((timestamp - pending.timestamp) / 1000);
      console.log(`🚫 Duplicate signal blocked for ${symbol} ${strategy} ${signal} (${timeSinceLastSignal}s ago, need ${this.duplicateWindow/1000}s gap)`);
      return false;
    }

    // Clear any existing timeout for this key
    if (pending) {
      clearTimeout(pending.timeoutId);
      console.log(`🔄 Replacing previous signal for ${symbol} ${strategy} ${signal}`);
    }

    // Set up debounce timeout
    const timeoutId = setTimeout(() => {
      this.pendingSignals.delete(key);
      console.log(`⏰ Signal debounce expired for ${key}`);
    }, this.debounceTime);

    this.pendingSignals.set(key, {
      id: key,
      symbol,
      strategy,
      timestamp,
      timeoutId
    });

    console.log(`✅ Signal approved for ${symbol} ${strategy} ${signal} (${this.pendingSignals.size} pending signals)`);
    return true;
  }

  getSignalStats(): { totalPending: number; signalsByStrategy: Record<string, number> } {
    const signalsByStrategy: Record<string, number> = {};
    
    this.pendingSignals.forEach(signal => {
      signalsByStrategy[signal.strategy] = (signalsByStrategy[signal.strategy] || 0) + 1;
    });

    return {
      totalPending: this.pendingSignals.size,
      signalsByStrategy
    };
  }

  cleanup(): void {
    this.pendingSignals.forEach(signal => {
      clearTimeout(signal.timeoutId);
    });
    this.pendingSignals.clear();
    console.log('🧹 Signal debouncer cleaned up');
  }
}

export const signalDebouncer = new SignalDebouncer();
