
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TradingPairTab from './TradingPairTab';

// Updated to include ETHUSDT futures
const TRADING_PAIRS = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'SOLUSDT', 'DOGEUSDT'];

const TradingDashboard = () => {
  const [activeTab, setActiveTab] = useState(TRADING_PAIRS[0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary neo-glow mb-2">
            Dashboard
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 bg-card/50 neo-border p-1">
            {TRADING_PAIRS.map(pair => (
              <TabsTrigger 
                key={pair} 
                value={pair} 
                className={`text-sm font-medium transition-all duration-300 data-[state=active]:tab-active ${
                  activeTab === pair ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {pair.replace('USDT', '/USDT')}
              </TabsTrigger>
            ))}
          </TabsList>

          {TRADING_PAIRS.map(pair => (
            <TabsContent key={pair} value={pair} className="mt-0">
              <div className="neo-border rounded-xl p-6 bg-card/30 backdrop-blur-sm">
                <TradingPairTab symbol={pair} isActive={activeTab === pair} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default TradingDashboard;
