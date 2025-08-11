
import { workerManager } from '../services/workerManager';
import { signalDebouncer } from './signalDebouncer';

interface SubscriptionCleanup {
  id: string;
  cleanup: () => void;
  timestamp: number;
}

class MemoryManager {
  private subscriptions: Map<string, SubscriptionCleanup> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly maxAge = 300000; // 5 minutes

  start(): void {
    console.log('🧹 Starting memory manager');
    
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60000);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Cleanup on visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performCleanup();
      }
    });
  }

  addSubscription(id: string, cleanup: () => void): void {
    // Clean up existing subscription with same ID
    const existing = this.subscriptions.get(id);
    if (existing) {
      existing.cleanup();
    }

    this.subscriptions.set(id, {
      id,
      cleanup,
      timestamp: Date.now()
    });

    console.log(`🔗 Added subscription: ${id} (${this.subscriptions.size} total)`);
  }

  removeSubscription(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.cleanup();
      this.subscriptions.delete(id);
      console.log(`🔗 Removed subscription: ${id} (${this.subscriptions.size} total)`);
    }
  }

  private performCleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean up old subscriptions
    this.subscriptions.forEach((subscription, id) => {
      if (now - subscription.timestamp > this.maxAge) {
        subscription.cleanup();
        this.subscriptions.delete(id);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old subscriptions`);
    }

    // Force garbage collection if available (dev only)
    if (typeof window !== 'undefined' && 'gc' in window && process.env.NODE_ENV === 'development') {
      (window as any).gc();
    }

    // Log memory usage if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      console.log(`📊 Memory: ${Math.round(memInfo.usedJSHeapSize / 1024 / 1024)}MB used, ${Math.round(memInfo.totalJSHeapSize / 1024 / 1024)}MB total`);
    }
  }

  cleanup(): void {
    console.log('🧹 Performing full cleanup');

    // Clear all subscriptions
    this.subscriptions.forEach(subscription => {
      subscription.cleanup();
    });
    this.subscriptions.clear();

    // Clear interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Cleanup workers
    workerManager.cleanup();

    // Cleanup debouncer
    signalDebouncer.cleanup();

    console.log('✅ Full cleanup completed');
  }

  getStats(): { subscriptions: number; memoryUsage?: number } {
    const stats: any = {
      subscriptions: this.subscriptions.size
    };

    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      stats.memoryUsage = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
    }

    return stats;
  }
}

export const memoryManager = new MemoryManager();
