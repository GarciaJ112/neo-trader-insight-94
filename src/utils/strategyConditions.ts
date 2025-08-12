
export interface StrategyConditionConfig {
  // Volume conditions
  volumeMultiplier: number;
  
  // RSI conditions
  rsiMin: number;
  rsiMax: number;
  
  // Moving Average conditions
  useMA5: boolean;
  useMA8: boolean;
  useMA13: boolean;
  useMA20: boolean;
  useMA21: boolean;
  useMA34: boolean;
  useMA50: boolean;
  
  // MACD conditions
  macdLineAboveSignal: boolean;
  macdLineAboveZero: boolean;
  
  // Bollinger Bands conditions
  bollingerMultiplier: number;
  useBollingerUpper: boolean;
  useBollingerLower: boolean;
  useBollingerMiddle: boolean;
  
  // CVD conditions
  cvdAboveZero: boolean;
  cvdSlopePositive: boolean;
  cvdLookbackCandles: number;
  
  // Profit/Loss settings
  takeProfitPercent: number;
  stopLossPercent: number;
}

export interface TradingPairStrategyConditions {
  [symbol: string]: {
    scalping: StrategyConditionConfig;
    intraday: StrategyConditionConfig;
    pump: StrategyConditionConfig;
  };
}

// Default conditions for each strategy type
const DEFAULT_SCALPING_CONDITIONS: StrategyConditionConfig = {
  volumeMultiplier: 1.5,
  rsiMin: 0,
  rsiMax: 40,
  useMA5: false,
  useMA8: true,
  useMA13: false,
  useMA20: false,
  useMA21: true,
  useMA34: false,
  useMA50: false,
  macdLineAboveSignal: true,
  macdLineAboveZero: false,
  bollingerMultiplier: 1.01,
  useBollingerUpper: false,
  useBollingerLower: true,
  useBollingerMiddle: false,
  cvdAboveZero: false,
  cvdSlopePositive: true,
  cvdLookbackCandles: 5,
  takeProfitPercent: 0.5,
  stopLossPercent: 0.25
};

const DEFAULT_INTRADAY_CONDITIONS: StrategyConditionConfig = {
  volumeMultiplier: 1.2,
  rsiMin: 35,
  rsiMax: 65,
  useMA5: false,
  useMA8: false,
  useMA13: false,
  useMA20: true,
  useMA21: false,
  useMA34: true,
  useMA50: false,
  macdLineAboveSignal: true,
  macdLineAboveZero: false,
  bollingerMultiplier: 1.01,
  useBollingerUpper: false,
  useBollingerLower: true,
  useBollingerMiddle: false,
  cvdAboveZero: true,
  cvdSlopePositive: true,
  cvdLookbackCandles: 10,
  takeProfitPercent: 2.0,
  stopLossPercent: 1.0
};

const DEFAULT_PUMP_CONDITIONS: StrategyConditionConfig = {
  volumeMultiplier: 2.0,
  rsiMin: 50,
  rsiMax: 85,
  useMA5: true,
  useMA8: false,
  useMA13: true,
  useMA20: false,
  useMA21: false,
  useMA34: false,
  useMA50: false,
  macdLineAboveSignal: true,
  macdLineAboveZero: true,
  bollingerMultiplier: 1.0,
  useBollingerUpper: false,
  useBollingerLower: false,
  useBollingerMiddle: true,
  cvdAboveZero: true,
  cvdSlopePositive: true,
  cvdLookbackCandles: 5,
  takeProfitPercent: 3.0,
  stopLossPercent: 1.0
};

class StrategyConditionsManager {
  private conditions: TradingPairStrategyConditions = {};
  private readonly STORAGE_KEY = 'trading_strategy_conditions';

  constructor() {
    this.loadConditions();
  }

  /**
   * Get conditions for a specific symbol and strategy
   */
  getConditions(symbol: string, strategy: 'scalping' | 'intraday' | 'pump'): StrategyConditionConfig {
    if (!this.conditions[symbol]) {
      this.initializeSymbol(symbol);
    }
    return this.conditions[symbol][strategy];
  }

  /**
   * Update conditions for a specific symbol and strategy
   */
  updateConditions(
    symbol: string, 
    strategy: 'scalping' | 'intraday' | 'pump', 
    conditions: Partial<StrategyConditionConfig>
  ): void {
    if (!this.conditions[symbol]) {
      this.initializeSymbol(symbol);
    }
    
    this.conditions[symbol][strategy] = {
      ...this.conditions[symbol][strategy],
      ...conditions
    };
    
    this.saveConditions();
    console.log(`📝 Updated ${strategy} conditions for ${symbol}:`, conditions);
  }

  /**
   * Reset conditions for a symbol and strategy to defaults
   */
  resetConditions(symbol: string, strategy: 'scalping' | 'intraday' | 'pump'): void {
    if (!this.conditions[symbol]) {
      this.initializeSymbol(symbol);
    }
    
    this.conditions[symbol][strategy] = this.getDefaultConditions(strategy);
    this.saveConditions();
    console.log(`🔄 Reset ${strategy} conditions for ${symbol} to defaults`);
  }

  /**
   * Get all conditions for a symbol
   */
  getAllConditionsForSymbol(symbol: string) {
    if (!this.conditions[symbol]) {
      this.initializeSymbol(symbol);
    }
    return this.conditions[symbol];
  }

  /**
   * Get all symbols with conditions
   */
  getAllSymbols(): string[] {
    return Object.keys(this.conditions);
  }

  /**
   * Export conditions as JSON
   */
  exportConditions(): string {
    return JSON.stringify(this.conditions, null, 2);
  }

  /**
   * Import conditions from JSON
   */
  importConditions(jsonData: string): boolean {
    try {
      const importedConditions = JSON.parse(jsonData);
      // Validate structure
      if (typeof importedConditions === 'object') {
        this.conditions = importedConditions;
        this.saveConditions();
        console.log('✅ Successfully imported strategy conditions');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to import conditions:', error);
    }
    return false;
  }

  private initializeSymbol(symbol: string): void {
    this.conditions[symbol] = {
      scalping: { ...DEFAULT_SCALPING_CONDITIONS },
      intraday: { ...DEFAULT_INTRADAY_CONDITIONS },
      pump: { ...DEFAULT_PUMP_CONDITIONS }
    };
    this.saveConditions();
  }

  private getDefaultConditions(strategy: 'scalping' | 'intraday' | 'pump'): StrategyConditionConfig {
    switch (strategy) {
      case 'scalping':
        return { ...DEFAULT_SCALPING_CONDITIONS };
      case 'intraday':
        return { ...DEFAULT_INTRADAY_CONDITIONS };
      case 'pump':
        return { ...DEFAULT_PUMP_CONDITIONS };
    }
  }

  private saveConditions(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.conditions));
    } catch (error) {
      console.error('Failed to save strategy conditions:', error);
    }
  }

  private loadConditions(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.conditions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load strategy conditions:', error);
      this.conditions = {};
    }
  }
}

export const strategyConditionsManager = new StrategyConditionsManager();
