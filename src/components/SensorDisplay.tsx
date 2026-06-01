import { useAppStore } from '../lib/store';
import { Thermometer, Droplets } from 'lucide-react';
import { motion } from 'motion/react';

export function SensorDisplay() {
  const { temperature, humidity } = useAppStore();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shrink-0"
    >
      <h3 className="text-xs font-semibold text-white/50 uppercase mb-4 tracking-wider">Environment Metrics</h3>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-light text-white">{temperature}<span className="text-lg text-blue-400 ml-1">°C</span></p>
            <p className="text-[10px] text-white/40 uppercase mt-1">Temperature</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
            <Thermometer className="w-6 h-6 text-orange-400" />
          </div>
        </div>
        
        <div className="h-[1px] w-full bg-white/5"></div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-light text-white">{humidity}<span className="text-lg text-teal-400 ml-1">%</span></p>
            <p className="text-[10px] text-white/40 uppercase mt-1">Humidity</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
            <Droplets className="w-6 h-6 text-teal-400" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
