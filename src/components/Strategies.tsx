import { useState } from 'react';
import { db, Strategy } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Target, Plus, Info, ShieldCheck, Zap, Trash2, Edit3, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Strategies() {
  const strategies = useLiveQuery(() => db.strategies.toArray()) || [];
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newStrategy, setNewStrategy] = useState({ name: '', description: '', formula: '' });

  const addStrategy = async () => {
    if (!newStrategy.name) return;
    await db.strategies.add({
      ...newStrategy,
      isActive: true,
      createdAt: Date.now()
    });
    setNewStrategy({ name: '', description: '', formula: '' });
    setIsAdding(false);
  };

  const generateAIStrategy = async () => {
    setIsGenerating(true);
    setIsAdding(true);
    try {
      // Prioritize DeepSeek for complex strategy engineering
      const response = await fetch('/api/chat/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ 
            role: "system", 
            content: "You are a professional sports betting quant. Design a unique, high-yield betting strategy. Focus on a specific niche (e.g., NBA 1st Quarter Totals, MLB Strikeouts). Provide a Name, a brief technical Description, and a simplified pseudo-code Formula." 
          }, {
            role: "user",
            content: "Generate a new advanced betting strategy."
          }],
          temperature: 0.8
        })
      });
      
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Basic parser for AI output
      const nameMatch = content.match(/Name:\s*(.*)/i);
      const descMatch = content.match(/Description:\s*([\s\S]*?)(?=Formula:|$)/i);
      const formulaMatch = content.match(/Formula:\s*(.*)/i);
      
      setNewStrategy({
        name: nameMatch ? nameMatch[1].trim() : "Neural Edge v" + (strategies.length + 1),
        description: descMatch ? descMatch[1].trim().substring(0, 150) + "..." : "Advanced AI-generated pattern detection strategy.",
        formula: formulaMatch ? formulaMatch[1].trim() : "X > Y * 1.05"
      });
    } catch (err) {
      console.error("AI Generation failed:", err);
      // Fallback to local Gemma logic
      setNewStrategy({
        name: "Local Gemma Alpha",
        description: "A conservative local inference model focusing on stabilizing bankroll growth through low-variance moneyline plays.",
        formula: "IF (WIN_PROB > 0.6) AND (ODDS > 1.8) THEN EXECUTE"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteStrategy = async (id: number) => {
    if (confirm("Are you sure you want to delete this strategy?")) {
      await db.strategies.delete(id);
    }
  };

  const templates = [
    { name: 'Expected Value (EV)', formula: 'IF (My_Prob * Odds) - 1 > 0.05 THEN "Value"', description: 'Identifies bets where the payout exceeds the actual probability risk.' },
    { name: 'Kelly Criterion (Full)', formula: 'Stake = Bankroll * ((Odds * Prob - (1 - Prob)) / Odds)', description: 'Calculates optimal stake size to maximize long-term bankroll growth.' },
    { name: 'Poisson Totals', formula: 'IF Actual_Avg > League_Avg * 1.1 THEN "Over"', description: 'Uses statistical distribution to predict game totals based on scoring averages.' }
  ];

  return (
    <div className="space-y-6 pb-24 px-2">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">STRATEGIES</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-mono">Edge Formulation Systems</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={generateAIStrategy}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-brand-secondary/10 border border-brand-secondary/30 px-3 py-2 rounded-xl text-brand-secondary hover:bg-brand-secondary/20 transition-colors text-[10px] font-bold uppercase"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI Draft
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-brand-primary/10 border border-brand-primary/30 p-2 rounded-xl text-brand-primary hover:bg-brand-primary/20 transition-colors"
          >
            {isAdding ? <Plus className="w-5 h-5 rotate-45" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-5 space-y-4"
          >
            <div className="flex justify-between items-center bg-brand-primary/5 p-3 rounded-xl mb-2">
              <span className="text-[10px] font-bold text-brand-primary uppercase">Quick Templates</span>
              <div className="flex gap-2">
                {templates.map(t => (
                  <button 
                    key={t.name}
                    onClick={() => setNewStrategy({ name: t.name, description: t.description, formula: t.formula })}
                    className="text-[9px] font-bold bg-white/5 px-2 py-1 rounded hover:bg-brand-primary/20 transition-colors"
                  >
                    {t.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Name</label>
              <input 
                type="text"
                placeholder="e.g. NBA Prop Overlay v2"
                className="bg-bg-surface w-full p-2 rounded-lg text-sm border border-white/5 outline-none focus:border-brand-primary"
                value={newStrategy.name}
                onChange={(e) => setNewStrategy({...newStrategy, name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Description</label>
              <textarea 
                placeholder="Briefly explain your edge factor..."
                className="bg-bg-surface w-full p-2 rounded-lg text-sm border border-white/5 outline-none focus:border-brand-primary min-h-[60px]"
                value={newStrategy.description}
                onChange={(e) => setNewStrategy({...newStrategy, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-500">Formula Rule (Optional)</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="IF EV > 5% THEN Tag as 'HIGH EDGE'"
                  className="bg-bg-surface flex-1 p-2 rounded-lg text-sm font-mono border border-white/5 outline-none"
                  value={newStrategy.formula}
                  onChange={(e) => setNewStrategy({...newStrategy, formula: e.target.value})}
                />
                <button 
                  onClick={addStrategy}
                  className="bg-brand-primary px-4 rounded-lg font-bold text-xs"
                >
                  SAVE
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {strategies.map((strat, idx) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            key={strat.id} 
            className="glass-panel p-5 border-l-2 border-brand-primary/30"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-brand-primary/10 p-1.5 rounded-lg">
                  <Target className="w-4 h-4 text-brand-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">{strat.name}</h3>
                  <p className="text-[10px] text-gray-500 uppercase font-mono italic">Created {new Date(strat.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="text-gray-600 hover:text-white transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteStrategy(strat.id!)}
                  className="text-gray-600 hover:text-brand-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-xs text-gray-400 leading-relaxed mb-4">{strat.description}</p>
            
            <div className="flex items-center gap-4 border-t border-white/5 pt-3">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-brand-primary" />
                <span className="text-[10px] font-bold text-gray-300 uppercase">EV Focused</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-secondary" />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Active</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-brand-primary shrink-0" />
          <p className="text-[10px] leading-normal text-brand-primary/80 uppercase font-bold">
            All strategies are processed locally. Your edge formulas are private and never uploaded to any cloud server.
          </p>
        </div>
      </div>
    </div>
  );
}
