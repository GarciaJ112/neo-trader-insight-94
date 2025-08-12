export interface GoogleSheetsConfig {
  spreadsheetId: string;
  serviceAccountKey: string;
  sheetName: string;
}

export interface GoogleSheetsCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

class GoogleSheetsService {
  private config: GoogleSheetsConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  
  // Static configuration - will be updated when you provide the JSON key and Sheet ID
  private static readonly DEFAULT_CONFIG = {
    email: 'univerigrok@gmail.com',
    sheetName: 'Signals',
    // These will be set when you provide them
    spreadsheetId: '1FnFPo-6Zbhgci7rl6sW-Wf4w1vlf3qbio5q1QDVzS-w', // temporary default
    serviceAccountKey: '' // will be set when provided
  };

  setConfig(config: GoogleSheetsConfig): void {
    this.config = config;
    localStorage.setItem('googleSheetsConfig', JSON.stringify(config));
  }

  getConfig(): GoogleSheetsConfig | null {
    if (this.config) return this.config;
    
    const stored = localStorage.getItem('googleSheetsConfig');
    if (stored) {
      this.config = JSON.parse(stored);
      return this.config;
    }
    
    // Use static config if available
    if (GoogleSheetsService.DEFAULT_CONFIG.serviceAccountKey) {
      return {
        spreadsheetId: GoogleSheetsService.DEFAULT_CONFIG.spreadsheetId,
        sheetName: GoogleSheetsService.DEFAULT_CONFIG.sheetName,
        serviceAccountKey: GoogleSheetsService.DEFAULT_CONFIG.serviceAccountKey
      };
    }
    
    return null;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const config = this.getConfig();
    if (!config) {
      throw new Error('Google Sheets not configured');
    }

    const credentials: GoogleSheetsCredentials = JSON.parse(config.serviceAccountKey);
    
    // Create JWT token
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const jwt = await this.createJWT(header, payload, credentials.private_key);
    
    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
    
    return this.accessToken;
  }

  private async createJWT(header: any, payload: any, privateKey: string): Promise<string> {
    const encoder = new TextEncoder();
    
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const message = `${headerB64}.${payloadB64}`;
    
    // Import the private key
    const keyData = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\s/g, '');
    
    const keyBuffer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    // Sign the message
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(message)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${message}.${signatureB64}`;
  }

  async readSignalsFromSheet(): Promise<any[]> {
    const config = this.getConfig();
    if (!config) {
      throw new Error('Google Sheets not configured');
    }

    const accessToken = await this.getAccessToken();
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${config.sheetName}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to read from Google Sheets:', error);
      throw new Error(`Failed to read from sheet: ${error}`);
    }

    const data = await response.json();
    const rows = data.values || [];
    
    if (rows.length === 0) {
      return [];
    }

    // Skip header row and convert to signal objects
    const signals = rows.slice(1).map((row: any[]) => {
      try {
        return {
          id: row[0] || '',
          symbol: row[1] || '',
          strategy: row[2] || '',
          signal: row[3] || '',
          timestamp: row[4] ? new Date(row[4]).getTime() : Date.now(),
          entryPrice: parseFloat(row[5]) || 0,
          takeProfit: parseFloat(row[6]) || 0,
          stopLoss: parseFloat(row[7]) || 0,
          indicators: {
            rsi: parseFloat(row[8]) || 0,
            macd: {
              line: parseFloat(row[9]) || 0,
              signal: parseFloat(row[10]) || 0,
              macd: (parseFloat(row[9]) || 0) - (parseFloat(row[10]) || 0)
            },
            ma5: parseFloat(row[11]) || 0,
            ma8: parseFloat(row[12]) || 0,
            ma13: parseFloat(row[13]) || 0,
            ma20: parseFloat(row[14]) || 0,
            ma21: parseFloat(row[15]) || 0,
            ma34: parseFloat(row[16]) || 0,
            ma50: parseFloat(row[17]) || 0,
            bollingerUpper: parseFloat(row[18]) || 0,
            bollingerLower: parseFloat(row[19]) || 0,
            bollingerMiddle: parseFloat(row[20]) || 0,
            currentPrice: parseFloat(row[21]) || 0,
            volume: parseFloat(row[22]) || 0,
            avgVolume: parseFloat(row[23]) || 0,
            volumeSpike: row[24] === 'true',
            cvd: parseFloat(row[25]) || 0,
            cvdTrend: row[26] || 'neutral',
            cvdSlope: parseFloat(row[27]) || 0
          },
          active: row[28] === 'true',
          executed: row[29] === 'true',
          executedAt: row[30] ? new Date(row[30]).getTime() : undefined,
          pnl: row[31] ? parseFloat(row[31]) : undefined,
          conditions: row[32] ? JSON.parse(row[32]) : {}
        };
      } catch (error) {
        console.warn('Failed to parse signal row:', row, error);
        return null;
      }
    }).filter(Boolean);

    console.log(`📊 Read ${signals.length} signals from Google Sheets`);
    return signals;
  }

  async getSignalsBySymbol(symbol: string): Promise<any[]> {
    try {
      const allSignals = await this.readSignalsFromSheet();
      return allSignals.filter(signal => signal.symbol === symbol);
    } catch (error) {
      console.error('Failed to get signals by symbol from Google Sheets:', error);
      return [];
    }
  }

  async appendSignalToSheet(signal: any): Promise<void> {
    const config = this.getConfig();
    if (!config) {
      throw new Error('Google Sheets not configured');
    }

    const accessToken = await this.getAccessToken();
    
    const values = [[
      signal.id,
      signal.symbol,
      signal.strategy,
      signal.signal,
      new Date(signal.timestamp).toISOString(),
      signal.entryPrice,
      signal.takeProfit,
      signal.stopLoss,
      signal.indicators.rsi || 0,
      signal.indicators.macd?.line || 0,
      signal.indicators.macd?.signal || 0,
      signal.indicators.ma5 || 0,
      signal.indicators.ma8 || 0,
      signal.indicators.ma13 || 0,
      signal.indicators.ma20 || 0,
      signal.indicators.ma21 || 0,
      signal.indicators.ma34 || 0,
      signal.indicators.ma50 || 0,
      signal.indicators.bollingerUpper || 0,
      signal.indicators.bollingerLower || 0,
      signal.indicators.bollingerMiddle || 0,
      signal.indicators.currentPrice || signal.indicators.price || 0,
      signal.indicators.volume || 0,
      signal.indicators.avgVolume || 0,
      signal.indicators.volumeSpike || false,
      signal.indicators.cvd || 0,
      signal.indicators.cvdTrend || 'neutral',
      signal.indicators.cvdSlope || 0,
      signal.active,
      signal.executed || false,
      signal.executedAt ? new Date(signal.executedAt).toISOString() : '',
      signal.pnl || '',
      JSON.stringify(signal.conditions || {})
    ]];

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${config.sheetName}:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Google Sheets error:', error);
      throw new Error(`Failed to append to sheet: ${error}`);
    }

    console.log('📊 Signal appended to Google Sheets successfully');
  }

  isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  clearConfig(): void {
    this.config = null;
    this.accessToken = null;
    this.tokenExpiry = 0;
    localStorage.removeItem('googleSheetsConfig');
  }

  static setStaticConfig(spreadsheetId: string, serviceAccountKey: string): void {
    GoogleSheetsService.DEFAULT_CONFIG.spreadsheetId = spreadsheetId;
    GoogleSheetsService.DEFAULT_CONFIG.serviceAccountKey = serviceAccountKey;
  }

  static getCSVHeaders(): string {
    return 'ID,Symbol,Strategy,Signal,Timestamp,Entry Price,Take Profit,Stop Loss,RSI,MACD Line,MACD Signal,MA5,MA8,MA13,MA20,MA21,MA34,MA50,Bollinger Upper,Bollinger Lower,Bollinger Middle,Current Price,Volume,Avg Volume,Volume Spike,CVD,CVD Trend,CVD Slope,Active,Executed,Executed At,PnL,Conditions';
  }
}

export const googleSheetsService = new GoogleSheetsService();
