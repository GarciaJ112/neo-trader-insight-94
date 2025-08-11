export interface IndicatorValues {
  rsi: number;
  macd: { macd: number; signal: number; line: number };
  ma5: number;
  ma8: number; // New EMA8
  ma13: number; // New EMA13
  ma20: number;
  ma21: number; // New EMA21
  ma34: number; // New EMA34
  ma50: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerMiddle: number;
  volume: number;
  avgVolume: number;
  volumeSpike: boolean;
  price: number;
  openInterest: number;
  cvd: number;
  cvdTrend: 'bullish' | 'bearish' | 'neutral';
  cvdSlope: number; // New CVD slope
}

export interface IndicatorPresets {
  rsi: { min: number; max: number };
  macd: { threshold: number };
  ma: { threshold: number };
  bollinger: { threshold: number };
  volume: { multiplier: number };
  openInterest: { threshold: number };
  cvd: { threshold: number };
}

// Default preset ranges based on common trading strategies
export const defaultPresets: IndicatorPresets = {
  rsi: { min: 30, max: 70 },
  macd: { threshold: 0 },
  ma: { threshold: 0.02 }, // 2% threshold
  bollinger: { threshold: 0.01 }, // 1% threshold
  volume: { multiplier: 2.0 }, // Enhanced volume spike threshold
  openInterest: { threshold: 0 },
  cvd: { threshold: 0 }
};

export class IndicatorCalculator {
  private priceHistory: Map<string, number[]> = new Map();
  private volumeHistory: Map<string, number[]> = new Map();
  private openInterestHistory: Map<string, number[]> = new Map();
  private cvdHistory: Map<string, number[]> = new Map();
  private readonly maxHistoryLength = 100;

  updatePrice(symbol: string, price: number, volume: number, openInterest: number = 0) {
    // Update price history
    const prices = this.priceHistory.get(symbol) || [];
    prices.push(price);
    if (prices.length > this.maxHistoryLength) {
      prices.shift();
    }
    this.priceHistory.set(symbol, prices);

    // Update volume history
    const volumes = this.volumeHistory.get(symbol) || [];
    volumes.push(volume);
    if (volumes.length > this.maxHistoryLength) {
      volumes.shift();
    }
    this.volumeHistory.set(symbol, volumes);

    // Update open interest history
    const openInterests = this.openInterestHistory.get(symbol) || [];
    openInterests.push(openInterest);
    if (openInterests.length > this.maxHistoryLength) {
      openInterests.shift();
    }
    this.openInterestHistory.set(symbol, openInterests);

    // Calculate and update CVD
    this.updateCVD(symbol, price, volume);
  }

  private updateCVD(symbol: string, price: number, volume: number) {
    const prices = this.priceHistory.get(symbol) || [];
    const cvdValues = this.cvdHistory.get(symbol) || [];
    
    if (prices.length >= 2) {
      const previousPrice = prices[prices.length - 2];
      const currentPrice = prices[prices.length - 1];
      
      // Enhanced CVD calculation with price movement analysis
      let volumeDelta = 0;
      const priceChange = currentPrice - previousPrice;
      const priceChangePercent = Math.abs(priceChange) / previousPrice;
      
      // Weight volume based on price movement strength
      const volumeWeight = Math.min(1 + priceChangePercent * 10, 3); // Max 3x weight
      
      if (currentPrice > previousPrice) {
        volumeDelta = volume * volumeWeight; // Buying pressure
      } else if (currentPrice < previousPrice) {
        volumeDelta = -volume * volumeWeight; // Selling pressure
      }
      
      const lastCVD = cvdValues.length > 0 ? cvdValues[cvdValues.length - 1] : 0;
      const newCVD = lastCVD + volumeDelta;
      
      cvdValues.push(newCVD);
      if (cvdValues.length > this.maxHistoryLength) {
        cvdValues.shift();
      }
      this.cvdHistory.set(symbol, cvdValues);
    } else {
      cvdValues.push(0);
      this.cvdHistory.set(symbol, cvdValues);
    }
  }

  calculateRSI(symbol: string, period: number = 14): number {
    const prices = this.priceHistory.get(symbol) || [];
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateMACD(symbol: string): { macd: number; signal: number; line: number } {
    const prices = this.priceHistory.get(symbol) || [];
    if (prices.length < 26) return { macd: 0, signal: 0, line: 0 };

    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    const signal = macdLine * 0.8;
    const macd = macdLine - signal;

    return { macd, signal, line: macdLine };
  }

  calculateMovingAverage(symbol: string, period: number): number {
    const prices = this.priceHistory.get(symbol) || [];
    if (prices.length < period) return prices[prices.length - 1] || 0;

    const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  calculateBollingerBands(symbol: string, period: number = 20): { upper: number; lower: number; middle: number } {
    const prices = this.priceHistory.get(symbol) || [];
    if (prices.length < period) {
      const currentPrice = prices[prices.length - 1] || 0;
      return { upper: currentPrice, lower: currentPrice, middle: currentPrice };
    }

    const recentPrices = prices.slice(-period);
    const middle = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    const upper = middle + (stdDev * 2);
    const lower = middle - (stdDev * 2);

    return { upper, lower, middle };
  }

  // Enhanced volume spike detection
  calculateVolumeSpike(symbol: string, lookbackPeriod: number = 20): { avgVolume: number; volumeSpike: boolean } {
    const volumes = this.volumeHistory.get(symbol) || [];
    if (volumes.length < lookbackPeriod) {
      return { avgVolume: volumes[volumes.length - 1] || 0, volumeSpike: false };
    }

    const recentVolumes = volumes.slice(-lookbackPeriod);
    const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / lookbackPeriod;
    const currentVolume = volumes[volumes.length - 1];
    
    const volumeSpike = currentVolume > avgVolume * defaultPresets.volume.multiplier;
    
    return { avgVolume, volumeSpike };
  }

  // New method to calculate CVD slope over specified periods
  calculateCVDSlope(symbol: string, lookbackPeriod: number = 5): number {
    const cvdValues = this.cvdHistory.get(symbol) || [];
    if (cvdValues.length < lookbackPeriod + 1) return 0;

    const recentCVD = cvdValues.slice(-lookbackPeriod - 1);
    if (recentCVD.length < 2) return 0;

    // Calculate linear regression slope
    const n = recentCVD.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentCVD[i];
      sumXY += i * recentCVD[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  // Enhanced CVD trend analysis
  calculateCVDTrend(symbol: string, lookbackPeriod: number = 10): 'bullish' | 'bearish' | 'neutral' {
    const cvdValues = this.cvdHistory.get(symbol) || [];
    if (cvdValues.length < lookbackPeriod) return 'neutral';

    const recentCVD = cvdValues.slice(-lookbackPeriod);
    const firstValue = recentCVD[0];
    const lastValue = recentCVD[recentCVD.length - 1];
    
    const trendStrength = (lastValue - firstValue) / Math.abs(firstValue || 1);
    
    if (trendStrength > 0.1) return 'bullish';
    if (trendStrength < -0.1) return 'bearish';
    return 'neutral';
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  getIndicatorValues(symbol: string): IndicatorValues {
    const prices = this.priceHistory.get(symbol) || [];
    const currentPrice = prices[prices.length - 1] || 0;
    const volumes = this.volumeHistory.get(symbol) || [];
    const currentVolume = volumes[volumes.length - 1] || 0;
    const openInterests = this.openInterestHistory.get(symbol) || [];
    const currentOpenInterest = openInterests[openInterests.length - 1] || 0;
    const cvdValues = this.cvdHistory.get(symbol) || [];
    const currentCVD = cvdValues[cvdValues.length - 1] || 0;

    const rsi = this.calculateRSI(symbol);
    const macd = this.calculateMACD(symbol);
    const ma5 = this.calculateMovingAverage(symbol, 5);
    const ma8 = this.calculateMovingAverage(symbol, 8);
    const ma13 = this.calculateMovingAverage(symbol, 13);
    const ma20 = this.calculateMovingAverage(symbol, 20);
    const ma21 = this.calculateMovingAverage(symbol, 21);
    const ma34 = this.calculateMovingAverage(symbol, 34);
    const ma50 = this.calculateMovingAverage(symbol, 50);
    const bollinger = this.calculateBollingerBands(symbol);
    const volumeAnalysis = this.calculateVolumeSpike(symbol);
    const cvdTrend = this.calculateCVDTrend(symbol);
    const cvdSlope = this.calculateCVDSlope(symbol);

    return {
      rsi,
      macd,
      ma5,
      ma8,
      ma13,
      ma20,
      ma21,
      ma34,
      ma50,
      bollingerUpper: bollinger.upper,
      bollingerLower: bollinger.lower,
      bollingerMiddle: bollinger.middle,
      volume: currentVolume,
      avgVolume: volumeAnalysis.avgVolume,
      volumeSpike: volumeAnalysis.volumeSpike,
      price: currentPrice,
      openInterest: currentOpenInterest,
      cvd: currentCVD,
      cvdTrend,
      cvdSlope
    };
  }
}

export const indicatorCalculator = new IndicatorCalculator();

export function checkIndicatorMatch(indicator: string, value: number, currentPrice: number, presets: IndicatorPresets = defaultPresets): boolean {
  switch (indicator) {
    case 'RSI':
      return value >= presets.rsi.min && value <= presets.rsi.max;
    
    case 'MACD Line':
      return value > presets.macd.threshold;
    
    case '5 EMA':
    case '20 EMA':
    case '50 EMA':
      const priceDiff = Math.abs(value - currentPrice) / currentPrice;
      return priceDiff <= presets.ma.threshold;
    
    case 'Bollinger Upper':
    case 'Bollinger Lower':
      const bollingerDiff = Math.abs(value - currentPrice) / currentPrice;
      return bollingerDiff <= presets.bollinger.threshold;
    
    case 'Volume Spike':
      return value > 0;
    
    case 'Open Interest':
      return value > presets.openInterest.threshold;
    
    case 'CVD':
      return value > presets.cvd.threshold;
    
    default:
      return false;
  }
}
