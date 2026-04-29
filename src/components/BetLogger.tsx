import { useState, useRef, type ChangeEvent } from 'react';
import { Camera, Upload, Check, Loader2, X, AlertCircle } from 'lucide-react';
import { parseBetScreenshot, type ParsedBet } from '../services/geminiService';
import { db, BetStatus, Sport, BetType } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function BetLogger({ onComplete }: { onComplete: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedBet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const strategies = useLiveQuery(() => db.strategies.toArray())?.filter(s => s.isActive) || [];
  const [selectedStrategy, setSelectedStrategy] = useState<number | null>(null);
  const [isParlay, setIsParlay] = useState(false);
  const [legs, setLegs] = useState<any[]>([]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const base64 = await toBase64(file);
      const result = await parseBetScreenshot(base64);
      if (result) {
        if (isParlay) {
           setLegs([...legs, { sport: result.sport, description: result.teams.join(' vs '), odds: result.odds, status: BetStatus.PENDING }]);
        } else {
           setParsedData(result);
        }
      } else {
        setError("Failed to parse screenshot. Please enter details manually.");
      }
    } catch (err) {
      setError("An error occurred during processing.");
    } finally {
      setIsUploading(false);
    }
  };

  const toBase64 = (file: File): Promise<string> => 
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });

  const saveBet = async () => {
    if ((!parsedData && (!isParlay || legs.length === 0)) || !selectedStrategy) return;

    try {
      await db.bets.add({
        sport: isParlay ? legs[0]?.sport : parsedData!.sport,
        league: isParlay ? 'MULTIPLE' : (parsedData!.sport as string),
        teams: isParlay ? legs.map(l => l.description) : parsedData!.teams,
        betType: isParlay ? BetType.SPREAD : parsedData!.betType, 
        odds: isParlay ? legs.reduce((acc, l) => acc * l.odds, 1) : parsedData!.odds,
        stake: parsedData?.stake || 0,
        bookmaker: parsedData?.bookmaker || 'Unknown',
        strategyId: selectedStrategy,
        status: BetStatus.PENDING,
        timestamp: Date.now(),
        gameDate: parsedData?.gameDate ? new Date(parsedData.gameDate).getTime() : Date.now(),
        gameTime: parsedData?.gameTime,
        daysRest: parsedData?.daysRest,
        isParlay: isParlay,
        legs: isParlay ? legs : undefined,
        resultProfit: 0
      });
      onComplete();
    } catch (err) {
      setError("Failed to save bet.");
    }
  };

  return (
    <div className="space-y-6 pb-24 px-2">
      <header className="flex justify-between items-end">
        <div>
           <h1 className="text-2xl font-bold tracking-tight">LOG BET</h1>
           <p className="text-gray-400 text-xs uppercase tracking-widest font-mono">Capture Edge Data</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
           <button 
             onClick={() => setIsParlay(false)}
             className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", !isParlay ? "bg-brand-primary text-white" : "text-gray-500")}
           >
             SINGLE
           </button>
           <button 
             onClick={() => setIsParlay(true)}
             className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", isParlay ? "bg-brand-primary text-white" : "text-gray-500")}
           >
             PARLAY
           </button>
        </div>
      </header>

      {isParlay && legs.length > 0 && (
         <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-gray-500">Parlay Legs ({legs.length})</label>
            <div className="space-y-1">
               {legs.map((leg, i) => (
                  <div key={i} className="bg-white/5 p-2 rounded-lg border border-white/5 flex justify-between items-center">
                     <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold bg-brand-primary/10 text-brand-primary px-1 rounded">{leg.sport}</span>
                        <span className="text-xs">{leg.description}</span>
                     </div>
                     <span className="text-xs font-mono text-gray-400">@ {leg.odds.toFixed(2)}</span>
                  </div>
               ))}
               <div className="bg-brand-secondary/5 p-2 rounded-lg border border-brand-secondary/20 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-brand-secondary uppercase">Combined Odds</span>
                  <span className="text-sm font-mono font-bold text-brand-secondary">
                     @ {legs.reduce((acc, l) => acc * l.odds, 1).toFixed(2)}
                  </span>
               </div>
            </div>
         </div>
      )}

      {!preview ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="glass-panel border-dashed border-2 border-brand-primary/20 p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-primary/5 transition-colors"
        >
          <div className="bg-brand-primary/10 p-4 rounded-full mb-4">
            <Camera className="w-8 h-8 text-brand-primary" />
          </div>
          <p className="font-bold text-sm uppercase tracking-wider">Snap Bet Slip</p>
          <p className="text-xs text-gray-500 mt-1">Accepts images from any sportsbook app</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative glass-panel overflow-hidden group">
            <img src={preview} alt="Preview" className="w-full h-48 object-cover opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center">
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                  <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse">AI Parsing...</p>
                </div>
              ) : (
                <Check className="w-12 h-12 text-brand-secondary" />
              )}
            </div>
            <button 
              onClick={() => { setPreview(null); setParsedData(null); }}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-brand-error/10 border border-brand-error/20 p-3 rounded-xl flex items-center gap-3"
              >
                <AlertCircle className="w-4 h-4 text-brand-error" />
                <p className="text-xs text-brand-error font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="glass-panel p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Sport</label>
                <select 
                  className="bg-bg-surface w-full p-2 rounded-lg text-sm border border-white/5 outline-none focus:border-brand-primary"
                  value={parsedData?.sport || Sport.NBA}
                  onChange={(e) => setParsedData(p => p ? {...p, sport: e.target.value as Sport} : null)}
                >
                  {Object.values(Sport).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Type</label>
                <select 
                   className="bg-bg-surface w-full p-2 rounded-lg text-sm border border-white/5 outline-none focus:border-brand-primary"
                   value={parsedData?.betType || BetType.MONEYLINE}
                   onChange={(e) => setParsedData(p => p ? {...p, betType: e.target.value as BetType} : null)}
                >
                  {Object.values(BetType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Game Time</label>
                <input 
                  type="time"
                  className="bg-bg-surface w-full p-2 rounded-lg text-sm border border-white/5 outline-none"
                  value={parsedData?.gameTime || ''}
                  onChange={(e) => setParsedData(p => p ? {...p, gameTime: e.target.value} : null)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Days Rest</label>
                <input 
                  type="number"
                  placeholder="e.g. 1"
                  className="bg-bg-surface w-full p-2 rounded-lg text-sm border border-white/5 outline-none"
                  value={parsedData?.daysRest || ''}
                  onChange={(e) => setParsedData(p => p ? {...p, daysRest: parseInt(e.target.value)} : null)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Matchup / Player</label>
              <input 
                type="text"
                className="bg-bg-surface w-full p-2 rounded-lg text-sm border border-white/5 outline-none focus:border-brand-primary"
                value={parsedData?.teams?.join(' vs ') || ''}
                placeholder="Lakers vs Celtics or LeBron James O 25.5"
                onChange={(e) => setParsedData(p => p ? {...p, teams: e.target.value.split(' vs ')} : null)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Odds</label>
                <input 
                  type="number" step="0.01"
                  className="bg-bg-surface w-full p-2 rounded-lg text-sm font-mono border border-white/5 outline-none focus:border-brand-primary"
                  value={parsedData?.odds || ''}
                  onChange={(e) => setParsedData(p => p ? {...p, odds: parseFloat(e.target.value)} : null)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Stake</label>
                <input 
                  type="number"
                  className="bg-bg-surface w-full p-2 rounded-lg text-sm font-mono border border-white/5 outline-none focus:border-brand-primary"
                  value={parsedData?.stake || ''}
                  onChange={(e) => setParsedData(p => p ? {...p, stake: parseFloat(e.target.value)} : null)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Bookmaker</label>
                <input 
                  type="text"
                  className="bg-bg-surface w-full p-2 rounded-lg text-sm border border-white/5 outline-none focus:border-brand-primary"
                  value={parsedData?.bookmaker || ''}
                  onChange={(e) => setParsedData(p => p ? {...p, bookmaker: e.target.value} : null)}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-[10px] uppercase font-bold text-gray-500">Assign Strategy</label>
              <div className="flex flex-wrap gap-2">
                {strategies.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStrategy(s.id!)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all",
                      selectedStrategy === s.id 
                        ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" 
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <button 
              disabled={isUploading || !parsedData || !selectedStrategy}
              onClick={saveBet}
              className="w-full bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-90 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center gap-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              CONFIRM & LOG BET
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
