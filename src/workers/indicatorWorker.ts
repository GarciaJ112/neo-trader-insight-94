
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

self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  const { type, payload } = e.data;

  if (type === 'CALCULATE_INDICATORS') {
    const startTime = performance.now();
    const { symbol, priceData, volumeData, currentPrice } = payload;

    try {
      // Calculate all indicators
      const rsi = calculateRSI(priceData);
      const macd = calculateMACD(priceData);
      const ma5 = calculateMA(priceData, 5);
      const ma20 = calculateMA(priceData, 20);
      const ma50 = calculateMA(priceData, 50);
      const bollinger = calculateBollingerBands(priceData);
      const volumeAnalysis = calculateVolumeSpike(volumeData);

      // Simulate CVD calculation (simplified for worker)
      const currentVolume = volumeData[volumeData.length - 1] || 0;
      const cvd = currentVolume * (Math.random() > 0.5 ? 1 : -1) * Math.random() * 1000;
      
      const indicators = {
        rsi,
        macd,
        ma5,
        ma20,
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
        cvdTrend: cvd > 0 ? 'bullish' : cvd < 0 ? 'bearish' : 'neutral'
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
