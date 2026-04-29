import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, BetStatus } from '../db/db';
import { TrendingUp, TrendingDown, DollarSign, Activity, Brain } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

export default function Dashboard() {
  const bets = useLiveQuery(() => db.bets.orderBy('timestamp').toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get(1));
  
  const bankroll = settings?.bankroll || 0;
  const totalProfit = bets.reduce((acc, bet) => acc + (bet.resultProfit || 0), 0);
  const relevantBets = bets.filter(b => b.status !== BetStatus.PENDING);
  const winRate = relevantBets.length > 0 
    ? (bets.filter(b => b.status === BetStatus.WIN).length / relevantBets.length) * 100 
    : 0;

  // Chart data
  let currentBalance = bankroll;
  const chartData = bets.map(bet => {
    currentBalance += (bet.resultProfit || 0);
    return {
      date: new Date(bet.timestamp).toLocaleDateString(),
      balance: currentBalance
    };
  });

  const stats = [
    { label: 'Total Bankroll', value: `$${(bankroll + totalProfit).toLocaleString()}`, icon: DollarSign, color: 'text-white' },
    { label: 'Total Profit', value: `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`, icon: totalProfit >= 0 ? TrendingUp : TrendingDown, color: totalProfit >= 0 ? 'text-brand-secondary' : 'text-brand-error' },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, icon: Activity, color: 'text-brand-primary' },
  ];

  const [riskInsight, setRiskInsight] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const runRiskAudit = async () => {
    setIsAuditing(true);
    try {
      const prompt = `Analyze this sports bettor profile:
      Total Balance: ${bankroll + totalProfit}
      Win Rate: ${winRate}%
      Total Bets: ${relevantBets.length}
      Provide one actionable sentence of risk management advice using Kelly Criterion logic.`;

      const response = await fetch('/api/chat/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      setRiskInsight(data.choices[0].message.content);
    } catch (err) {
      setRiskInsight("Recommend a static 1-2% unit sizing until neural bridging is re-established.");
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OVERLAY EDGE</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-mono">Real-time Performance</p>
        </div>
        <div className="bg-brand-primary/10 border border-brand-primary/20 px-3 py-1 rounded-full">
          <span className="text-brand-primary text-xs font-bold font-mono uppercase">LIVE EDGE</span>
        </div>
      </header>

      {/* AI Risk Audit Banner */}
      <div className="px-2">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-4 bg-brand-primary/5 border-brand-primary/20 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
             <div className="p-2 bg-brand-primary rounded-lg shadow-[0_0_15px_rgba(4,190,254,0.3)]">
                <Brain className="w-4 h-4 text-white" />
             </div>
             <div className="min-w-0">
                <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Neural Risk Analysis</p>
                <p className="text-sm font-medium text-gray-200 italic truncate max-w-[300px] md:max-w-md">
                   {riskInsight || "Quant-level bankroll audit standing by..."}
                </p>
             </div>
          </div>
          <button 
            onClick={runRiskAudit}
            disabled={isAuditing}
            className="w-full md:w-auto px-4 py-2 bg-brand-primary hover:bg-brand-primary/80 disabled:opacity-50 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest transition-all"
          >
            {isAuditing ? "Auditing..." : "Run Audit"}
          </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
        {stats.map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label} 
            className="glass-panel p-5 bet-card-gradient"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold font-mono tracking-tighter ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon className={`w-5 h-5 ${stat.color} opacity-80`} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="px-2">
        <div className="glass-panel p-6 h-[300px]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Equity Curve</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.length > 0 ? chartData : [{ date: 'Start', balance: bankroll }]}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 10 }} 
                hide={chartData.length === 0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#15171A', border: '1px solid rgba(255,107,0,0.2)', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: '#FF6B00' }}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="#FF6B00" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="px-2 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Recent Bets</h3>
          <button className="text-[10px] uppercase font-bold text-brand-primary">View All</button>
        </div>
        
        {bets.length === 0 ? (
          <div className="glass-panel p-10 text-center border-dashed border-2">
            <p className="text-gray-500 text-sm italic">No bets logged yet. Head to "Log Bet" to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bets.slice(-5).reverse().map((bet, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={bet.id} 
                className="glass-panel p-4 flex justify-between items-center border-l-4"
                style={{ borderLeftColor: bet.status === BetStatus.WIN ? '#00FF94' : bet.status === BetStatus.LOSS ? '#FF3D3D' : '#FF6B00' }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-brand-primary uppercase tracking-tighter bg-brand-primary/10 px-1.5 rounded">{bet.sport}</span>
                    <span className="text-xs font-bold">{bet.teams.join(' vs ')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 uppercase font-mono">
                    <span>{bet.betType}</span>
                    <span>@ {bet.odds.toFixed(2)}</span>
                    <span className="text-white/60">${bet.stake.toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold font-mono ${bet.status === BetStatus.WIN ? 'text-brand-secondary' : bet.status === BetStatus.LOSS ? 'text-brand-error' : 'text-brand-primary'}`}>
                    {bet.status === BetStatus.PENDING ? 'OPEN' : `${bet.resultProfit! >= 0 ? '+' : ''}$${bet.resultProfit?.toFixed(2)}`}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase">{new Date(bet.timestamp).toLocaleDateString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="px-2 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Stat Watchlist</h3>
          <button className="text-[10px] uppercase font-bold text-brand-primary">Update Feeds</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: 'NBA Pace Trend', value: '+4.2', desc: 'League average increasing', color: '#FF6B00' },
            { name: 'B2B Under Rate', value: '58%', desc: 'NFL prime time trends', color: '#00FF94' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i }}
              className="glass-panel p-4 flex justify-between items-center bg-white/5"
            >
              <div>
                <p className="text-xs font-bold text-white mb-0.5">{stat.name}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-tighter">{stat.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <div className="flex gap-0.5 mt-1">
                   {[1,2,3].map(j => <div key={j} className="w-1 h-1 rounded-full" style={{ backgroundColor: stat.color, opacity: 0.3 }} />)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
