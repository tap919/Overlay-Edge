import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, BetStatus, type WatchedStat } from '../db/db';
import { TrendingUp, TrendingDown, DollarSign, Activity, Brain, Plus, Trash2, Eye, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Dashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const bets = useLiveQuery(() => db.bets.orderBy('timestamp').toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get(1));
  const watchedStats = useLiveQuery(() => db.watchedStats.toArray()) || [];

  const bankroll = settings?.bankroll || 0;
  const accentColor = settings?.accentColor || '#FF6B00';
  const totalProfit = bets.reduce((acc, bet) => acc + (bet.resultProfit || 0), 0);
  const relevantBets = bets.filter(b => b.status !== BetStatus.PENDING);
  const pendingBets = bets.filter(b => b.status === BetStatus.PENDING);
  const winRate = relevantBets.length > 0
    ? (bets.filter(b => b.status === BetStatus.WIN).length / relevantBets.length) * 100
    : 0;

  // Chart data — cumulative equity curve
  let currentBalance = bankroll;
  const chartData = bets.map(bet => {
    currentBalance += (bet.resultProfit || 0);
    return {
      date: new Date(bet.timestamp).toLocaleDateString(),
      balance: currentBalance,
    };
  });

  const stats = [
    { label: 'Total Bankroll', value: `$${ (bankroll + totalProfit).toLocaleString() }`, icon: DollarSign, color: 'text-white' },
    { label: 'Total Profit',   value: `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`, icon: totalProfit >= 0 ? TrendingUp : TrendingDown, color: totalProfit >= 0 ? 'text-brand-secondary' : 'text-brand-error' },
    { label: 'Win Rate',       value: `${winRate.toFixed(1)}%`, icon: Activity, color: 'text-brand-primary' },
  ];

  const [riskInsight, setRiskInsight] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Bet result quick-settle
  const settleBet = async (id: number, result: 'WIN' | 'LOSS' | 'PUSH', stake: number, odds: number) => {
    let profit = 0;
    if (result === 'WIN') profit = stake * (odds - 1);
    else if (result === 'LOSS') profit = -stake;
    else profit = 0; // PUSH — return stake
    await db.bets.update(id, { status: BetStatus[result], resultProfit: profit });
    await db.settings.update(1, { bankroll: (settings?.bankroll || 0) + (result === 'PUSH' ? 0 : profit) });
  };

  // WatchedStat management
  const [showAddStat, setShowAddStat] = useState(false);
  const [newStatName, setNewStatName] = useState('');
  const [newStatValue, setNewStatValue] = useState('');

  const addWatchedStat = async () => {
    if (!newStatName.trim() || !newStatValue) return;
    await db.watchedStats.add({
      name: newStatName.trim(),
      category: 'TEAM',
      sport: 'NBA' as any,
      targetValue: parseFloat(newStatValue),
      trendDirection: 'OVER',
      lastUpdated: Date.now(),
    });
    setNewStatName('');
    setNewStatValue('');
    setShowAddStat(false);
  };

  const removeWatchedStat = async (id: number) => {
    await db.watchedStats.delete(id);
  };

  const runRiskAudit = async () => {
    setIsAuditing(true);
    try {
      const betHistory = relevantBets.slice(-20).map(b =>
        `${b.sport} ${b.betType} @ ${b.odds} stake:$${b.stake} result:${b.status} pnl:${ b.resultProfit?.toFixed(2) }`
      ).join('\n');
      const prompt = `You are a professional sports betting analyst. Analyze this bettor's recent history:\n\nBalance: $${(bankroll + totalProfit).toFixed(2)}\nWin Rate: ${winRate.toFixed(1)}%\nTotal Settled Bets: ${relevantBets.length}\nPending Bets: ${pendingBets.length}\n\nRecent bet log:\n${betHistory || 'No history yet'}\n\nProvide ONE specific, actionable risk-management recommendation using Kelly Criterion. Be concise (1-2 sentences max).`;
      const response = await fetch('/api/chat/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 120,
        }),
      });
      const data = await response.json();
      setRiskInsight(data.choices[0].message.content);
    } catch {
      setRiskInsight('Recommend static 1-2% unit sizing until win rate exceeds 55% over 50+ bets.');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 px-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">OVERLAY EDGE</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-mono italic">Real-time Performance</p>
        </div>
        <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-[9px] font-bold rounded-full animate-pulse">
          LIVE EDGE
        </span>
      </header>

      {/* AI Risk Audit */}
      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-brand-primary" />
            <span className="text-xs font-bold uppercase">Neural Risk Analysis</span>
          </div>
          <button onClick={runRiskAudit} disabled={isAuditing}
            className="px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-[10px] font-bold rounded-lg hover:bg-brand-primary/20 transition-colors disabled:opacity-50">
            {isAuditing ? 'Auditing...' : 'Run Audit'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
          {riskInsight || 'Quant-level bankroll audit standing by...'}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
            className="glass-panel p-3 flex flex-col gap-1">
            <stat.icon className={cn('w-3.5 h-3.5', stat.color)} />
            <p className="text-[9px] text-gray-500 font-mono uppercase">{stat.label}</p>
            <p className={cn('text-sm font-bold font-mono', stat.color)}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Equity Curve */}
      <div className="glass-panel p-4">
        <h2 className="text-[10px] font-bold uppercase text-gray-400 mb-3 font-mono tracking-widest">Equity Curve</h2>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData.length > 0 ? chartData : [{ date: 'Start', balance: bankroll }]}>
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 8, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{ background: '#0f0f11', border: `1px solid ${accentColor}33`, fontSize: 10, borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="balance" stroke={accentColor} strokeWidth={2} fill="url(#balGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Bets — with inline WIN/LOSS/PUSH settlement */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold uppercase text-gray-400 font-mono tracking-widest">Recent Bets</h2>
          <button onClick={() => onNavigate?.('bet-log')}
            className="flex items-center gap-1 text-[10px] text-brand-primary font-bold hover:underline">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {bets.length === 0 ? (
          <p className="text-center text-xs text-gray-600 font-mono italic py-4">No bets logged yet.</p>
        ) : (
          <div className="space-y-2">
            {bets.slice(-5).reverse().map((bet) => (
              <div key={bet.id} className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 mr-2">{bet.sport}</span>
                    <span className="text-[11px] font-semibold text-white">{bet.teams.join(' vs ')}</span>
                  </div>
                  <span className={cn('text-[10px] font-bold',
                    bet.status === BetStatus.WIN ? 'text-green-400' :
                    bet.status === BetStatus.LOSS ? 'text-red-400' :
                    bet.status === BetStatus.PUSH ? 'text-yellow-400' : 'text-gray-400'
                  )}>
                    {bet.status === BetStatus.PENDING ? 'OPEN' : `${bet.resultProfit! >= 0 ? '+' : ''}$${bet.resultProfit?.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-500 font-mono">{bet.betType} @ {bet.odds.toFixed(2)} · ${bet.stake}</span>
                  <span className="text-[9px] text-gray-600">{new Date(bet.timestamp).toLocaleDateString()}</span>
                </div>
                {/* Inline settle buttons for PENDING bets */}
                {bet.status === BetStatus.PENDING && (
                  <div className="flex gap-1.5 pt-1">
                    <button onClick={() => settleBet(bet.id!, 'WIN', bet.stake, bet.odds)}
                      className="flex-1 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-bold rounded-lg hover:bg-green-500/20 transition-colors">
                      WIN
                    </button>
                    <button onClick={() => settleBet(bet.id!, 'LOSS', bet.stake, bet.odds)}
                      className="flex-1 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold rounded-lg hover:bg-red-500/20 transition-colors">
                      LOSS
                    </button>
                    <button onClick={() => settleBet(bet.id!, 'PUSH', bet.stake, bet.odds)}
                      className="flex-1 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[9px] font-bold rounded-lg hover:bg-yellow-500/20 transition-colors">
                      PUSH
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stat Watchlist — LIVE from Dexie */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold uppercase text-gray-400 font-mono tracking-widest">Stat Watchlist</h2>
          <button onClick={() => setShowAddStat(v => !v)}
            className="flex items-center gap-1 text-[10px] text-brand-primary font-bold hover:underline">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <AnimatePresence>
          {showAddStat && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3">
              <div className="p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/20 space-y-2">
                <input placeholder="Stat name (e.g. LeBron Points)" value={newStatName}
                  onChange={e => setNewStatName(e.target.value)}
                  className="w-full bg-black/20 p-2 rounded-lg border border-white/5 text-[11px] font-mono focus:border-brand-primary outline-none" />
                <input type="number" placeholder="Target value" value={newStatValue}
                  onChange={e => setNewStatValue(e.target.value)}
                  className="w-full bg-black/20 p-2 rounded-lg border border-white/5 text-[11px] font-mono focus:border-brand-primary outline-none" />
                <button onClick={addWatchedStat}
                  className="w-full py-2 bg-brand-primary rounded-xl text-[10px] font-bold uppercase text-white">
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {watchedStats.length === 0 ? (
          <p className="text-center text-[10px] text-gray-600 font-mono italic py-3">No watchlist entries. Add stats to track.</p>
        ) : (
          <div className="space-y-2">
            {watchedStats.map(stat => (
              <div key={stat.id} className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
                <div>
                  <p className="text-[11px] font-semibold text-white">{stat.name}</p>
                  <p className="text-[9px] text-gray-500 font-mono">{stat.trendDirection} {stat.targetValue} · {stat.sport}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold" style={{ color: accentColor }}>
                    {stat.currentValue ?? stat.targetValue}
                  </span>
                  <button onClick={() => removeWatchedStat(stat.id!)}
                    className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
