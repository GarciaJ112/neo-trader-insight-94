
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signalPersistence } from '../utils/signalPersistence';
import { signalDebouncer } from '../utils/signalDebouncer';
import { googleSheetsService } from '../services/googleSheetsService';
import type { IndicatorValues } from '../utils/indicators';

interface SignalDiagnosticsProps {
  symbol: string;
  indicators: IndicatorValues;
  currentPrice: number;
}

const SignalDiagnostics = ({ symbol, indicators, currentPrice }: SignalDiagnosticsProps) => {
  const [signalStats, setSignalStats] = useState({ totalPending: 0, signalsByStrategy: {} });
  const [isGoogleSheetsConnected, setIsGoogleSheetsConnected] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setSignalStats(signalDebouncer.getSignalStats());
      setIsGoogleSheetsConnected(googleSheetsService.isConfigured());
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const generateTestSignal = (strategy: 'scalping' | 'intraday' | 'pump') => {
    const signalId = signalPersistence.generateSignalId(symbol, strategy, Date.now());
    const signal = {
      id: signalId,
      symbol,
      strategy: strategy,
      signal: 'LONG' as const,
      timestamp: Date.now(),
      entryPrice: currentPrice,
      takeProfit: currentPrice * (strategy === 'pump' ? 1.03 : strategy === 'intraday' ? 1.02 : 1.005),
      stopLoss: currentPrice * 0.99,
      indicators: {
        rsi: indicators.rsi || 0,
        macd: indicators.macd || { macd: 0, signal: 0, line: 0 },
        ma5: indicators.ma5 || 0,
        ma8: indicators.ma8 || 0,
        ma13: indicators.ma13 || 0,
        ma20: indicators.ma20 || 0,
        ma21: indicators.ma21 || 0,
        ma34: indicators.ma34 || 0,
        ma50: indicators.ma50 || 0,
        bollingerUpper: indicators.bollingerUpper || 0,
        bollingerLower: indicators.bollingerLower || 0,
        currentPrice,
        volume: indicators.volume || 0,
        volumeSpike: indicators.volumeSpike || false,
        cvd: indicators.cvd || 0,
        cvdTrend: indicators.cvdTrend || 'neutral'
      },
      conditions: { test: true },
      active: true
    };

    console.log(`🧪 Generating test ${strategy} signal for ${symbol}`);
    signalPersistence.saveSignal(signal);
  };

  const getConditionProximity = (strategy: string) => {
    if (!indicators) return 'No data';

    switch (strategy) {
      case 'scalping':
        const scalpingConditions = [
          { name: 'RSI', current: indicators.rsi || 0, target: '< 40', met: (indicators.rsi || 0) < 40 },
          { name: 'Volume', current: (indicators.volume || 0) / (indicators.avgVolume || 1), target: '> 1.5x', met: (indicators.volume || 0) > (indicators.avgVolume || 0) * 1.5 },
          { name: 'MACD', current: (indicators.macd?.line || 0) - (indicators.macd?.signal || 0), target: 'Line > Signal', met: (indicators.macd?.line || 0) > (indicators.macd?.signal || 0) },
        ];
        const scalpingMet = scalpingConditions.filter(c => c.met).length;
        return `${scalpingMet}/${scalpingConditions.length} conditions met`;

      case 'intraday':
        const intradayConditions = [
          { name: 'RSI', current: indicators.rsi || 0, target: '35-65', met: (indicators.rsi || 0) > 35 && (indicators.rsi || 0) < 65 },
          { name: 'Volume', current: (indicators.volume || 0) / (indicators.avgVolume || 1), target: '> 1.2x', met: (indicators.volume || 0) > (indicators.avgVolume || 0) * 1.2 },
          { name: 'MACD', current: (indicators.macd?.line || 0) - (indicators.macd?.signal || 0), target: 'Line > Signal', met: (indicators.macd?.line || 0) > (indicators.macd?.signal || 0) },
        ];
        const intradayMet = intradayConditions.filter(c => c.met).length;
        return `${intradayMet}/${intradayConditions.length} conditions met`;

      case 'pump':
        const pumpConditions = [
          { name: 'RSI', current: indicators.rsi || 0, target: '50-85', met: (indicators.rsi || 0) > 50 && (indicators.rsi || 0) < 85 },
          { name: 'Volume', current: (indicators.volume || 0) / (indicators.avgVolume || 1), target: '> 2x', met: (indicators.volume || 0) > (indicators.avgVolume || 0) * 2 },
          { name: 'Price vs BB', current: currentPrice / (indicators.bollingerMiddle || 1), target: '> BB Middle', met: currentPrice > (indicators.bollingerMiddle || 0) },
        ];
        const pumpMet = pumpConditions.filter(c => c.met).length;
        return `${pumpMet}/${pumpConditions.length} conditions met`;

      default:
        return 'Unknown strategy';
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Signal Diagnostics - {symbol}
          <div className="flex gap-2">
            <Badge variant={isGoogleSheetsConnected ? "default" : "destructive"}>
              {isGoogleSheetsConnected ? "📊 Sheets Connected" : "📊 Sheets Disconnected"}
            </Badge>
            <Badge variant="outline">
              {signalStats.totalPending} Pending
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strategy Condition Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['scalping', 'intraday', 'pump'].map(strategy => (
            <div key={strategy} className="p-3 rounded-lg border bg-card/50">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium capitalize">{strategy}</h4>
                <Badge variant="outline" className="text-xs">
                  {signalStats.signalsByStrategy[strategy] || 0} pending
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {getConditionProximity(strategy)}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateTestSignal(strategy as any)}
                className="w-full"
              >
                Generate Test Signal
              </Button>
            </div>
          ))}
        </div>

        {/* Key Indicators Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-2 rounded border">
            <div className="text-sm text-muted-foreground">RSI</div>
            <div className="font-mono text-lg">{(indicators.rsi || 0).toFixed(1)}</div>
          </div>
          <div className="text-center p-2 rounded border">
            <div className="text-sm text-muted-foreground">Volume Ratio</div>
            <div className="font-mono text-lg">
              {((indicators.volume || 0) / (indicators.avgVolume || 1)).toFixed(1)}x
            </div>
          </div>
          <div className="text-center p-2 rounded border">
            <div className="text-sm text-muted-foreground">MACD</div>
            <div className="font-mono text-lg">
              {((indicators.macd?.line || 0) - (indicators.macd?.signal || 0)).toFixed(4)}
            </div>
          </div>
          <div className="text-center p-2 rounded border">
            <div className="text-sm text-muted-foreground">CVD Slope</div>
            <div className="font-mono text-lg">{(indicators.cvdSlope || 0).toFixed(2)}</div>
          </div>
        </div>

        {/* Real-time Logging Status */}
        <div className="text-xs text-muted-foreground">
          💡 Check browser console for detailed condition logging and signal generation status
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalDiagnostics;
