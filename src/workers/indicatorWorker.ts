
// Web Worker for heavy indicator calculations
interface WorkerMessage {
  type: 'CALCULATE_INDICATORS';
  payload: {
    symbol: string;
    priceData: number[];
    volumeData: number[];
    currentPrice: number;
  };
}

interface WorkerResponse {
  type: 'INDICATORS_CALCULATED';
  payload: {
    symbol: string;
    indicators: any;
    processingTime: number;
  };
}

// Store CVD history for each symbol
const cvdHistory = new Map<string, number[]>();
const maxHistoryLength = 100;

// RSI calculation
function calculateRSI(prices: number[], period = 14): number {
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

// MACD calculation
function calculateMACD(prices: number[]): { macd: number; signal: number; line: number } {
  if (prices.length < 26) return { macd: 0, signal: 0, line: 0 };

  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  const signal = macdLine * 0.8;
  const macd = macdLine - signal;

  return { macd, signal, line: macdLine };
}

// EMA calculation
function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

// Moving Average calculation
function calculateMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
  return sum / period;
}

// Bollinger Bands calculation
function calculateBollingerBands(prices: number[], period = 20): { upper: number; lower: number; middle: number } {
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

// Volume spike detection
function calculateVolumeSpike(volumes: number[], period = 20): { avgVolume: number; volumeSpike: boolean } {
  if (volumes.length < period) {
    return { avgVolume: volumes[volumes.length - 1] || 0, volumeSpike: false };
  }

  const recentVolumes = volumes.slice(-period);
  const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / period;
  const currentVolume = volumes[volumes.length - 1];
  
  const volumeSpike = currentVolume > avgVolume * 2.0;
  
  return { avgVolume, volumeSpike };
}

// CVD calculation with proper price-volume analysis
function updateCVD(symbol: string, priceData: number[], volumeData: number[]): number {
  if (priceData.length < 2 || volumeData.length < 2) return 0;

  const cvdValues = cvdHistory.get(symbol) || [];
  
  // Calculate CVD for all price points if this is the first time
  if (cvdValues.length === 0) {
    let runningCVD = 0;
    for (let i = 1; i < Math.min(priceData.length, volumeData.length); i++) {
      const prevPrice = priceData[i - 1];
      const currentPrice = priceData[i];
      const volume = volumeData[i];
      
      if (currentPrice > prevPrice) {
        runningCVD += volume; // Buying pressure
      } else if (currentPrice < prevPrice) {
        runningCVD -= volume; // Selling pressure
      }
      
      cvdValues.push(runningCVD);
    }
  } else {
    // Update with latest data point
    const prevPrice = priceData[priceData.length - 2];
    const currentPrice = priceData[priceData.length - 1];
    const volume = volumeData[volumeData.length - 1];
    
    const lastCVD = cvdValues[cvdValues.length - 1] || 0;
    let newCVD = lastCVD;
    
    if (currentPrice > prevPrice) {
      newCVD += volume;
    } else if (currentPrice < prevPrice) {
      newCVD -= volume;
    }
    
    cvdValues.push(newCVD);
  }
  
  // Trim history to max length
  if (cvdValues.length > maxHistoryLength) {
    cvdValues.splice(0, cvdValues.length - maxHistoryLength);
  }
  
  cvdHistory.set(symbol, cvdValues);
  return cvdValues[cvdValues.length - 1] || 0;
}

// CVD Slope calculation using linear regression
function calculateCVDSlope(symbol: string, lookbackPeriod = 5): number {
  const cvdValues = cvdHistory.get(symbol) || [];
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

// CVD Trend analysis
function calculateCVDTrend(symbol: string, lookbackPeriod = 10): 'bullish' | 'bearish' | 'neutral' {
  const cvdValues = cvdHistory.get(symbol) || [];
  if (cvdValues.length < lookbackPeriod) return 'neutral';

  const recentCVD = cvdValues.slice(-lookbackPeriod);
  const firstValue = recentCVD[0];
  const lastValue = recentCVD[recentCVD.length - 1];
  
  const trendStrength = (lastValue - firstValue) / Math.abs(firstValue || 1);
  
  if (trendStrength > 0.1) return 'bullish';
  if (trendStrength < -0.1) return 'bearish';
  return 'neutral';
}

self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  const { type, payload } = e.data;

  if (type === 'CALCULATE_INDICATORS') {
    const startTime = performance.now();
    const { symbol, priceData, volumeData, currentPrice } = payload;

    try {
      // Calculate all indicators
      const rsi = calculateRSI(priceData);
      const macd = calculateMACD(priceData);
      
      // Calculate all EMAs (5, 8, 13, 20, 21, 34, 50)
      const ma5 = calculateEMA(priceData, 5);
      const ma8 = calculateEMA(priceData, 8);
      const ma13 = calculateEMA(priceData, 13);
      const ma20 = calculateEMA(priceData, 20);
      const ma21 = calculateEMA(priceData, 21);
      const ma34 = calculateEMA(priceData, 34);
      const ma50 = calculateEMA(priceData, 50);
      
      const bollinger = calculateBollingerBands(priceData);
      const volumeAnalysis = calculateVolumeSpike(volumeData);

      // Calculate CVD with proper price-volume analysis
      const cvd = updateCVD(symbol, priceData, volumeData);
      const cvdSlope = calculateCVDSlope(symbol);
      const cvdTrend = calculateCVDTrend(symbol);

      const currentVolume = volumeData[volumeData.length - 1] || 0;
      
      const indicators = {
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
        openInterest: currentVolume * 0.1, // Simplified
        cvd,
        cvdTrend,
        cvdSlope
      };

      const processingTime = performance.now() - startTime;

      const response: WorkerResponse = {
        type: 'INDICATORS_CALCULATED',
        payload: {
          symbol,
          indicators,
          processingTime
        }
      };

      self.postMessage(response);
    } catch (error) {
      console.error('Worker calculation error:', error);
    }
  }
};
