import { useLiveQuery } from 'dexie-react-hooks';
import { db, BetStatus } from '../db/db';
import { Brain, AlertTriangle, Clock, Zap, TrendingUp, Info, Loader2, Calculator } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useState } from 'react';

// Kelly Criterion: f* = (bp - q) / b
// b = decimal odds - 1, p = win probability, q = 1 - p
function kelly(winProb: number, decimalOdds: number, fraction = 0.25): number {
  const b = decimalOdds - 1;
  const p = winProb / 100;
  const q = 1 - p;
  const full = (b * p - q) / b;
  return Math.max(0, full * fraction); // quarter-Kelly for safety
}

export default function Insights() {
  const bets = useLiveQuery(() => db.bets.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get(1));
  const liveMarkets = useLiveQuery(() => db.liveMarkets.toArray()) || [];
  const strategies = useLiveQuery(() => db.strategies.toArray()) || [];
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);

  // Kelly calculator state
  const [kellyOdds, setKellyOdds] = useState('2.00');
  const [kellyProb, setKellyProb] = useState('55');
  const kellyBankroll = settings?.bankroll || 1000;

  const kellyPct = kelly(parseFloat(kellyProb) || 55, parseFloat(kellyOdds) || 2.0);
  const kellyStake = kellyBankroll * kellyPct;

  // 1. Circadian Analysis
  const nightGames = bets.filter(b => {
    const hour = b.gameTime ? parseInt(b.gameTime.split(':')[0]) : 0;
    return hour >= 19 || hour <= 4;
  });
  const nightWinRate = nightGames.length > 0
    ? (nightGames.filter(b => b.status === BetStatus.WIN).length / nightGames.filter(b => b.status !== BetStatus.PENDING).length) * 100
    : 0;

  const lowRestGames = bets.filter(b => (b.daysRest || 0) <= 1 && b.daysRest !== undefined);
  const lowRestWinRate = lowRestGames.length > 0
    ? (lowRestGames.filter(b => b.status === BetStatus.WIN).length / lowRestGames.filter(b => b.status !== BetStatus.PENDING).length) * 100
    : 0;

  // 2. Strategy performance breakdown
  const strategyStats = strategies.map(s => {
    const stratBets = bets.filter(b => b.strategyId === s.id && b.status !== BetStatus.PENDING);
    const wins = stratBets.filter(b => b.status === BetStatus.WIN).length;
    const pnl = stratBets.reduce((acc, b) => acc + (b.resultProfit || 0), 0);
    return {
      name: s.name,
      bets: stratBets.length,
      winRate: stratBets.length > 0 ? (wins / stratBets.length) * 100 : 0,
      pnl,
    };
  });

  // 3. Bet type breakdown
  const betTypeStats = ['SPREAD', 'TOTAL', 'MONEYLINE', 'PLAYER_PROP'].map(type => {
    const typeBets = bets.filter(b => b.betType === type && b.status !== BetStatus.PENDING);
    const wins = typeBets.filter(b => b.status === BetStatus.WIN).length;
    return {
      type,
      count: typeBets.length,
      winRate: typeBets.length > 0 ? (wins / typeBets.length) * 100 : 0,
      pnl: typeBets.reduce((acc, b) => acc + (b.resultProfit || 0), 0),
    };
  }).filter(s => s.count > 0);

  const runNeuralAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const stratSummary = strategyStats.map(s =>
        `${s.name}: ${s.bets} bets, ${s.winRate.toFixed(1)}% WR, PnL $${s.pnl.toFixed(2)}`
      ).join(' | ');
      const prompt = `Perform a high-level sports betting edge audit.
Context:
- Live Markets Active: ${liveMarkets.length}
- Strategies: ${stratSummary || 'None yet'}
- Night game win rate: ${nightWinRate.toFixed(1)}% over ${nightGames.length} games
- Low-rest matchup win rate: ${lowRestWinRate.toFixed(1)}% over ${lowRestGames.length} games
- Bet type breakdown: ${betTypeStats.map(t => `${t.type} ${t.winRate.toFixed(0)}%WR`).join(', ') || 'No data'}

Provide a 2-sentence summary of where the most significant edge currently resides, or what adjustment would most improve performance.`;
      const response = await fetch('/api/chat/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
        }),
      });
      const data = await response.json();
      setAuditResult(data.choices[0].message.content);
    } catch {
      setAuditResult('Market analysis offline. Check DeepSeek API key in Settings.');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 px-2">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white">INSIGHTS</h1>
        <p className="text-gray-400 text-xs uppercase tracking-widest font-mono italic">Edge Intelligence Engine</p>
      </header>

      {/* Kelly Criterion Calculator */}
      <div className="glass-panel p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-brand-primary" />
          <h2 className="text-xs font-bold uppercase">Kelly Criterion Calculator</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[9px] font-mono text-gray-500 uppercase">Decimal Odds</span>
            <input type="number" step="0.01" min="1.01" value={kellyOdds}
              onChange={e => setKellyOdds(e.target.value)}
              className="w-full mt-1 bg-black/20 p-2 rounded-lg border border-white/5 text-sm font-mono focus:border-brand-primary outline-none" />
          </label>
          <label className="block">
            <span className="text-[9px] font-mono text-gray-500 uppercase">Win % (your edge)</span>
            <input type="number" step="0.1" min="1" max="99" value={kellyProb}
              onChange={e => setKellyProb(e.target.value)}
              className="w-full mt-1 bg-black/20 p-2 rounded-lg border border-white/5 text-sm font-mono focus:border-brand-primary outline-none" />
          </label>
        </div>
        <div className="p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/20 space-y-2">
          <div className="flex justify-between">
            <span className="text-[10px] text-gray-400 font-mono">Quarter-Kelly Stake %</span>
            <span className="text-[10px] font-bold text-brand-primary font-mono">
              {kellyPct > 0 ? `${(kellyPct * 100).toFixed(2)}%` : 'NO EDGE'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-gray-400 font-mono">Recommended Stake</span>
            <span className="text-[10px] font-bold text-white font-mono">
              {kellyPct > 0 ? `$${kellyStake.toFixed(2)}` : '$0.00'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-gray-400 font-mono">Bankroll</span>
            <span className="text-[10px] text-gray-300 font-mono">${kellyBankroll.toLocaleString()}</span>
          </div>
          {kellyPct <= 0 && (
            <p className="text-[9px] text-red-400 font-mono">Negative EV — do not bet at these odds/probability.</p>
          )}
        </div>
        <p className="text-[9px] text-gray-600 font-mono leading-relaxed">
          Using 1/4 Kelly for variance reduction. Full Kelly: {kellyPct > 0 ? `${(kellyPct * 4 * 100).toFixed(2)}%` : 'N/A'}
        </p>
      </div>

      {/* Neural Audit */}
      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-brand-secondary" />
            <h2 className="text-xs font-bold uppercase">Neural Edge Audit</h2>
          </div>
          <button onClick={runNeuralAudit} disabled={isAuditing}
            className="px-3 py-1.5 bg-brand-secondary/10 border border-brand-secondary/30 text-brand-secondary text-[10px] font-bold rounded-lg hover:bg-brand-secondary/20 transition-colors disabled:opacity-50">
            {isAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Run Audit'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
          {auditResult || 'Full context audit standing by — includes strategy, circadian, and market data.'}
        </p>
      </div>

      {/* Strategy Breakdown */}
      {strategyStats.length > 0 && (
        <div className="glass-panel p-4">
          <h2 className="text-[10px] font-bold uppercase text-gray-400 mb-3 font-mono tracking-widest">Strategy Performance</h2>
          <div className="space-y-3">
            {strategyStats.map((s, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] font-semibold text-white">{s.name}</span>
                  <span className={cn('text-[10px] font-bold font-mono', s.pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-primary rounded-full transition-all" style={{ width: `${s.winRate}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-500 font-mono w-16 text-right">{s.winRate.toFixed(1)}% WR · {s.bets}b</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bet Type Breakdown */}
      {betTypeStats.length > 0 && (
        <div className="glass-panel p-4">
          <h2 className="text-[10px] font-bold uppercase text-gray-400 mb-3 font-mono tracking-widest">By Bet Type</h2>
          <div className="space-y-2">
            {betTypeStats.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
                <span className="text-[11px] font-bold text-gray-300">{t.type}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-gray-500 font-mono">{t.count} bets</span>
                  <span className="text-[10px] font-bold text-white font-mono">{t.winRate.toFixed(1)}%</span>
                  <span className={cn('text-[10px] font-bold font-mono', t.pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Circadian Analysis */}
      <div className="glass-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-brand-primary" />
          <h2 className="text-[10px] font-bold uppercase text-gray-400 font-mono tracking-widest">Circadian & Rest Signals</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-black/20 rounded-xl border border-white/5">
            <p className="text-[9px] text-gray-500 font-mono">Night Games (7pm+)</p>
            <p className="text-xl font-bold text-white mt-1">{nightWinRate.toFixed(1)}%</p>
            <p className="text-[9px] text-gray-600">{nightGames.length} bets logged</p>
          </div>
          <div className="p-3 bg-black/20 rounded-xl border border-white/5">
            <p className="text-[9px] text-gray-500 font-mono">B2B / Low Rest</p>
            <p className="text-xl font-bold text-white mt-1">{lowRestWinRate.toFixed(1)}%</p>
            <p className="text-[9px] text-gray-600">{lowRestGames.length} bets logged</p>
          </div>
        </div>
        {nightGames.length === 0 && lowRestGames.length === 0 && (
          <p className="text-center text-[10px] text-gray-600 font-mono italic mt-3">
            Log bets with Game Time and Days Rest to enable circadian analysis.
          </p>
        )}
      </div>
    </div>
  );
}
