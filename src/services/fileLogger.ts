interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  data?: any;
}

class FileLogger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;
  private readonly logFileName = 'trading.log';

  log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Store in localStorage for persistence
    localStorage.setItem('trading_logs', JSON.stringify(this.logs));
    
    // Also log to console for development
    console.log(`[${entry.timestamp}] ${level}: ${message}`, data || '');
  }

  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }

  logAllGreen(strategy: string, symbol: string): void {
    this.info(`${strategy.toUpperCase()}: All green - Symbol: ${symbol}`);
  }

  getLogsAsText(): string {
    return this.logs
      .map(log => `[${log.timestamp}] ${log.level}: ${log.message}${log.data ? ` | Data: ${JSON.stringify(log.data)}` : ''}`)
      .join('\n');
  }

  downloadLogs(): void {
    const logText = this.getLogsAsText();
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.logFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('trading_logs');
  }

  loadLogs(): void {
    const stored = localStorage.getItem('trading_logs');
    if (stored) {
      try {
        this.logs = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load logs from localStorage:', error);
        this.logs = [];
      }
    }
  }
}

export const fileLogger = new FileLogger();
// Load existing logs on initialization
fileLogger.loadLogs();
