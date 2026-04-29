import { useLiveQuery } from 'dexie-react-hooks';
import { db, Sport, BetStatus } from '../db/db';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { motion } from 'motion/react';

export default function Analytics() {
  const bets = useLiveQuery(() => db.bets.toArray()) || [];

  const profitBySport = Object.values(Sport).map(sport => ({
    name: sport,
    value: bets.filter(b => b.sport === sport).reduce((acc, b) => acc + (b.resultProfit || 0), 0)
  }));

  const winLossCount = [
    { name: 'Wins', value: bets.filter(b => b.status === BetStatus.WIN).length, color: '#00FF94' },
    { name: 'Losses', value: bets.filter(b => b.status === BetStatus.LOSS).length, color: '#FF3D3D' },
    { name: 'Push', value: bets.filter(b => b.status === BetStatus.PUSH).length, color: '#FF6B00' },
  ];

  const totalBets = bets.length;
  const avgOdds = totalBets > 0 ? bets.reduce((acc, b) => acc + b.odds, 0) / totalBets : 0;
  const roi = bets.reduce((acc, b) => acc + b.stake, 0) > 0 
    ? (bets.reduce((acc, b) => acc + (b.resultProfit || 0), 0) / bets.reduce((acc, b) => acc + b.stake, 0)) * 100 
    : 0;

  return (
    <div className="space-y-6 pb-24 px-2">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">ANALYTICS</h1>
        <p className="text-gray-400 text-xs uppercase tracking-widest font-mono">Deep Edge Breakdown</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">ROI</span>
            <span className={`text-2xl font-mono font-bold ${roi >= 0 ? 'text-brand-secondary' : 'text-brand-error'}`}>
                {roi.toFixed(1)}%
            </span>
        </div>
        <div className="glass-panel p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">Avg Odds</span>
            <span className="text-2xl font-mono font-bold text-white">
                {avgOdds.toFixed(2)}
            </span>
        </div>
      </div>

      <div className="glass-panel p-5 h-[280px]">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6">Profit by League</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={profitBySport}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
            <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#15171A', border: 'none', borderRadius: '8px'}} />
            <Bar dataKey="value">
              {profitBySport.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#00FF94' : '#FF3D3D'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-panel p-5 h-[280px] flex flex-col">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Win/Loss Distribution</h3>
        <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={winLossCount}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {winLossCount.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#15171A', border: 'none', borderRadius: '8px'}} />
                </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 pr-4">
                {winLossCount.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{item.name}: {item.value}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
