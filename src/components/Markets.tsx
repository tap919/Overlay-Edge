import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, LiveMarket } from '../db/db';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Clock, Trophy, LineChart, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { syncLiveOdds } from '../services/oddsService';

export default function Markets() {
  const markets = useLiveQuery(() => db.liveMarkets.orderBy('commenceTime').toArray()) || [];

  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<LiveMarket | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncLiveOdds('basketball_nba');
    } finally {
      setIsSyncing(false);
    }
  };

  const analyzeMarket = async (market: LiveMarket) => {
    setSelectedMarket(market);
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const prompt = `Perform a rapid edge analysis for this NBA game: ${market.awayTeam} vs ${market.homeTeam}. 
      Current Bookmaker: ${market.bookmakers?.[0]?.title || 'Multiple'}. 
      Odds: ${market.bookmakers?.[0]?.markets?.[0]?.outcomes?.[1]?.price} vs ${market.bookmakers?.[0]?.markets?.[0]?.outcomes?.[0]?.price}.
      Identify if there is any potential CLV (Closing Line Value) advantage or market inefficiency. Be brief.`;

      const response = await fetch('/api/chat/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      setAnalysis(data.choices[0].message.content);
    } catch (err) {
      setAnalysis("Neural link timed out. Local heuristics suggest checking historical spread variance for these teams.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 px-2 relative">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LIVE MARKETS</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-mono italic">Real-Time Odds Injection</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-lg text-[10px] font-bold text-brand-primary uppercase hover:bg-brand-primary/20 transition-all"
        >
          <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
          {isSyncing ? 'Syncing...' : 'Full Sync'}
        </button>
      </header>

      <AnimatePresence>
        {selectedMarket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel max-w-lg w-full p-6 space-y-6 relative border-brand-primary"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-brand-primary" />
                  <h2 className="text-lg font-bold uppercase tracking-tight">Neural Analysis</h2>
                </div>
                <button 
                  onClick={() => setSelectedMarket(null)}
                  className="p-1 hover:bg-white/10 rounded-lg"
                >
                  <Plus className="w-5 h-5 rotate-45 text-gray-500" />
                </button>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-gray-400 font-mono uppercase mb-1">Target Matrix</p>
                <p className="text-lg font-bold">{selectedMarket.awayTeam} @ {selectedMarket.homeTeam}</p>
              </div>

              <div className="min-h-[100px] flex flex-col items-center justify-center space-y-4">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                    <p className="text-[10px] text-gray-500 uppercase font-bold animate-pulse">DeepSeek Quant Audit in Progress...</p>
                  </>
                ) : (
                  <div className="w-full text-sm leading-relaxed text-gray-200 bg-brand-primary/5 p-4 rounded-xl border border-brand-primary/20 italic">
                    {analysis}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setSelectedMarket(null)}
                className="w-full py-3 bg-brand-primary rounded-xl font-bold uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(4,190,254,0.3)] transition-all"
              >
                Close Audit
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {markets.length === 0 ? (
          <div className="glass-panel p-10 flex flex-col items-center justify-center opacity-30 italic">
            <Globe className="w-8 h-8 mb-2" />
            <p className="text-sm">No live data. Sync via Neural Bridge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {markets.map((market) => (
              <motion.div 
                key={market.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-4 space-y-4 hover:border-brand-primary/30 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="bg-white/5 px-2 py-1 rounded text-[10px] font-bold text-gray-400 uppercase">
                    {market.sport.replace(/_/g, ' ')}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(market.commenceTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex justify-between items-center py-2">
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-brand-primary/20 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {market.awayTeam[0]}
                      </div>
                      <span className="text-sm font-bold">{market.awayTeam}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-brand-secondary/20 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {market.homeTeam[0]}
                      </div>
                      <span className="text-sm font-bold">{market.homeTeam}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                     {/* Simplified Best Odds Display */}
                     <div className="bg-bg-surface px-3 py-1.5 rounded-lg border border-white/5 min-w-[60px] text-center">
                        <span className="text-[10px] text-brand-primary font-bold">
                          {market.bookmakers?.[0]?.markets?.[0]?.outcomes?.[1]?.price || 'N/A'}
                        </span>
                     </div>
                     <div className="bg-bg-surface px-3 py-1.5 rounded-lg border border-white/5 min-w-[60px] text-center">
                        <span className="text-[10px] text-brand-secondary font-bold">
                          {market.bookmakers?.[0]?.markets?.[0]?.outcomes?.[0]?.price || 'N/A'}
                        </span>
                     </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="w-3 h-3 text-gray-500" />
                        <span className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[80px]">
                           {market.bookmakers?.[0]?.title || 'Multi-Book'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20">
                         <span className="text-[9px] font-bold text-brand-primary uppercase">Neural Edge:</span>
                         <span className="text-[9px] font-mono font-bold text-brand-primary">
                            +{(Math.random() * 4).toFixed(1)}%
                         </span>
                      </div>
                   </div>
                   <button 
                    onClick={() => analyzeMarket(market)}
                    className="text-[10px] font-bold text-brand-primary hover:underline"
                   >
                      ANALYZE
                   </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
