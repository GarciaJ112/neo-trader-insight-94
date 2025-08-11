
export interface TickerData {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  high: string;
  low: string;
}

export interface KlineData {
  symbol: string;
  openTime: number;
  closeTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private messageReceiveTime: Map<string, number> = new Map();
  private lastDataReceived: Map<string, number> = new Map();
  private dataGapTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.connect();
    this.startGapDetection();
  }

  private startGapDetection() {
    // Check for data gaps every 30 seconds
    this.dataGapTimer = setInterval(() => {
      const now = Date.now();
      this.lastDataReceived.forEach((lastTime, symbol) => {
        const timeSinceLastData = now - lastTime;
        if (timeSinceLastData > 60000) { // 1 minute gap
          console.warn(`⚠️ No data received for ${symbol} in ${Math.round(timeSinceLastData / 1000)}s - possible subscription gap`);
        }
      });
    }, 30000);
  }

  private connect() {
    try {
      const streams = [
        'btcusdt@ticker',
        'ethusdt@ticker',
        'xrpusdt@ticker', 
        'solusdt@ticker',
        'dogeusdt@ticker',
        'btcusdt@kline_1m',
        'ethusdt@kline_1m',
        'xrpusdt@kline_1m',
        'solusdt@kline_1m',
        'dogeusdt@kline_1m'
      ];

      const streamUrl = `wss://fstream.binance.com/stream?streams=${streams.join('/')}`;
      this.ws = new WebSocket(streamUrl);

      this.ws.onopen = () => {
        console.log('✅ Binance Futures WebSocket connected successfully');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        const receiveTime = Date.now();
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message, receiveTime);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 Binance Futures WebSocket disconnected:', event.code, event.reason);
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ Futures WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Error connecting to Binance Futures WebSocket:', error);
      this.handleReconnect();
    }
  }

  private handleMessage(message: any, receiveTime: number) {
    if (message.stream && message.data) {
      const streamParts = message.stream.split('@');
      const symbol = streamParts[0].toUpperCase();
      const type = streamParts[1];
      
      // Update last data received time for gap detection
      this.lastDataReceived.set(symbol, receiveTime);
      
      const binanceTime = message.data.E || message.data.k?.T || Date.now();
      const delay = receiveTime - binanceTime;
      
      this.messageReceiveTime.set(symbol, delay);
      
      this.subscribers.forEach((callback, subscriberKey) => {
        if (subscriberKey === symbol || subscriberKey === 'all') {
          const processedData = {
            ...message.data,
            type,
            symbol,
            delay: delay
          };
          callback(processedData);
        }
      });
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      
      console.log(`🔄 Reconnecting in ${delay}ms... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached. Please refresh the page.');
    }
  }

  getDelay(symbol: string): number {
    return this.messageReceiveTime.get(symbol) || 0;
  }

  subscribe(symbol: string, callback: (data: any) => void) {
    console.log(`🔔 Subscribing to ${symbol} data`);
    this.subscribers.set(symbol, callback);
    this.lastDataReceived.set(symbol, Date.now());
  }

  unsubscribe(symbol: string) {
    console.log(`🔕 Unsubscribing from ${symbol} data`);
    this.subscribers.delete(symbol);
    this.messageReceiveTime.delete(symbol);
    this.lastDataReceived.delete(symbol);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.dataGapTimer) {
      clearInterval(this.dataGapTimer);
      this.dataGapTimer = null;
    }
    this.subscribers.clear();
    this.messageReceiveTime.clear();
    this.lastDataReceived.clear();
  }
}

export const binanceWS = new BinanceWebSocketService();
