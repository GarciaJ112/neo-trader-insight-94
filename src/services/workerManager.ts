
interface IndicatorWorkerMessage {
  type: 'CALCULATE_INDICATORS';
  payload: {
    symbol: string;
    priceData: number[];
    volumeData: number[];
    currentPrice: number;
  };
}

interface IndicatorWorkerResponse {
  type: 'INDICATORS_CALCULATED';
  payload: {
    symbol: string;
    indicators: any;
    processingTime: number;
  };
}

type WorkerCallback = (result: IndicatorWorkerResponse['payload']) => void;

class WorkerManager {
  private workers: Worker[] = [];
  private workerIndex = 0;
  private readonly maxWorkers = 4;
  private pendingTasks = new Map<string, WorkerCallback>();

  constructor() {
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(
          new URL('../workers/indicatorWorker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (e: MessageEvent<IndicatorWorkerResponse>) => {
          const { type, payload } = e.data;
          
          if (type === 'INDICATORS_CALCULATED') {
            const callback = this.pendingTasks.get(payload.symbol);
            if (callback) {
              callback(payload);
              this.pendingTasks.delete(payload.symbol);
            }
          }
        };

        worker.onerror = (error) => {
          console.error(`Worker ${i} error:`, error);
        };

        this.workers.push(worker);
        console.log(`🔧 Initialized indicator worker ${i + 1}/${this.maxWorkers}`);
      } catch (error) {
        console.error(`Failed to create worker ${i}:`, error);
      }
    }
  }

  calculateIndicators(
    symbol: string, 
    priceData: number[], 
    volumeData: number[], 
    currentPrice: number,
    callback: WorkerCallback
  ): void {
    if (this.workers.length === 0) {
      console.error('No workers available');
      return;
    }

    // Store callback for this symbol
    this.pendingTasks.set(symbol, callback);

    // Get next available worker (round-robin)
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;

    const message: IndicatorWorkerMessage = {
      type: 'CALCULATE_INDICATORS',
      payload: {
        symbol,
        priceData,
        volumeData,
        currentPrice
      }
    };

    worker.postMessage(message);
  }

  cleanup(): void {
    this.workers.forEach((worker, index) => {
      try {
        worker.terminate();
        console.log(`🔧 Terminated worker ${index + 1}`);
      } catch (error) {
        console.error(`Error terminating worker ${index}:`, error);
      }
    });
    this.workers = [];
    this.pendingTasks.clear();
  }
}

export const workerManager = new WorkerManager();
