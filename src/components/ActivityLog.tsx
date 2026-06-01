import { useAppStore } from '../lib/store';
import { Terminal } from 'lucide-react';
import { useEffect, useRef } from 'react';

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(date);
};

export function ActivityLog() {
  const { activityLog } = useAppStore();
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to top or handle based on store behavior (prepended to list)
  }, [activityLog]);

  return (
    <div className="flex-1 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col overflow-hidden h-full">
      <div className="p-5 sm:p-6 border-b border-white/10 flex justify-between items-center shrink-0">
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          Activity Log
        </h4>
        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse"></div>
      </div>
      
      <div 
        ref={logContainerRef}
        className="flex-1 p-4 sm:p-6 font-mono text-[10px] sm:text-xs overflow-y-auto space-y-3"
      >
        {activityLog.length === 0 ? (
          <div className="text-white/40 text-center mt-4">Waiting for connection & events...</div>
        ) : (
          activityLog.map((log) => {
            let label = '[INFO]';
            let labelColor = 'text-blue-400';
            
            if (log.type === 'success') {
               label = '[SUCCESS]';
               labelColor = 'text-emerald-400';
            } else if (log.type === 'error') {
               label = '[ERROR]';
               labelColor = 'text-rose-400';
            } else if (log.type === 'command') {
               label = '[COMMAND]';
               labelColor = 'text-purple-400';
            }
            
            return (
              <div key={log.id} className="flex gap-2 text-white/60 items-start">
                <span className="shrink-0 w-[55px] sm:w-[65px]">[{formatTime(log.time)}]</span>
                <span className={`${labelColor} shrink-0 w-[60px] sm:w-[70px] uppercase`}>{label}</span>
                <span className="text-white/80 break-words flex-1">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
      
      <div className="p-4 border-t border-white/10 shrink-0">
        <p className="text-[9px] text-white/30 text-center uppercase tracking-widest">Real-time Stream Active</p>
      </div>
    </div>
  );
}
