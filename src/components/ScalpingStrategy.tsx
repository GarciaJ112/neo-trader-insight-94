import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { signalPersistence } from '../utils/signalPersistence';
import type { IndicatorValues } from '../utils/indicators';
import { strategyTracker } from '../utils/strategyTracker';

interface ScalpingStrategyProps {
  symbol: string;
  currentPrice: number;
  indicators: IndicatorValues;
}

const ScalpingStrategy = ({ symbol, currentPrice, indicators }: ScalpingStrategyProps) => {
  // Add safety checks for indicators
  if (!indicators) {
    console.error('❌ ScalpingStrategy received undefined indicators');
    return (
      <div className="p-4 neo-border rounded-lg bg-card/50">
        <p className="text-muted-foreground">Loading indicator data...</p>
      </div>
    );
  }

  // Relaxed scalping strategy conditions
  const checkScalpingConditions = () => {
    const entryPrice = currentPrice;
    const takeProfit = entryPrice * 1.005; // +0.5% for scalping
    const stopLoss = entryPrice * 0.9975; // -0.25% stop loss
    
    // Step 1: Check RSI (< 40) - Relaxed from 35
    const rsiValue = indicators.rsi || 0;
    const rsiCondition = rsiValue < 40;
    
    // Step 2: Check Moving Averages (EMA8 > EMA21)
    const ma8Value = indicators.ma8 || 0;
    const ma21Value = indicators.ma21 || 0;
    const maCondition = ma8Value > ma21Value;
    
    // Step 3: Check Bollinger Bands (Price ≤ BBLower × 1.01) - Relaxed multiplier
    const bollingerLowerValue = indicators.bollingerLower || 0;
    const bollingerCondition = currentPrice <= bollingerLowerValue * 1.01;
    
    // Step 4: Check MACD (MACD Line > Signal Line)
    const macdLineValue = indicators.macd?.line || 0;
    const macdSignalValue = indicators.macd?.signal || 0;
    const macdCondition = macdLineValue > macdSignalValue;
    
    // Step 5: Check Volume (> AvgVolume × 1.5) - Relaxed from 2x
    const volumeValue = indicators.volume || 0;
    const avgVolumeValue = indicators.avgVolume || 0;
    const volumeCondition = volumeValue > avgVolumeValue * 1.5;
    
    // Step 6: Check CVD Slope (> 0, last 5 candles)
    const cvdSlopeValue = indicators.cvdSlope || 0;
    const cvdCondition = cvdSlopeValue > 0;
    
    const conditions = {
      rsi: rsiCondition,
      movingAverages: maCondition,
      bollingerBands: bollingerCondition,
      macd: macdCondition,
      volume: volumeCondition,
      cvd: cvdCondition
    };
    
    const allConditionsMet = Object.values(conditions).every(Boolean);
    
    // Enhanced logging for condition proximity
    if (!allConditionsMet) {
      const proximityLogs = [];
      if (!rsiCondition) proximityLogs.push(`RSI: ${rsiValue.toFixed(2)} (need < 40)`);
      if (!maCondition) proximityLogs.push(`MA: EMA8=${ma8Value.toFixed(4)} vs EMA21=${ma21Value.toFixed(4)} (need EMA8 > EMA21)`);
      if (!bollingerCondition) proximityLogs.push(`BB: Price=${currentPrice.toFixed(4)} vs BBLower*1.01=${(bollingerLowerValue * 1.01).toFixed(4)}`);
      if (!macdCondition) proximityLogs.push(`MACD: Line=${macdLineValue.toFixed(6)} vs Signal=${macdSignalValue.toFixed(6)}`);
      if (!volumeCondition) proximityLogs.push(`Volume: ${volumeValue.toLocaleString()} vs Avg*1.5=${(avgVolumeValue * 1.5).toLocaleString()}`);
      if (!cvdCondition) proximityLogs.push(`CVD Slope: ${cvdSlopeValue.toFixed(2)} (need > 0)`);
      
      console.log(`📊 ${symbol} Scalping conditions not met:`, proximityLogs.join(', '));
    } else {
      console.log(`🚀 ${symbol} Scalping ALL CONDITIONS MET - Generating LONG signal!`);
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

  const strategy = checkScalpingConditions();

  // Track strategy conditions for "all green" detection
  React.useEffect(() => {
    strategyTracker.updateConditions(symbol, 'scalping', strategy.conditions);
  }, [symbol, strategy.conditions]);

  // Save signal if conditions are met
  if (strategy.allConditionsMet) {
    const signalId = signalPersistence.generateSignalId(symbol, 'scalping', Date.now());
    const signal = {
      id: signalId,
      symbol,
      strategy: 'scalping' as const,
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
        cvdTrend: indicators.cvdTrend || 'neutral',
        cvdSlope: indicators.cvdSlope || 0
      },
      conditions: strategy.conditions,
      active: true
    };
    
    console.log(`💾 Saving scalping signal for ${symbol}:`, signal);
    signalPersistence.saveSignal(signal);
  }

  return (
    <div className="space-y-4">
      <div className="p-4 neo-border rounded-lg bg-card/50">
        <h3 className="text-lg font-semibold text-primary mb-4">Scalping Strategy - {symbol}</h3>
        
        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* RSI Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.rsi ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">RSI &lt; 40</span>
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
              <span className="font-medium">EMA8 &gt; EMA21</span>
              <span className="font-mono">{(indicators.ma8 || 0).toFixed(4)} / {(indicators.ma21 || 0).toFixed(4)}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.movingAverages ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.movingAverages ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* Bollinger Bands Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.bollingerBands ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">Price ≤ BBLower × 1.01</span>
              <span className="font-mono">{currentPrice.toFixed(4)} ≤ {((indicators.bollingerLower || 0) * 1.01).toFixed(4)}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.bollingerBands ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.bollingerBands ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* MACD Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.macd ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">MACD Line &gt; Signal</span>
              <span className="font-mono">{(indicators.macd?.line || 0).toFixed(6)} / {(indicators.macd?.signal || 0).toFixed(6)}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.macd ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.macd ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* Volume Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.volume ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">Volume &gt; 1.5x Avg</span>
              <span className="font-mono">{(indicators.volume || 0).toLocaleString()} / {((indicators.avgVolume || 0) * 1.5).toLocaleString()}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.volume ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.volume ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* CVD Slope Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.cvd ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">CVD Slope &gt; 0 (5 candles)</span>
              <span className="font-mono">{(indicators.cvdSlope || 0).toFixed(2)} ({(indicators.cvd || 0).toLocaleString()})</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.cvd ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.cvd ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </div>

        {/* Entry Table */}
        {strategy.allConditionsMet && (
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <h4 className="text-lg font-semibold text-green-400 mb-3">🚀 SCALPING LONG POSITION SIGNAL</h4>
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
                  <TableCell>Take Profit (+0.5%)</TableCell>
                  <TableCell>${strategy.takeProfit.toFixed(4)}</TableCell>
                  <TableCell className="text-green-400">+${(strategy.takeProfit - strategy.entryPrice).toFixed(4)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Stop Loss (-0.25%)</TableCell>
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

export default ScalpingStrategy;
