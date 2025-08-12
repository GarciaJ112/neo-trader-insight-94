import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { googleSheetsService } from '../services/googleSheetsService';
import { useToast } from '@/components/ui/use-toast';
const GoogleSheetsConfig = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('1FnFPo-6Zbhgci7rl6sW-Wf4w1vlf3qbio5q1QDVzS-w');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [serviceAccountKey, setServiceAccountKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    const config = googleSheetsService.getConfig();
    if (config) {
      setIsConfigured(true);
      setSpreadsheetId(config.spreadsheetId);
      setSheetName(config.sheetName);
      setServiceAccountKey(config.serviceAccountKey);
    }
  }, []);
  const handleSave = async () => {
    if (!spreadsheetId || !sheetName || !serviceAccountKey) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }
    try {
      setIsLoading(true);

      // Validate JSON
      JSON.parse(serviceAccountKey);
      googleSheetsService.setConfig({
        spreadsheetId,
        sheetName,
        serviceAccountKey
      });
      setIsConfigured(true);
      toast({
        title: 'Success',
        description: 'Google Sheets configuration saved successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Invalid service account JSON key',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleTest = async () => {
    try {
      setIsLoading(true);
      const testSignal = {
        id: 'test_' + Date.now(),
        symbol: 'BTCUSDT',
        strategy: 'test',
        signal: 'TEST',
        timestamp: Date.now(),
        entryPrice: 50000,
        takeProfit: 51000,
        stopLoss: 49000,
        indicators: {
          rsi: 45,
          macd: {
            line: 0.1,
            signal: 0.05
          },
          ma5: 50100,
          ma20: 50200,
          ma50: 50300,
          bollingerUpper: 51000,
          bollingerLower: 49000,
          currentPrice: 50000,
          volume: 1000000,
          volumeSpike: false,
          cvd: 500000,
          cvdTrend: 'bullish'
        },
        active: true,
        executed: false
      };
      await googleSheetsService.appendSignalToSheet(testSignal);
      toast({
        title: 'Success',
        description: 'Test signal sent to Google Sheets successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to send test signal: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleClear = () => {
    googleSheetsService.clearConfig();
    setIsConfigured(false);
    setServiceAccountKey('');
    toast({
      title: 'Success',
      description: 'Google Sheets configuration cleared'
    });
  };
  return <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Google Sheets Configuration
          {isConfigured && <span className="text-sm bg-green-500/20 text-green-400 px-2 py-1 rounded">
              Connected
            </span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Static Configuration</h4>
          <div className="text-sm space-y-1">
            
            <div><strong>Sheet Name:</strong> Signals</div>
            <div><strong>Status:</strong> {isConfigured ? 'Configured' : 'Awaiting JSON key and Sheet ID'}</div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
          <Input id="spreadsheetId" value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)} placeholder="Your Google Sheets ID" disabled={isLoading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sheetName">Sheet Name</Label>
          <Input id="sheetName" value={sheetName} onChange={e => setSheetName(e.target.value)} placeholder="Signals" disabled={isLoading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="serviceAccountKey">Service Account JSON Key</Label>
          <Textarea id="serviceAccountKey" value={serviceAccountKey} onChange={e => setServiceAccountKey(e.target.value)} placeholder="Paste your service account JSON key here..." rows={8} disabled={isLoading} />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isLoading} className="flex-1">
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
          
          {isConfigured && <>
              <Button onClick={handleTest} disabled={isLoading} variant="outline">
                Test Connection
              </Button>
              <Button onClick={handleClear} disabled={isLoading} variant="destructive">
                Clear
              </Button>
            </>}
        </div>

        {isConfigured && <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
            <p className="text-sm text-green-400">
              ✅ Google Sheets is configured and ready to receive trading signals
            </p>
          </div>}
      </CardContent>
    </Card>;
};
export default GoogleSheetsConfig;