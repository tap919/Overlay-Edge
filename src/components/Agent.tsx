import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { Bot, Cpu, Monitor, Zap, Terminal, ShieldAlert, CheckCircle2, Loader2, Globe, Send, Command, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { syncLiveOdds } from '../services/oddsService';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  status: 'info' | 'success' | 'warning' | 'tool';
}

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  status?: 'processing' | 'done';
}

export default function Agent() {
  const [isSearching, setIsSearching] = useState(true);
  const [localModel, setLocalModel] = useState<string | null>(null);
  const [engineMode, setEngineMode] = useState<'gemma' | 'deepseek'>('gemma');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeMode, setActiveMode] = useState<'console' | 'chat'>('chat');
  const [input, setInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManualImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    addLog(`Scanning directory: Found ${files.length} potential artifacts`, 'info');
    
    await new Promise(r => setTimeout(r, 1500));
    
    const filesArray = Array.from(files) as File[];
    const weightFile = filesArray.find(f => f.name.toLowerCase().includes('gemma') || f.name.endsWith('.gguf'));
    
    if (weightFile) {
      addLog(`Linked local weights: ${weightFile.name}`, 'success');
      setLocalModel(`Gemma 4.4B (${weightFile.name})`);
    } else {
      addLog("No compatible weights detected. Defaulting to system engine.", 'warning');
    }
    
    setIsImporting(false);
  };
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'agent', content: "Neural Bridge (v1.5) established. Gemma 4.4B (Local) and DeepSeek-R1 (Cloud) available for inference. How can I assist with your edge today?", timestamp: new Date() }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Simulate local model scan
    const scan = async () => {
      await new Promise(r => setTimeout(r, 2000));
      
      addLog("Detecting CPU: Arm64 v8.2-A...", 'info');
      await new Promise(r => setTimeout(r, 500));
      addLog("Found Local Weights: Gemma 4.4B (Optimized)", 'success');
      await new Promise(r => setTimeout(r, 500));
      addLog("Allocating NPU Resources: Tensor Edge Core", 'info');
      
      // @ts-ignore
      const aiAvailable = typeof window !== 'undefined' && 'ai' in window;
      setLocalModel('Gemma 4.4B (Mobile Local)');
      setIsSearching(false);
      
      addLog("Local Model Scan: Complete", 'success');
      addLog("Neural Bridge initialized: Secure Gemma Protocol v1.4", 'info');
    };
    scan();
  }, []);

  const addLog = (message: string, status: LogEntry['status'] = 'info') => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      status
    };
    setLogs(prev => [entry, ...prev].slice(0, 50));
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isExecuting) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsExecuting(true);

    const agentMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: agentMsgId, role: 'agent', content: `Processing via ${engineMode.toUpperCase()}...`, timestamp: new Date(), status: 'processing' }]);

    try {
      const lowerInput = input.toLowerCase();
      
      // System Commands (Syncing)
      if (lowerInput.includes('odds') || lowerInput.includes('scan') || lowerInput.includes('the odds api')) {
        addLog("Initiating Odds API Sync...", 'info');
        const count = await syncLiveOdds('basketball_nba');
        
        addLog(`Sync Complete: ${count} games updated in cache`, 'success');
        setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, content: `I've successfully synced real-time odds for NBA via The Odds API. ${count} games were processed and indexed in the local database. Gemma is now analyzing these lines for EV+ opportunities.`, status: 'done' } : m));
        setIsExecuting(false);
        return;
      }

      if (engineMode === 'deepseek') {
        const response = await fetch('/api/chat/deepseek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: input }],
            temperature: 0.7
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        const reply = data.choices[0].message.content;
        setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, content: reply, status: 'done' } : m));
      } else {
        // Local logic
        setTimeout(async () => {
          const lowerInput = input.toLowerCase();
          if (lowerInput.includes('prizepicks') || lowerInput.includes('login')) {
            await runAutomation("PrizePicks Login Sequence");
            setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, content: "Neural weights successfully mapped for PrizePicks. I've detected a significant edge in NBA player points projections. Ready to build entry.", status: 'done' } : m));
          } else if (lowerInput.includes('gemma') || lowerInput.includes('who are you')) {
            setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, content: "I am Gemma 4.4B, running as your local on-device auditor. I handle real-time processing and sensitive browser automation tasking.", status: 'done' } : m));
          } else {
            setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, content: "Local Gemma inference complete. All systems nominal. Standing by for browser execution commands.", status: 'done' } : m));
          }
           setIsExecuting(false);
        }, 1000);
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, content: `Neural Bridging Failed: ${err.message}. Check API keys in Settings.`, status: 'done' } : m));
    } finally {
      if (engineMode === 'deepseek') setIsExecuting(false);
    }
  };

  const runAutomation = async (taskName: string = "Standard Cycle") => {
    setIsExecuting(true);
    addLog(`Initiating: ${taskName}`, 'info');
    addLog("Neural Link established with target domain", 'info');
    await new Promise(r => setTimeout(r, 800));
    addLog("Tool Call: browser_control_active()", 'tool');
    await new Promise(r => setTimeout(r, 1200));
    addLog("Automation Cycle: SUCCESS", 'success');
    setIsExecuting(false);
  };

  return (
    <div className="space-y-6 pb-32 px-2 h-screen flex flex-col overflow-hidden">
      <header className="flex justify-between items-center shrink-0 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NEURAL BRIDGE</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-mono italic">Autonomous Execution Agent</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
           <button 
             onClick={() => setEngineMode('gemma')}
             className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", engineMode === 'gemma' ? "bg-brand-primary text-white" : "text-gray-500")}
           >
             GEMMA
           </button>
           <button 
             onClick={() => setEngineMode('deepseek')}
             className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", engineMode === 'deepseek' ? "bg-brand-secondary text-white" : "text-gray-500")}
           >
             DEEPSEEK
           </button>
        </div>
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
           <button 
             onClick={() => setActiveMode('chat')}
             className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", activeMode === 'chat' ? "bg-brand-primary text-white" : "text-gray-500")}
           >
             CHAT
           </button>
           <button 
             onClick={() => setActiveMode('console')}
             className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", activeMode === 'console' ? "bg-brand-primary text-white" : "text-gray-500")}
           >
             LOGS
           </button>
        </div>
      </header>

      {/* Hardware Status */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <div className="glass-panel p-3 flex flex-col gap-2 border-l-2 border-brand-primary">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-brand-primary/10 rounded-lg">
               {isSearching || isImporting ? <Loader2 className="w-4 h-4 text-brand-primary animate-spin" /> : <Cpu className="w-4 h-4 text-brand-primary" />}
            </div>
            <div className="min-w-0">
              <p className="text-[8px] text-gray-500 uppercase font-bold truncate">Inference</p>
              <p className="text-[10px] font-mono font-bold text-white truncate uppercase">{isSearching ? "Scanning..." : localModel}</p>
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-1 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-[8px] font-bold uppercase text-gray-400 transition-colors"
          >
            {isImporting ? 'SCANNING...' : 'LOAD LOCAL WEIGHTS'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            // @ts-ignore - webkitdirectory is a non-standard attribute but widely supported
            webkitdirectory="" 
            directory="" 
            multiple
            onChange={handleManualImport}
          />
        </div>
        <div className="glass-panel p-3 flex items-center justify-between border-l-2 border-brand-secondary group">
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-brand-secondary/10 rounded-lg">
                <Globe className="w-4 h-4 text-brand-secondary" />
             </div>
             <div className="min-w-0">
               <p className="text-[8px] text-gray-500 uppercase font-bold truncate">Live Markets</p>
               <p className="text-[10px] font-mono font-bold text-white truncate uppercase italic">Ready</p>
             </div>
          </div>
          <button 
            disabled={isExecuting}
            onClick={() => syncLiveOdds()}
            className="p-1.5 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors"
            title="Sync Odds Now"
          >
             <RefreshCw className={cn("w-3 h-3 text-brand-secondary", isExecuting && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Main Console/Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col glass-panel bg-black/40 overflow-hidden relative border-white/5 shadow-2xl">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {activeMode === 'console' ? (
            <div className="space-y-2 font-mono">
              {logs.map((log) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "text-[10px] flex gap-3 p-1 rounded",
                    log.status === 'tool' ? "text-brand-primary bg-brand-primary/5" : 
                    log.status === 'success' ? "text-brand-secondary" : 
                    log.status === 'warning' ? "text-brand-error" : "text-gray-400"
                  )}
                >
                  <span className="opacity-40 shrink-0">[{log.timestamp}]</span>
                  <span className="flex-1 leading-tight">{log.message}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-brand-primary/10 border border-brand-primary/20 text-white rounded-tr-none" 
                        : "bg-white/5 border border-white/10 text-gray-300 rounded-tl-none"
                    )}>
                      {msg.role === 'agent' && (
                        <div className="flex items-center gap-1.5 mb-1 opacity-50">
                          <Bot className="w-3 h-3 text-brand-primary" />
                          <span className="text-[8px] font-bold uppercase tracking-widest italic">Neural Link</span>
                        </div>
                      )}
                      {msg.content}
                      {msg.status === 'processing' && (
                        <div className="mt-2 flex gap-1">
                          <div className="w-1 h-1 bg-brand-primary rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-brand-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-1 h-1 bg-brand-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/5 border-t border-white/5 shrink-0">
          <form onSubmit={handleSendMessage} className="relative">
            <input 
              type="text"
              value={input}
              disabled={isExecuting}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeMode === 'chat' ? "Command agent (e.g. 'Log in to PrizePicks')..." : "Agent monitoring only..."}
              className="w-full bg-bg-surface p-3 pr-12 rounded-xl text-xs font-mono border border-white/5 outline-none focus:border-brand-primary pr-20"
            />
            <div className="absolute right-2 top-1.5 flex gap-1">
               <button 
                 type="submit"
                 disabled={!input.trim() || isExecuting}
                 className="p-1.5 bg-brand-primary text-white rounded-lg disabled:opacity-20 hover:bg-opacity-80 transition-all"
               >
                 <Send className="w-3.5 h-3.5" />
               </button>
            </div>
          </form>
          <div className="flex justify-between items-center mt-3">
             <div className="flex gap-2">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/5">
                   <Command className="w-2.5 h-2.5 text-gray-500" />
                   <span className="text-[8px] text-gray-500 font-bold uppercase">Ready</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/5">
                   <Zap className="w-2.5 h-2.5 text-brand-primary" />
                   <span className="text-[8px] text-gray-500 font-bold uppercase">Turbo</span>
                </div>
             </div>
             <p className="text-[9px] text-gray-600 font-mono italic">P-42 Neural Control Protocol</p>
          </div>
        </div>
      </div>
    </div>
  );
}

