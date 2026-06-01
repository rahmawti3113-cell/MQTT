/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Header } from './components/Header';
import { SensorDisplay } from './components/SensorDisplay';
import { RelayControl } from './components/RelayControl';
import { VoiceControl } from './components/VoiceControl';
import { ActivityLog } from './components/ActivityLog';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0c1a] font-sans text-white relative flex flex-col">
      {/* Background blurred circles */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/30 rounded-full blur-[120px]"></div>
        <div className="absolute top-[30%] right-[10%] w-[25%] h-[25%] bg-teal-500/20 rounded-full blur-[100px]"></div>
      </div>

      <Header />
      
      <main className="relative z-10 w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 flex-1 h-full">
        {/* Left Column - Env & Voice */}
        <section className="w-full lg:w-1/4 flex flex-col gap-6">
          <SensorDisplay />
          <VoiceControl />
        </section>

        {/* Center Column - Relays & Sequence */}
        <section className="w-full lg:flex-1 flex flex-col gap-6 shrink-0">
          <RelayControl />
        </section>

        {/* Right Column - Activity Log */}
        <section className="w-full lg:w-1/3 xl:w-1/4 flex flex-col lg:h-[calc(100vh-140px)] min-h-[400px]">
          <ActivityLog />
        </section>
      </main>
    </div>
  );
}

