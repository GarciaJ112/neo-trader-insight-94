
import { fileLogger } from '../services/fileLogger';

interface StrategyConditions {
  [key: string]: boolean;
}

interface SymbolStrategyState {
  [symbol: string]: {
    [strategy: string]: {
      previousAllGreen: boolean;
      currentConditions: StrategyConditions;
    };
  };
}

class StrategyTracker {
  private state: SymbolStrategyState = {};

  updateConditions(symbol: string, strategy: string, conditions: StrategyConditions): void {
    // Initialize if not exists
    if (!this.state[symbol]) {
      this.state[symbol] = {};
    }
    if (!this.state[symbol][strategy]) {
      this.state[symbol][strategy] = {
        previousAllGreen: false,
        currentConditions: {}
      };
    }

    const strategyState = this.state[symbol][strategy];
    const allGreen = Object.values(conditions).every(Boolean);
    
    // Check if we transitioned from not-all-green to all-green
    if (allGreen && !strategyState.previousAllGreen) {
      fileLogger.logAllGreen(strategy, symbol);
    }

    // Update state
    strategyState.previousAllGreen = allGreen;
    strategyState.currentConditions = { ...conditions };
  }

  isAllGreen(symbol: string, strategy: string): boolean {
    return this.state[symbol]?.[strategy]?.previousAllGreen || false;
  }

  getConditions(symbol: string, strategy: string): StrategyConditions {
    return this.state[symbol]?.[strategy]?.currentConditions || {};
  }
}

export const strategyTracker = new StrategyTracker();
