
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { strategyConditionsManager, type StrategyConditionConfig } from '../utils/strategyConditions';
import { useToast } from '@/hooks/use-toast';

interface StrategyConfigDialogProps {
  symbol: string;
  strategy: 'scalping' | 'intraday' | 'pump';
}

const StrategyConfigDialog = ({ symbol, strategy }: StrategyConfigDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<StrategyConditionConfig>(() => 
    strategyConditionsManager.getConditions(symbol, strategy)
  );

  const handleSave = () => {
    strategyConditionsManager.updateConditions(symbol, strategy, config);
    toast({
      title: "Strategy Updated",
      description: `${strategy} strategy conditions for ${symbol} have been saved.`,
    });
    setOpen(false);
  };

  const handleReset = () => {
    strategyConditionsManager.resetConditions(symbol, strategy);
    setConfig(strategyConditionsManager.getConditions(symbol, strategy));
    toast({
      title: "Strategy Reset",
      description: `${strategy} strategy conditions for ${symbol} have been reset to defaults.`,
    });
  };

  const updateConfig = (field: keyof StrategyConditionConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Configure {strategy.charAt(0).toUpperCase() + strategy.slice(1)} Strategy - {symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Volume Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Volume Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label htmlFor="volumeMultiplier">Volume Multiplier</Label>
                <Input
                  id="volumeMultiplier"
                  type="number"
                  step="0.1"
                  value={config.volumeMultiplier}
                  onChange={(e) => updateConfig('volumeMultiplier', parseFloat(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* RSI Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">RSI Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label htmlFor="rsiMin">RSI Minimum</Label>
                <Input
                  id="rsiMin"
                  type="number"
                  min="0"
                  max="100"
                  value={config.rsiMin}
                  onChange={(e) => updateConfig('rsiMin', parseInt(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label htmlFor="rsiMax">RSI Maximum</Label>
                <Input
                  id="rsiMax"
                  type="number"
                  min="0"
                  max="100"
                  value={config.rsiMax}
                  onChange={(e) => updateConfig('rsiMax', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Moving Average Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Moving Average Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'useMA5', label: 'MA5' },
                  { key: 'useMA8', label: 'MA8' },
                  { key: 'useMA13', label: 'MA13' },
                  { key: 'useMA20', label: 'MA20' },
                  { key: 'useMA21', label: 'MA21' },
                  { key: 'useMA34', label: 'MA34' },
                  { key: 'useMA50', label: 'MA50' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={config[key as keyof StrategyConditionConfig] as boolean}
                      onCheckedChange={(checked) => updateConfig(key as keyof StrategyConditionConfig, checked)}
                    />
                    <Label htmlFor={key}>{label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* MACD Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">MACD Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="macdLineAboveSignal"
                  checked={config.macdLineAboveSignal}
                  onCheckedChange={(checked) => updateConfig('macdLineAboveSignal', checked)}
                />
                <Label htmlFor="macdLineAboveSignal">MACD Line Above Signal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="macdLineAboveZero"
                  checked={config.macdLineAboveZero}
                  onCheckedChange={(checked) => updateConfig('macdLineAboveZero', checked)}
                />
                <Label htmlFor="macdLineAboveZero">MACD Line Above Zero</Label>
              </div>
            </CardContent>
          </Card>

          {/* Bollinger Bands Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bollinger Bands Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label htmlFor="bollingerMultiplier">Bollinger Multiplier</Label>
                <Input
                  id="bollingerMultiplier"
                  type="number"
                  step="0.01"
                  value={config.bollingerMultiplier}
                  onChange={(e) => updateConfig('bollingerMultiplier', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useBollingerUpper"
                    checked={config.useBollingerUpper}
                    onCheckedChange={(checked) => updateConfig('useBollingerUpper', checked)}
                  />
                  <Label htmlFor="useBollingerUpper">Use Bollinger Upper</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useBollingerLower"
                    checked={config.useBollingerLower}
                    onCheckedChange={(checked) => updateConfig('useBollingerLower', checked)}
                  />
                  <Label htmlFor="useBollingerLower">Use Bollinger Lower</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useBollingerMiddle"
                    checked={config.useBollingerMiddle}
                    onCheckedChange={(checked) => updateConfig('useBollingerMiddle', checked)}
                  />
                  <Label htmlFor="useBollingerMiddle">Use Bollinger Middle</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CVD Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CVD Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cvdAboveZero"
                  checked={config.cvdAboveZero}
                  onCheckedChange={(checked) => updateConfig('cvdAboveZero', checked)}
                />
                <Label htmlFor="cvdAboveZero">CVD Above Zero</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cvdSlopePositive"
                  checked={config.cvdSlopePositive}
                  onCheckedChange={(checked) => updateConfig('cvdSlopePositive', checked)}
                />
                <Label htmlFor="cvdSlopePositive">CVD Slope Positive</Label>
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label htmlFor="cvdLookbackCandles">CVD Lookback Candles</Label>
                <Input
                  id="cvdLookbackCandles"
                  type="number"
                  min="1"
                  max="50"
                  value={config.cvdLookbackCandles}
                  onChange={(e) => updateConfig('cvdLookbackCandles', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Profit/Loss Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profit/Loss Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label htmlFor="takeProfitPercent">Take Profit (%)</Label>
                <Input
                  id="takeProfitPercent"
                  type="number"
                  step="0.1"
                  value={config.takeProfitPercent}
                  onChange={(e) => updateConfig('takeProfitPercent', parseFloat(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label htmlFor="stopLossPercent">Stop Loss (%)</Label>
                <Input
                  id="stopLossPercent"
                  type="number"
                  step="0.1"
                  value={config.stopLossPercent}
                  onChange={(e) => updateConfig('stopLossPercent', parseFloat(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StrategyConfigDialog;
