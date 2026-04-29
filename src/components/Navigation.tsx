import { LayoutDashboard, PlusCircle, Target, Settings, TrendingUp, Brain, Bot, Globe } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { id: 'dashboard', label: 'Portfolio', icon: LayoutDashboard },
    { id: 'bet-log', label: 'Log Bet', icon: PlusCircle },
    { id: 'markets', label: 'Markets', icon: Globe },
    { id: 'agent', label: 'Neural', icon: Bot },
    { id: 'insights', label: 'Edge', icon: Brain },
    { id: 'strategies', label: 'Strategies', icon: Target },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2">
      <div className="mx-auto max-w-lg glass-panel flex items-center justify-around py-3 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-300 relative px-3 py-1 rounded-xl",
                isActive ? "text-brand-primary" : "text-gray-400 hover:text-gray-200"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "animate-pulse-slow")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium mt-1 uppercase tracking-wider">{tab.label}</span>
              {isActive && (
                <div className="absolute -top-1 w-1 h-1 bg-brand-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
