
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

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // Subscribe to futures streams for all trading pairs including ETHUSDT
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

      // Use Binance Futures WebSocket URL
      const streamUrl = `wss://fstream.binance.com/stream?streams=${streams.join('/')}`;
      console.log('🚀 Connecting to Binance Futures WebSocket:', streamUrl);
      
      this.ws = new WebSocket(streamUrl);

      this.ws.onopen = () => {
        console.log('✅ Binance Futures WebSocket connected successfully');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        const receiveTime = Date.now();
        try {
          const message = JSON.parse(event.data);
          console.log('📦 Raw Futures WebSocket message:', message);
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
    // Handle combined stream format: {stream: "btcusdt@ticker", data: {...}}
    if (message.stream && message.data) {
      const streamParts = message.stream.split('@');
      const symbol = streamParts[0].toUpperCase(); // Convert to uppercase (btcusdt -> BTCUSDT)
      const type = streamParts[1];
      
      // Calculate delay from Binance timestamp to our receive time
      const binanceTime = message.data.E || message.data.k?.T || Date.now();
      const delay = receiveTime - binanceTime;
      
      console.log(`📈 Processing ${type} data for ${symbol} (FUTURES) with ${delay}ms delay:`, message.data);
      
      // Store the delay for this symbol
      this.messageReceiveTime.set(symbol, delay);
      
      // Notify subscribers
      this.subscribers.forEach((callback, subscriberKey) => {
        if (subscriberKey === symbol || subscriberKey === 'all') {
          const processedData = {
            ...message.data,
            type,
            symbol,
            delay: delay
          };
          console.log(`🎯 Sending futures data to subscriber ${subscriberKey} (${delay}ms delay):`, processedData);
          callback(processedData);
        }
      });
    } else {
      console.log('⚠️ Unknown message format:', message);
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
  }

  unsubscribe(symbol: string) {
    console.log(`🔕 Unsubscribing from ${symbol} data`);
    this.subscribers.delete(symbol);
    this.messageReceiveTime.delete(symbol);
  }

  disconnect() {
    console.log('👋 Disconnecting from Binance WebSocket');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.messageReceiveTime.clear();
  }
}

export const binanceWS = new BinanceWebSocketService();
