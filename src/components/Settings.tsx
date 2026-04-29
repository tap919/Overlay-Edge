import { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Settings as SettingsIcon, Shield, Zap, Globe, Cpu, Database, Command, Sliders, Monitor, Terminal, Download, Trash2, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

type Tab = 'general' | 'engine' | 'apis' | 'browser';

export default function Settings() {
  const settings = useLiveQuery(() => db.settings.get(1));
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [isExporting, setIsExporting] = useState(false);

  const tabs = [
    { id: 'general', label: 'Identity', icon: SettingsIcon },
    { id: 'engine', label: 'Engine', icon: Cpu },
    { id: 'apis', label: 'APIs', icon: Database },
    { id: 'browser', label: 'Automation', icon: Monitor },
  ];

  const exportData = async () => {
    setIsExporting(true);
    const bets = await db.bets.toArray();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bets));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "overlay_edge_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setIsExporting(false);
  };

  const clearData = async () => {
    if (confirm("DANGER: This will delete ALL logged bets and data. This cannot be undone. Continue?")) {
      await db.bets.clear();
      await db.liveMarkets.clear();
      alert("System database cleared.");
    }
  };

  return (
    <div className="space-y-6 pb-24 px-2">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white">SYSTEM CONFIG</h1>
        <p className="text-gray-400 text-xs uppercase tracking-widest font-mono">Neural Bridge v1.5 Core Override</p>
      </header>

      {/* Navigation Tabs */}
      <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel p-6 space-y-8 min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'general' && (
            <motion.div 
              key="general"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Bankroll (USD)</span>
                  <input 
                    type="number"
                    className="w-full mt-1.5 bg-black/20 p-3 rounded-xl border border-white/5 text-sm font-mono focus:border-brand-primary outline-none"
                    value={settings?.bankroll || 1000}
                    onChange={(e) => db.settings.update(1, { bankroll: Number(e.target.value) })}
                  />
                </label>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase font-mono">Maintenance</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={exportData}
                      disabled={isExporting}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-[10px] font-bold uppercase">Export Workspace</span>
                      <Download className="w-3.5 h-3.5 text-brand-secondary" />
                    </button>
                    <button 
                      onClick={clearData}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-brand-error/10 hover:text-brand-error transition-colors"
                    >
                      <span className="text-[10px] font-bold uppercase text-brand-error">Clear All Data</span>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'engine' && (
            <motion.div 
              key="engine"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="p-4 bg-brand-primary/5 rounded-xl border border-brand-primary/20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-brand-primary" />
                  <div>
                    <p className="text-xs font-bold uppercase text-white">Turbo Execution</p>
                    <p className="text-[9px] text-gray-400 font-mono">Reduce IO-Wait for local inference</p>
                  </div>
                </div>
                <div className="w-10 h-5 bg-brand-primary/20 rounded-full relative p-1 cursor-pointer">
                   <div className="absolute right-1 top-1 bottom-1 w-3 bg-brand-primary rounded-full shadow-[0_0_5px_rgba(4,190,254,1)]" />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase font-mono">Model Priority Routing</p>
                <div className="grid grid-cols-2 gap-2">
                   <button className="p-3 rounded-xl border border-brand-primary bg-brand-primary/10 text-[10px] font-bold text-brand-primary">DEEPSEEK_R1</button>
                   <button className="p-3 rounded-xl border border-white/5 bg-white/5 text-[10px] font-bold text-gray-500">GEMMA_LOCAL</button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <p className="text-[10px] font-bold text-gray-500 uppercase font-mono">Edge Sensitivity</p>
                  <span className="text-[10px] font-mono text-brand-primary">0.85 (SHARP)</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full w-[85%] bg-brand-primary rounded-full shadow-[0_0_10px_rgba(4,190,254,0.5)]" />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'apis' && (
            <motion.div 
              key="apis"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                   <p className="text-xs font-bold uppercase flex items-center gap-2 text-white">
                     <Database className="w-3.5 h-3.5 text-brand-primary" />
                     Registry Keys
                   </p>
                   <button className="text-[9px] font-bold text-brand-primary hover:underline">+ REGISTER NEW</button>
                </div>
                
                <div className="space-y-2">
                   <div className="flex bg-black/20 p-2 rounded-lg border border-white/5 items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-400 italic">THE_ODDS_API_V4</span>
                      <span className="text-[9px] font-bold text-green-500 uppercase">ACTIVE</span>
                   </div>
                   <div className="flex bg-black/20 p-2 rounded-lg border border-white/5 items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-400 italic">DEEPSEEK_R1_CORE</span>
                      <span className="text-[9px] font-bold text-green-500 uppercase">ACTIVE</span>
                   </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/20">
                <p className="text-[10px] text-yellow-500 font-bold uppercase mb-1 flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  Security Protocol
                </p>
                <p className="text-[9px] text-gray-500 leading-relaxed italic">
                  Keys are managed via server-side environment variables to prevent client-side leaks in preview environments.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'browser' && (
            <motion.div 
              key="browser"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase font-mono">Agent Interaction Mode</p>
                <div className="grid grid-cols-2 gap-2">
                   <button className="p-3 rounded-xl border border-brand-secondary bg-brand-secondary/10 text-[10px] font-bold text-brand-secondary uppercase">Headless</button>
                   <button className="p-3 rounded-xl border border-white/5 bg-white/5 text-[10px] font-bold text-gray-500 uppercase">User Overlay</button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <p className="text-[10px] font-bold text-gray-500 uppercase font-mono">Injection Delay</p>
                  <span className="text-[10px] font-mono text-gray-400">120ms</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full w-[12%] bg-brand-secondary rounded-full shadow-[0_0_10px_rgba(0,188,212,0.5)]" />
                </div>
              </div>

              <div className="p-4 bg-brand-secondary/5 rounded-xl border border-brand-secondary/20 space-y-2">
                 <p className="text-xs font-bold uppercase flex items-center gap-2 text-white">
                   <Terminal className="w-3.5 h-3.5 text-brand-secondary" />
                   Automation Log
                 </p>
                 <div className="p-3 bg-black/40 rounded-lg font-mono text-[9px] text-gray-500 space-y-1">
                    <p>{'>'} neural.bridge.init(prize_picks)</p>
                    <p>{'>'} selector_v4.match("leg_1")</p>
                    <p className="text-brand-secondary animate-pulse">{'>'} standing_by_for_injection...</p>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 text-center">
        <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mb-1">Neural Firmware</p>
        <p className="text-[10px] text-gray-500 font-mono uppercase">v1.5.0-ALPHA_BUILD_RX9</p>
      </div>
    </div>
  );
}

