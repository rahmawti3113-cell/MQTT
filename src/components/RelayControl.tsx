import { useAppStore } from '../lib/store';
import { Power, Play, Square, AlertOctagon } from 'lucide-react';
import { motion } from 'motion/react';

export function RelayControl() {
  const { relays, variasiMode, publishCommand } = useAppStore();

  const toggleRelay = (id: string, currentState: string) => {
    const newState = currentState === 'ON' ? 'OFF' : 'ON';
    publishCommand(`kontrol/${id}`, newState);
  };

  const toggleVariasi = (mode: 1 | 2) => {
    if (variasiMode === mode) {
      publishCommand(`kontrol/variasi${mode}`, 'STOP');
    } else {
      publishCommand(`kontrol/variasi${mode}`, 'START');
    }
  };

  const stopAll = () => {
    if (variasiMode !== 0) publishCommand(`kontrol/variasi${variasiMode}`, 'STOP');
    ['relay1', 'relay2', 'relay3', 'relay4'].forEach(r => {
      if (relays[r] === 'ON') publishCommand(`kontrol/${r}`, 'OFF');
    });
  }

  const getRelayName = (id: string) => {
    switch (id) {
      case 'relay1': return 'Main Lighting';
      case 'relay2': return 'Exhaust Fan';
      case 'relay3': return 'Irrigation Valve';
      case 'relay4': return 'Security Lock';
      default: return id;
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:flex-1 min-h-[300px]">
        {['relay1', 'relay2', 'relay3', 'relay4'].map((res, i) => {
           const isOn = relays[res] === 'ON';
           return (
            <motion.div
              key={res}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleRelay(res, relays[res])}
              className={`p-4 sm:p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col justify-between group cursor-pointer transition-all ${
                isOn ? 'bg-white/10 border-blue-500/30' : 'hover:bg-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm text-white transition-colors shrink-0 ${
                  isOn ? 'bg-blue-500/40 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/10 group-hover:bg-blue-500/20'
                }`}>
                  R{i + 1}
                </div>
                
                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 transition-colors shrink-0 ${
                  isOn ? 'bg-emerald-500 shadow-inner shadow-emerald-700/50' : 'bg-white/20'
                }`}>
                  <motion.div 
                    initial={false}
                    animate={{ x: isOn ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-4 h-4 rounded-full shadow-sm ${isOn ? 'bg-white' : 'bg-white/40'}`} 
                  />
                </div>
              </div>
              <div className="mt-8">
                <h5 className="font-bold text-white text-sm sm:text-base">{getRelayName(res)}</h5>
                <p className={`text-[10px] uppercase tracking-widest font-semibold mt-1 ${
                  isOn ? 'text-emerald-400' : 'text-white/40'
                }`}>
                  Status: {isOn ? 'ON' : 'OFF'}
                </p>
              </div>
            </motion.div>
           );
        })}
      </div>

      <div className="p-5 sm:p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Sequence Control</h4>
          <button 
            onClick={stopAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[10px] uppercase font-bold text-rose-400 hover:bg-rose-500/30 transition-colors"
          >
            <AlertOctagon className="w-3 h-3 hidden sm:block" />
            <span>Emergency STOP</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => toggleVariasi(1)}
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group ${
              variasiMode === 1 
                ? 'bg-blue-600/20 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                : 'bg-white/5 border-white/10 hover:bg-blue-500/10 hover:border-blue-500/20'
            }`}
          >
            <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors ${
              variasiMode === 1 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40' 
                : 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white'
            }`}>
               {variasiMode === 1 ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-white mb-0.5">VARIASI 1</span>
              <span className="block text-[10px] text-white/50 uppercase tracking-wide">Loop 1 → 2 → 3 → 4</span>
            </div>
          </button>

          <button
            onClick={() => toggleVariasi(2)}
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group ${
              variasiMode === 2 
                ? 'bg-purple-600/20 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]' 
                : 'bg-white/5 border-white/10 hover:bg-purple-500/10 hover:border-purple-500/20'
            }`}
          >
            <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors ${
              variasiMode === 2 
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/40' 
                : 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white'
            }`}>
               {variasiMode === 2 ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current rotate-180" />}
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-white mb-0.5">VARIASI 2</span>
              <span className="block text-[10px] text-white/50 uppercase tracking-wide">Loop 4 → 3 → 2 → 1</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
