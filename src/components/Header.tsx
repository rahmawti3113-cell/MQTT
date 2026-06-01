import React, { useEffect } from 'react';
import { useAppStore, BROKERS } from '../lib/store';
import { Settings2, Loader2 } from 'lucide-react';

export function Header() {
  const { activeBroker, connectionStatus, connect, disconnect } = useAppStore();

  useEffect(() => {
    // Auto-connect on mount
    connect(activeBroker);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBrokerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    connect(e.target.value);
  };

  const brokerInfo = BROKERS.find(b => b.id === activeBroker);

  return (
    <header className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-6 sm:px-8 py-4 sm:py-6 backdrop-blur-md bg-white/5 border-b border-white/10 shrink-0">
      <div className="flex items-center gap-4 w-full sm:w-auto mb-4 sm:mb-0 justify-center sm:justify-start">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] shrink-0">
          <Settings2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white leading-tight">IOT COMMAND CENTER</h1>
          <p className="text-[10px] sm:text-xs text-blue-300 uppercase tracking-widest">ESP32 Gateway</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
        <div className="flex flex-col items-start sm:items-end hidden sm:flex">
          <span className="text-[10px] text-white/50 uppercase">Active Broker</span>
          <span className="text-xs sm:text-sm font-mono text-emerald-400">{brokerInfo?.name || activeBroker}</span>
        </div>
        <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
          connectionStatus === 'Connected' ? 'bg-emerald-500/10 border-emerald-500/30' : 
          connectionStatus === 'Connecting' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-rose-500/10 border-rose-500/30'
        }`}>
          {connectionStatus === 'Connected' ? (
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          ) : connectionStatus === 'Connecting' ? (
            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400 animate-spin" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
          )}
          <span className={`text-[10px] sm:text-xs font-medium uppercase tracking-tighter ${
            connectionStatus === 'Connected' ? 'text-emerald-400' : 
            connectionStatus === 'Connecting' ? 'text-indigo-400' : 'text-rose-400'
          }`}>
            {connectionStatus}
          </span>
        </div>

        <select 
          value={activeBroker}
          onChange={handleBrokerChange}
          className="bg-white/5 border border-white/10 text-white text-[10px] sm:text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 sm:p-2 backdrop-blur-md outline-none"
        >
          {BROKERS.map((broker) => (
            <option key={broker.id} value={broker.id} className="bg-slate-900 text-white">
              {broker.id}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
