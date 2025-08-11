
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { signalPersistence } from '../utils/signalPersistence';
import type { IndicatorValues } from '../utils/indicators';

interface PumpStrategyProps {
  symbol: string;
  currentPrice: number;
  indicators: IndicatorValues;
}

const PumpStrategy = ({ symbol, currentPrice, indicators }: PumpStrategyProps) => {
  // Add safety checks for indicators
  if (!indicators) {
    console.error('❌ PumpStrategy received undefined indicators');
    return (
      <div className="p-4 neo-border rounded-lg bg-card/50">
        <p className="text-muted-foreground">Loading indicator data...</p>
      </div>
    );
  }

  // Relaxed pump mode strategy conditions
  const checkPumpConditions = () => {
    const entryPrice = currentPrice;
    const takeProfit = entryPrice * 1.03; // +3% for pump mode
    const stopLoss = entryPrice * 0.99; // -1% stop loss
    
    // Step 1: Volume (> AvgVolume × 2) - Relaxed from 2.5x
    const volumeValue = indicators.volume || 0;
    const avgVolumeValue = indicators.avgVolume || 0;
    const volumeCondition = volumeValue > avgVolumeValue * 2;
    
    // Step 2: RSI (50 < RSI < 85)
    const rsiValue = indicators.rsi || 0;
    const rsiCondition = rsiValue > 50 && rsiValue < 85;
    
    // Step 3: Moving Averages (Price > EMA13 AND EMA5 > EMA13)
    const ma5Value = indicators.ma5 || 0;
    const ma13Value = indicators.ma13 || 0;
    const maCondition = currentPrice > ma13Value && ma5Value > ma13Value;
    
    // Step 4: MACD (MACD Line > Signal AND MACD Line > 0)
    const macdLineValue = indicators.macd?.line || 0;
    const macdSignalValue = indicators.macd?.signal || 0;
    const macdCondition = macdLineValue > macdSignalValue && macdLineValue > 0;
    
    // Step 5: CVD (> 0 with slope > 0, last 3-5 candles)
    const cvdValue = indicators.cvd || 0;
    const cvdSlopeValue = indicators.cvdSlope || 0;
    const cvdCondition = cvdValue > 0 && cvdSlopeValue > 0;
    
    // Step 6: Price breakout above Bollinger Middle
    const bollingerMiddleValue = indicators.bollingerMiddle || 0;
    const bollingerCondition = currentPrice > bollingerMiddleValue;
    
    const conditions = {
      volume: volumeCondition,
      rsi: rsiCondition,
      movingAverages: maCondition,
      macd: macdCondition,
      cvd: cvdCondition,
      bollinger: bollingerCondition
    };
    
    const allConditionsMet = Object.values(conditions).every(Boolean);
    
    // Enhanced logging for condition proximity
    if (!allConditionsMet) {
      const proximityLogs = [];
      if (!volumeCondition) proximityLogs.push(`Volume: ${volumeValue.toLocaleString()} vs Avg*2=${(avgVolumeValue * 2).toLocaleString()}`);
      if (!rsiCondition) proximityLogs.push(`RSI: ${rsiValue.toFixed(2)} (need 50-85)`);
      if (!maCondition) proximityLogs.push(`MA: Price=${currentPrice.toFixed(4)} vs EMA13=${ma13Value.toFixed(4)}, EMA5=${ma5Value.toFixed(4)} vs EMA13=${ma13Value.toFixed(4)}`);
      if (!macdCondition) proximityLogs.push(`MACD: Line=${macdLineValue.toFixed(6)} vs Signal=${macdSignalValue.toFixed(6)} (Line must be > Signal and > 0)`);
      if (!cvdCondition) proximityLogs.push(`CVD: ${cvdValue.toLocaleString()} (need > 0), Slope: ${cvdSlopeValue.toFixed(2)} (need > 0)`);
      if (!bollingerCondition) proximityLogs.push(`BB: Price=${currentPrice.toFixed(4)} vs BBMiddle=${bollingerMiddleValue.toFixed(4)}`);
      
      console.log(`📊 ${symbol} Pump conditions not met:`, proximityLogs.join(', '));
    } else {
      console.log(`🚀 ${symbol} Pump ALL CONDITIONS MET - Generating LONG signal!`);
    }
    
    return {
      entryPrice,
      takeProfit,
      stopLoss,
      conditions,
      allConditionsMet,
      signal: allConditionsMet ? 'LONG' : 'WAIT'
    };
  };

  const strategy = checkPumpConditions();

  // Save signal if conditions are met
  if (strategy.allConditionsMet) {
    const signalId = signalPersistence.generateSignalId(symbol, 'pump', Date.now());
    const signal = {
      id: signalId,
      symbol,
      strategy: 'pump' as const,
      signal: strategy.signal as 'LONG',
      timestamp: Date.now(),
      entryPrice: strategy.entryPrice,
      takeProfit: strategy.takeProfit,
      stopLoss: strategy.stopLoss,
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
      conditions: strategy.conditions,
      active: true
    };
    
    console.log(`💾 Saving pump signal for ${symbol}:`, signal);
    signalPersistence.saveSignal(signal);
  }

  return (
    <div className="space-y-4">
      <div className="p-4 neo-border rounded-lg bg-card/50">
        <h3 className="text-lg font-semibold text-primary mb-4">Pump Mode Strategy - {symbol}</h3>
        
        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* Volume Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.volume ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">Volume &gt; 2x Avg</span>
              <span className="font-mono">{(indicators.volume || 0).toLocaleString()} / {((indicators.avgVolume || 0) * 2).toLocaleString()}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.volume ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.volume ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* RSI Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.rsi ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">RSI (50-85)</span>
              <span className="font-mono">{(indicators.rsi || 0).toFixed(2)}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.rsi ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.rsi ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* Moving Averages Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.movingAverages ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">Price &gt; EMA13 &amp; EMA5 &gt; EMA13</span>
              <span className="font-mono">{currentPrice.toFixed(4)} / {(indicators.ma13 || 0).toFixed(4)} / {(indicators.ma5 || 0).toFixed(4)}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.movingAverages ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.movingAverages ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* MACD Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.macd ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">MACD Line &gt; Signal &amp; &gt; 0</span>
              <span className="font-mono">{(indicators.macd?.line || 0).toFixed(6)} / {(indicators.macd?.signal || 0).toFixed(6)}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.macd ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.macd ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* CVD Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.cvd ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">CVD &gt; 0 &amp; Slope &gt; 0 (3-5 candles)</span>
              <span className="font-mono">{(indicators.cvd || 0).toLocaleString()} / Slope: {(indicators.cvdSlope || 0).toFixed(2)}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.cvd ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.cvd ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* Bollinger Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.bollinger ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">Price &gt; BB Middle</span>
              <span className="font-mono">{currentPrice.toFixed(4)} &gt; {(indicators.bollingerMiddle || 0).toFixed(4)}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.bollinger ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.bollinger ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </div>

        {/* Entry Table */}
        {strategy.allConditionsMet && (
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <h4 className="text-lg font-semibold text-green-400 mb-3">🚀 PUMP LONG POSITION SIGNAL</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Entry Price</TableCell>
                  <TableCell>${strategy.entryPrice.toFixed(4)}</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Take Profit (+3%)</TableCell>
                  <TableCell>${strategy.takeProfit.toFixed(4)}</TableCell>
                  <TableCell className="text-green-400">+${(strategy.takeProfit - strategy.entryPrice).toFixed(4)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Stop Loss (-1%)</TableCell>
                  <TableCell>${strategy.stopLoss.toFixed(4)}</TableCell>
                  <TableCell className="text-red-400">-${(strategy.entryPrice - strategy.stopLoss).toFixed(4)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PumpStrategy;
