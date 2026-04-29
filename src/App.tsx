import { useState, useEffect } from 'react';
import { seedData } from './db/db';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import BetLogger from './components/BetLogger';
import Strategies from './components/Strategies';
import Insights from './components/Insights';
import Settings from './components/Settings';
import Agent from './components/Agent'; // Added Agent
import Markets from './components/Markets';
import { motion, AnimatePresence } from 'motion/react';
import { Activity } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      await seedData();
      // Simulate splash screen for "hardware" feel
      setTimeout(() => setIsReady(true), 1500);
    }
    init();
  }, []);

  if (!isReady) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-bg-main relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mb-6 border border-brand-primary/20 animate-pulse">
            <Activity className="w-10 h-10 text-brand-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-[0.2em] text-white">OVERLAY EDGE</h1>
          <p className="text-xs text-brand-primary font-mono mt-2 tracking-[0.4em] uppercase">Booting Engine...</p>
        </motion.div>
        
        {/* Decorative background grid */}
        <div className="absolute inset-0 opacity-10" 
             style={{ backgroundImage: 'radial-gradient(circle, #FF6B00 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'bet-log': return <BetLogger onComplete={() => setActiveTab('dashboard')} />;
      case 'insights': return <Insights />;
      case 'strategies': return <Strategies />;
      case 'agent': return <Agent />; // Added Agent
      case 'markets': return <Markets />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="max-w-xl mx-auto min-h-screen relative pt-8 font-sans">
      <main className="px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>
      
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,107,0,0.03)_0%,transparent_50%)]" />
    </div>
  );
}

