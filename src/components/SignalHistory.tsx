
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { signalPersistence, type TradingSignal } from '../utils/signalPersistence';
import GoogleSheetsConfig from './GoogleSheetsConfig';

const SignalHistory = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'executed'>('all');
  const [strategyFilter, setStrategyFilter] = useState<'all' | 'scalping' | 'intraday' | 'pump'>('all');

  useEffect(() => {
    loadSignals();
    
    // Refresh signals every 10 seconds
    const interval = setInterval(loadSignals, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSignals = () => {
    const history = signalPersistence.getSignalHistory();
    setSignals(history.signals);
  };

  const filteredSignals = signals.filter(signal => {
    const statusMatch = filter === 'all' || 
      (filter === 'active' && signal.active && !signal.executed) ||
      (filter === 'executed' && signal.executed);
    
    const strategyMatch = strategyFilter === 'all' || signal.strategy === strategyFilter;
    
    return statusMatch && strategyMatch;
  });

  const handleDeactivateSignal = (signalId: string) => {
    signalPersistence.deactivateSignal(signalId);
    loadSignals();
  };

  const handleMarkExecuted = (signalId: string, executionPrice: number) => {
    signalPersistence.markSignalExecuted(signalId, executionPrice);
    loadSignals();
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSignalColor = (signal: TradingSignal) => {
    if (signal.executed) return 'bg-gray-500/20';
    if (signal.signal === 'LONG') return 'bg-green-500/20';
    if (signal.signal === 'SHORT') return 'bg-red-500/20';
    return 'bg-yellow-500/20';
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">Signal History</TabsTrigger>
          <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="space-y-4">
          <div className="p-4 neo-border rounded-lg bg-card/50">
            <h3 className="text-lg font-semibold text-primary mb-4">Signal History & Management</h3>
            
            {/* Filters */}
            <div className="flex gap-4 mb-4 flex-wrap">
              <div className="flex gap-2">
                <Button 
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All ({signals.length})
                </Button>
                <Button 
                  variant={filter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('active')}
                >
                  Active ({signals.filter(s => s.active && !s.executed).length})
                </Button>
                <Button 
                  variant={filter === 'executed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('executed')}
                >
                  Executed ({signals.filter(s => s.executed).length})
                </Button>
              </div>
              
              <div className="flex gap-2">
                <select 
                  value={strategyFilter} 
                  onChange={(e) => setStrategyFilter(e.target.value as any)}
                  className="px-3 py-1 rounded border bg-background"
                >
                  <option value="all">All Strategies</option>
                  <option value="scalping">Scalping</option>
                  <option value="intraday">Intraday</option>
                  <option value="pump">Pump Mode</option>
                </select>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => signalPersistence.clearHistory()}
              >
                Clear History
              </Button>
            </div>

            {/* Signals Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>TP/SL</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSignals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No signals found matching the current filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSignals.slice(0, 50).map((signal) => (
                      <TableRow key={signal.id} className={getSignalColor(signal)}>
                        <TableCell className="font-mono text-xs">
                          {formatTimestamp(signal.timestamp)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {signal.symbol}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            signal.strategy === 'scalping' ? 'bg-blue-500/30 text-blue-400' :
                            signal.strategy === 'intraday' ? 'bg-purple-500/30 text-purple-400' :
                            'bg-orange-500/30 text-orange-400'
                          }`}>
                            {signal.strategy.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            signal.signal === 'LONG' ? 'bg-green-500/30 text-green-400' :
                            signal.signal === 'SHORT' ? 'bg-red-500/30 text-red-400' :
                            'bg-yellow-500/30 text-yellow-400'
                          }`}>
                            {signal.signal}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono">
                          ${signal.entryPrice.toFixed(4)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div>TP: ${signal.takeProfit.toFixed(4)}</div>
                          <div>SL: ${signal.stopLoss.toFixed(4)}</div>
                        </TableCell>
                        <TableCell className={`font-mono ${
                          signal.pnl && signal.pnl > 0 ? 'text-green-400' : 
                          signal.pnl && signal.pnl < 0 ? 'text-red-400' : 
                          'text-muted-foreground'
                        }`}>
                          {signal.pnl ? `$${signal.pnl.toFixed(4)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            signal.executed ? 'bg-gray-500/30 text-gray-400' :
                            signal.active ? 'bg-green-500/30 text-green-400' :
                            'bg-red-500/30 text-red-400'
                          }`}>
                            {signal.executed ? 'EXECUTED' : signal.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {signal.active && !signal.executed && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeactivateSignal(signal.id)}
                                >
                                  Deactivate
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const price = prompt('Enter execution price:');
                                    if (price) handleMarkExecuted(signal.id, parseFloat(price));
                                  }}
                                >
                                  Mark Executed
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="sheets">
          <GoogleSheetsConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignalHistory;
