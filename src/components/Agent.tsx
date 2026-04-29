import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Bot, Cpu, Terminal, ShieldAlert, CheckCircle2, Loader2, Globe, Send, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { syncLiveOdds } from '../services/oddsService';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';

// System prompt injected into every DeepSeek call — gives it full bet-edge context
const SYSTEM_PROMPT = `You are the Overlay Edge Neural Bridge — an expert sports betting analyst and autonomous browser agent.
Your role is to:
1. Analyze sports betting data, odds, and edges using Kelly Criterion and EV+ logic
2. Answer questions about bet sizing, line value, strategy optimization
3. Interpret bet history and surface actionable insights
4. Simulate browser automation tasks (logging into sportsbooks, reading odds) when asked

Be concise, sharp, and data-driven. Never give generic advice. Always tie recommendations to actual numbers when available.
Format responses in plain text, no markdown headers. Max 3 paragraphs unless user asks for more detail.`;

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  status: 'info' | 'success' | 'warning' | 'tool' | 'error';
}

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  status?: 'processing' | 'done';
}

type EngineMode = 'deepseek' | 'windowai';

declare global {
  interface Window {
    ai?: {
      languageModel?: {
        capabilities: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>;
        create: (opts?: any) => Promise<{ prompt: (input: string) => Promise<string> }>;
      };
    };
  }
}

export default function Agent() {
  const settings = useLiveQuery(() => db.settings.get(1));

  const [engineMode, setEngineMode] = useState<EngineMode>('deepseek');
  const [windowAiAvailable, setWindowAiAvailable] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeMode, setActiveMode] = useState<'console' | 'chat'>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      content: 'Neural Bridge initialized. DeepSeek-R1 cloud engine active. Ask me to analyze lines, size bets, or sync live odds.',
      timestamp: new Date(),
      status: 'done',
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real window.ai capability check on mount
  useEffect(() => {
    const checkWindowAi = async () => {
      addLog('Probing browser AI capabilities...', 'info');
      try {
        if (typeof window !== 'undefined' && window.ai?.languageModel) {
          const caps = await window.ai.languageModel.capabilities();
          if (caps.available === 'readily') {
            setWindowAiAvailable(true);
            addLog('window.ai: Gemma Nano AVAILABLE (Chrome built-in)', 'success');
          } else if (caps.available === 'after-download') {
            setWindowAiAvailable(false);
            addLog('window.ai: Gemma Nano requires download — defaulting to DeepSeek', 'warning');
          } else {
            setWindowAiAvailable(false);
            addLog('window.ai: Not supported in this browser — using DeepSeek cloud', 'info');
          }
        } else {
          setWindowAiAvailable(false);
          addLog('window.ai API not detected — DeepSeek cloud active', 'info');
        }
      } catch {
        setWindowAiAvailable(false);
        addLog('AI capability check failed — defaulting to DeepSeek', 'warning');
      }
      addLog('Neural Bridge ready', 'success');
    };
    checkWindowAi();
  }, []);

  const addLog = (message: string, status: LogEntry['status'] = 'info') => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      status,
    };
    setLogs(prev => [entry, ...prev].slice(0, 100));
  };

  const updateLastAgentMessage = (id: string, content: string) => {
    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, content, status: 'done' as const } : m
    ));
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isExecuting) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      status: 'done',
    };

    const agentMsgId = (Date.now() + 1).toString();
    const agentPlaceholder: Message = {
      id: agentMsgId,
      role: 'agent',
      content: `Processing via ${engineMode === 'windowai' ? 'Gemma Nano' : 'DeepSeek-R1'}...`,
      timestamp: new Date(),
      status: 'processing',
    };

    setMessages(prev => [...prev, userMsg, agentPlaceholder]);
    setInput('');
    setIsExecuting(true);

    const lower = trimmed.toLowerCase();

    try {
      // Odds sync command
      if (lower.includes('odds') || lower.includes('sync') || lower.includes('markets')) {
        addLog('Initiating Odds API sync — NBA...', 'tool');
        const count = await syncLiveOdds('basketball_nba');
        addLog(`Sync complete: ${count} games updated`, 'success');
        updateLastAgentMessage(agentMsgId,
          `Synced ${count} NBA games from The Odds API. Data is now indexed in your local database. Run “analyze markets” to find EV+ opportunities.`
        );
        return;
      }

      // Build full conversation history for stateful context
      const history = messages
        .filter(m => m.status === 'done')
        .slice(-12) // last 12 turns for context window management
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant' as const, content: m.content }));

      // Try window.ai (Gemma Nano) first if selected and available
      if (engineMode === 'windowai' && windowAiAvailable && window.ai?.languageModel) {
        addLog('Routing to window.ai Gemma Nano...', 'tool');
        const session = await window.ai.languageModel.create({
          systemPrompt: SYSTEM_PROMPT,
        });
        const contextPrompt = history.map(h => `${h.role}: ${h.content}`).join('\n') + `\nuser: ${trimmed}`;
        const reply = await session.prompt(contextPrompt);
        addLog('Gemma Nano inference complete', 'success');
        updateLastAgentMessage(agentMsgId, reply);
        return;
      }

      // DeepSeek cloud with full conversation history
      addLog('Routing to DeepSeek API...', 'tool');
      const response = await fetch('/api/chat/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: trimmed },
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const reply = data.choices[0]?.message?.content ?? 'No response received.';
      addLog('DeepSeek response received', 'success');
      updateLastAgentMessage(agentMsgId, reply);

    } catch (err: any) {
      addLog(`Error: ${err.message}`, 'error');
      updateLastAgentMessage(agentMsgId,
        `Error: ${err.message}. Check your DeepSeek API key in Settings → APIs.`
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleOddsSync = async () => {
    addLog('Manual odds sync triggered', 'tool');
    try {
      const count = await syncLiveOdds('basketball_nba');
      addLog(`Synced ${count} games`, 'success');
    } catch (err: any) {
      addLog(`Sync failed: ${err.message}`, 'error');
    }
  };

  const clearConversation = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'agent',
      content: 'Conversation cleared. Neural Bridge standing by.',
      timestamp: new Date(),
      status: 'done',
    }]);
    addLog('Conversation history cleared', 'info');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] pb-20 px-2">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">NEURAL BRIDGE</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-mono italic">Autonomous Execution Agent</p>
        </div>
        <div className="flex items-center gap-2">
          {windowAiAvailable === true && (
            <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
              GEMMA LOCAL
            </span>
          )}
          <button onClick={clearConversation}
            className="text-[9px] font-bold text-gray-500 hover:text-gray-300 uppercase">
            Clear
          </button>
        </div>
      </header>

      {/* Engine & Mode toggles */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
          <button onClick={() => setEngineMode('deepseek')}
            className={cn('px-3 py-1.5 text-[10px] font-bold rounded-md transition-all',
              engineMode === 'deepseek' ? 'bg-brand-secondary text-white' : 'text-gray-500'
            )}>
            DEEPSEEK
          </button>
          <button
            onClick={() => setEngineMode('windowai')}
            disabled={!windowAiAvailable}
            className={cn('px-3 py-1.5 text-[10px] font-bold rounded-md transition-all',
              engineMode === 'windowai' ? 'bg-brand-primary text-white' : 'text-gray-500',
              !windowAiAvailable && 'opacity-30 cursor-not-allowed'
            )}>
            GEMMA
          </button>
        </div>
        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 ml-auto">
          <button onClick={() => setActiveMode('chat')}
            className={cn('px-3 py-1.5 text-[10px] font-bold rounded-md transition-all',
              activeMode === 'chat' ? 'bg-brand-primary text-white' : 'text-gray-500'
            )}>
            CHAT
          </button>
          <button onClick={() => setActiveMode('console')}
            className={cn('px-3 py-1.5 text-[10px] font-bold rounded-md transition-all',
              activeMode === 'console' ? 'bg-brand-primary text-white' : 'text-gray-500'
            )}>
            LOGS
          </button>
        </div>
        <button onClick={handleOddsSync}
          className="p-2 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-brand-secondary" />
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto glass-panel p-3 space-y-2 min-h-0">
        {activeMode === 'console' ? (
          // Log view
          <div className="font-mono text-[9px] space-y-1">
            {logs.length === 0 && (
              <p className="text-gray-600 italic">No log entries yet.</p>
            )}
            {logs.map(log => (
              <div key={log.id} className={cn('flex gap-2',
                log.status === 'success' ? 'text-green-400' :
                log.status === 'error' ? 'text-red-400' :
                log.status === 'warning' ? 'text-yellow-400' :
                log.status === 'tool' ? 'text-brand-secondary' : 'text-gray-500'
              )}>
                <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        ) : (
          // Chat view
          <div className="space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-brand-primary/20 border border-brand-primary/30 text-white'
                    : 'bg-white/5 border border-white/5 text-gray-200'
                )}>
                  {msg.role === 'agent' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot className="w-3 h-3 text-brand-secondary" />
                      <span className="text-[9px] font-bold text-brand-secondary uppercase">Neural Bridge</span>
                    </div>
                  )}
                  {msg.content}
                  {msg.status === 'processing' && (
                    <Loader2 className="w-3 h-3 animate-spin text-brand-primary mt-1" />
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="mt-3 relative">
        <input
          type="text"
          value={input}
          disabled={isExecuting}
          onChange={e => setInput(e.target.value)}
          placeholder={activeMode === 'chat' ? "Ask the agent (e.g. 'Analyze my NBA bets')..." : 'Switch to CHAT to send messages'}
          className="w-full bg-bg-surface p-3 pr-16 rounded-xl text-xs font-mono border border-white/5 outline-none focus:border-brand-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isExecuting || !input.trim() || activeMode === 'console'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-primary rounded-lg disabled:opacity-30 transition-opacity">
          {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>

      {/* Footer status */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-[9px] font-mono text-gray-600">
          {engineMode === 'deepseek' ? 'DeepSeek-R1 · Cloud' : 'Gemma Nano · Local'}
        </span>
        <span className="text-[9px] font-mono text-gray-600">
          {messages.filter(m => m.role === 'user').length} turns · {messages.length} msgs in context
        </span>
      </div>
    </div>
  );
}
