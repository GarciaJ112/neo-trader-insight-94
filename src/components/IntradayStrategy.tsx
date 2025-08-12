
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { signalPersistence } from '../utils/signalPersistence';
import type { IndicatorValues } from '../utils/indicators';
import { strategyConditionsManager } from '../utils/strategyConditions';
import StrategyConfigDialog from './StrategyConfigDialog';

interface IntradayStrategyProps {
  symbol: string;
  currentPrice: number;
  indicators: IndicatorValues;
}

const IntradayStrategy = ({ symbol, currentPrice, indicators }: IntradayStrategyProps) => {
  // Add safety checks for indicators
  if (!indicators) {
    console.error('❌ IntradayStrategy received undefined indicators');
    return (
      <div className="p-4 neo-border rounded-lg bg-card/50">
        <p className="text-muted-foreground">Loading indicator data...</p>
      </div>
    );
  }

  // Get configurable conditions for this symbol
  const config = strategyConditionsManager.getConditions(symbol, 'intraday');

  // Dynamic intraday strategy conditions based on configuration
  const checkIntradayConditions = () => {
    const entryPrice = currentPrice;
    const takeProfit = entryPrice * (1 + config.takeProfitPercent / 100);
    const stopLoss = entryPrice * (1 - config.stopLossPercent / 100);
    
    // Step 1: Check Bollinger Bands based on config
    let bollingerCondition = true;
    if (config.useBollingerLower) {
      const bollingerLowerValue = indicators.bollingerLower || 0;
      bollingerCondition = currentPrice <= bollingerLowerValue * config.bollingerMultiplier;
    }
    
    // Step 2: Check MACD based on config
    let macdCondition = true;
    if (config.macdLineAboveSignal) {
      const macdLineValue = indicators.macd?.line || 0;
      const macdSignalValue = indicators.macd?.signal || 0;
      macdCondition = macdLineValue > macdSignalValue;
      
      if (config.macdLineAboveZero) {
        macdCondition = macdCondition && macdLineValue > 0;
      }
    }
    
    // Step 3: Check RSI based on config
    const rsiValue = indicators.rsi || 0;
    const rsiCondition = rsiValue >= config.rsiMin && rsiValue <= config.rsiMax;
    
    // Step 4: Check Moving Averages based on config
    let maCondition = true;
    if (config.useMA20 && config.useMA34) {
      const ma20Value = indicators.ma20 || 0;
      const ma34Value = indicators.ma34 || 0;
      maCondition = currentPrice > ma34Value && ma20Value > ma34Value;
    }
    
    // Step 5: Check Volume based on config
    const volumeValue = indicators.volume || 0;
    const avgVolumeValue = indicators.avgVolume || 0;
    const volumeCondition = volumeValue > avgVolumeValue * config.volumeMultiplier;
    
    // Step 6: Check CVD based on config
    let cvdCondition = true;
    if (config.cvdSlopePositive) {
      const cvdSlopeValue = indicators.cvdSlope || 0;
      cvdCondition = cvdSlopeValue > 0;
      
      if (config.cvdAboveZero) {
        const cvdValue = indicators.cvd || 0;
        cvdCondition = cvdCondition && cvdValue > 0;
      }
    }
    
    const conditions = {
      bollingerBands: bollingerCondition,
      macd: macdCondition,
      rsi: rsiCondition,
      movingAverages: maCondition,
      volume: volumeCondition,
      cvd: cvdCondition
    };
    
    const allConditionsMet = Object.values(conditions).every(Boolean);
    
    // Enhanced logging for condition proximity
    if (!allConditionsMet) {
      const proximityLogs = [];
      if (!bollingerCondition && config.useBollingerLower) {
        const bollingerLowerValue = indicators.bollingerLower || 0;
        proximityLogs.push(`BB: Price=${currentPrice.toFixed(4)} vs BBLower*${config.bollingerMultiplier}=${(bollingerLowerValue * config.bollingerMultiplier).toFixed(4)}`);
      }
      if (!macdCondition && config.macdLineAboveSignal) {
        const macdLineValue = indicators.macd?.line || 0;
        const macdSignalValue = indicators.macd?.signal || 0;
        proximityLogs.push(`MACD: Line=${macdLineValue.toFixed(6)} vs Signal=${macdSignalValue.toFixed(6)}`);
      }
      if (!rsiCondition) proximityLogs.push(`RSI: ${rsiValue.toFixed(2)} (need ${config.rsiMin}-${config.rsiMax})`);
      if (!maCondition && config.useMA20 && config.useMA34) {
        const ma20Value = indicators.ma20 || 0;
        const ma34Value = indicators.ma34 || 0;
        proximityLogs.push(`MA: Price=${currentPrice.toFixed(4)} vs EMA34=${ma34Value.toFixed(4)}, EMA20=${ma20Value.toFixed(4)} vs EMA34=${ma34Value.toFixed(4)}`);
      }
      if (!volumeCondition) proximityLogs.push(`Volume: ${volumeValue.toLocaleString()} vs Avg*${config.volumeMultiplier}=${(avgVolumeValue * config.volumeMultiplier).toLocaleString()}`);
      if (!cvdCondition && config.cvdSlopePositive) {
        const cvdValue = indicators.cvd || 0;
        const cvdSlopeValue = indicators.cvdSlope || 0;
        proximityLogs.push(`CVD: ${cvdValue.toLocaleString()} (need > 0), Slope: ${cvdSlopeValue.toFixed(2)} (need > 0)`);
      }
      
      console.log(`📊 ${symbol} Intraday conditions not met:`, proximityLogs.join(', '));
    } else {
      console.log(`🚀 ${symbol} Intraday ALL CONDITIONS MET - Generating LONG signal!`);
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

  const strategy = checkIntradayConditions();

  // Save signal if conditions are met
  if (strategy.allConditionsMet) {
    const signalId = signalPersistence.generateSignalId(symbol, 'intraday', Date.now());
    const signal = {
      id: signalId,
      symbol,
      strategy: 'intraday' as const,
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
    
    console.log(`💾 Saving intraday signal for ${symbol}:`, signal);
    signalPersistence.saveSignal(signal);
  }

  return (
    <div className="space-y-4">
      <div className="p-4 neo-border rounded-lg bg-card/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-primary">Intraday Strategy - {symbol}</h3>
          <StrategyConfigDialog symbol={symbol} strategy="intraday" />
        </div>
        
        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* Bollinger Bands Check */}
          {config.useBollingerLower && (
            <div className={`p-3 rounded-lg ${strategy.conditions.bollingerBands ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">Price ≤ BBLower × {config.bollingerMultiplier}</span>
                <span className="font-mono">{currentPrice.toFixed(4)} ≤ {((indicators.bollingerLower || 0) * config.bollingerMultiplier).toFixed(4)}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  strategy.conditions.bollingerBands ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
                }`}>
                  {strategy.conditions.bollingerBands ? '✓' : '✗'}
                </span>
              </div>
            </div>
          )}

          {/* MACD Check */}
          {config.macdLineAboveSignal && (
            <div className={`p-3 rounded-lg ${strategy.conditions.macd ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">MACD Line &gt; Signal{config.macdLineAboveZero ? ' &amp; &gt; 0' : ''}</span>
                <span className="font-mono">{(indicators.macd?.line || 0).toFixed(6)} / {(indicators.macd?.signal || 0).toFixed(6)}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  strategy.conditions.macd ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
                }`}>
                  {strategy.conditions.macd ? '✓' : '✗'}
                </span>
              </div>
            </div>
          )}

          {/* RSI Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.rsi ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">RSI ({config.rsiMin}-{config.rsiMax})</span>
              <span className="font-mono">{(indicators.rsi || 0).toFixed(2)}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.rsi ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.rsi ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* Moving Averages Check */}
          {config.useMA20 && config.useMA34 && (
            <div className={`p-3 rounded-lg ${strategy.conditions.movingAverages ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">Price &gt; EMA34 &amp; EMA20 &gt; EMA34</span>
                <span className="font-mono">{currentPrice.toFixed(4)} / {(indicators.ma34 || 0).toFixed(4)} / {(indicators.ma20 || 0).toFixed(4)}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  strategy.conditions.movingAverages ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
                }`}>
                  {strategy.conditions.movingAverages ? '✓' : '✗'}
                </span>
              </div>
            </div>
          )}

          {/* Volume Check */}
          <div className={`p-3 rounded-lg ${strategy.conditions.volume ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">Volume &gt; {config.volumeMultiplier}x Avg</span>
              <span className="font-mono">{(indicators.volume || 0).toLocaleString()} / {((indicators.avgVolume || 0) * config.volumeMultiplier).toLocaleString()}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.conditions.volume ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}>
                {strategy.conditions.volume ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* CVD Check */}
          {config.cvdSlopePositive && (
            <div className={`p-3 rounded-lg ${strategy.conditions.cvd ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">CVD Slope &gt; 0 ({config.cvdLookbackCandles} candles){config.cvdAboveZero ? ' &amp; CVD &gt; 0' : ''}</span>
                <span className="font-mono">{(indicators.cvdSlope || 0).toFixed(2)} ({(indicators.cvd || 0).toLocaleString()})</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  strategy.conditions.cvd ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
                }`}>
                  {strategy.conditions.cvd ? '✓' : '✗'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Entry Table */}
        {strategy.allConditionsMet && (
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <h4 className="text-lg font-semibold text-green-400 mb-3">🚀 INTRADAY LONG POSITION SIGNAL</h4>
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
                  <TableCell>Take Profit (+{config.takeProfitPercent}%)</TableCell>
                  <TableCell>${strategy.takeProfit.toFixed(4)}</TableCell>
                  <TableCell className="text-green-400">+${(strategy.takeProfit - strategy.entryPrice).toFixed(4)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Stop Loss (-{config.stopLossPercent}%)</TableCell>
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

export default IntradayStrategy;
