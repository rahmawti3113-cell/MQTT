import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { motion } from 'motion/react';

// Setup Speech Recognition
const SpeechRecognition = 
  (window as any).SpeechRecognition || 
  (window as any).webkitSpeechRecognition;

export function VoiceControl() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  
  const { publishCommand, temperature, humidity, activeBroker } = useAppStore();

  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'id-ID';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const tstr = event.results[current][0].transcript.toLowerCase();
      setTranscript(tstr);
      handleCommand(tstr);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [temperature, humidity, activeBroker]);

  const handleCommand = (cmd: string) => {
    let handled = false;
    
    // Suhu / Kelembaban
    if (cmd.includes('suhu')) {
      speak(`Suhu saat ini adalah ${temperature} derajat celcius`);
      handled = true;
    } else if (cmd.includes('kelembaban') || cmd.includes('lembab')) {
      speak(`Kelembaban saat ini adalah ${humidity} persen`);
      handled = true;
    }

    // Variasi
    else if (cmd.includes('variasi satu') || cmd.includes('variasi 1')) {
      if (cmd.includes('stop') || cmd.includes('henti') || cmd.includes('matikan')) {
        publishCommand('kontrol/variasi1', 'STOP');
      } else {
        publishCommand('kontrol/variasi1', 'START');
      }
      speak("Perintah variasi satu dilaksanakan");
      handled = true;
    }
    else if (cmd.includes('variasi dua') || cmd.includes('variasi 2')) {
      if (cmd.includes('stop') || cmd.includes('henti') || cmd.includes('matikan')) {
        publishCommand('kontrol/variasi2', 'STOP');
      } else {
        publishCommand('kontrol/variasi2', 'START');
      }
      speak("Perintah variasi dua dilaksanakan");
      handled = true;
    }

    // Relay Control
    else if (cmd.includes('relay')) {
      let rId = 0;
      if (cmd.includes('satu') || cmd.includes('1')) rId = 1;
      if (cmd.includes('dua') || cmd.includes('2')) rId = 2;
      if (cmd.includes('tiga') || cmd.includes('3')) rId = 3;
      if (cmd.includes('empat') || cmd.includes('4')) rId = 4;
      
      if (rId !== 0) {
        if (cmd.includes('nyala') || cmd.includes('hidup')) {
          publishCommand(`kontrol/relay${rId}`, 'ON');
          speak(`Relay ${rId} dinyalakan`);
        } else if (cmd.includes('mati')) {
          publishCommand(`kontrol/relay${rId}`, 'OFF');
          speak(`Relay ${rId} dimatikan`);
        }
        handled = true;
      }
    }

    // Pindah Broker (e.g. "Pindah broker dua")
    else if (cmd.includes('broker')) {
      let bId = 0;
      if (cmd.includes('satu') || cmd.includes('1')) bId = 1;
      if (cmd.includes('dua') || cmd.includes('2')) bId = 2;
      if (cmd.includes('tiga') || cmd.includes('3')) bId = 3;
      if (bId !== 0) {
        publishCommand('kontrol/broker', `BROKER${bId}`);
        speak(`Permintaan pindah ke broker ${bId} dikirim`);
        handled = true;
      }
    }

    if (!handled) {
      speak("Perintah tidak dikenali");
    }
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'id-ID';
    window.speechSynthesis.speak(msg);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
    }
  };

  if (!SpeechRecognition) {
    return (
      <div className="flex-1 p-6 rounded-3xl bg-blue-600/10 border border-blue-500/20 backdrop-blur-xl flex flex-col items-center justify-center text-center -mt-6 lg:mt-0">
        <h4 className="font-bold mb-2 text-white">Voice Assistant</h4>
        <p className="text-sm text-rose-400">Speech Recognition tidak didukung di browser ini.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 rounded-3xl bg-blue-600/10 border border-blue-500/20 backdrop-blur-xl flex flex-col items-center justify-center text-center h-full min-h-[250px]">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={isListening ? { scale: [1, 1.05, 1], boxShadow: ["0 0 20px rgba(59,130,246,0.3)", "0 0 40px rgba(59,130,246,0.6)", "0 0 20px rgba(59,130,246,0.3)"] } : { boxShadow: "0 0 20px rgba(59,130,246,0.2)" }}
        transition={{ repeat: isListening ? Infinity : 0, duration: 1.5 }}
        onClick={toggleListening}
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-6 cursor-pointer transition-colors ${
          isListening ? 'bg-blue-400 text-white' : 'bg-blue-500 text-white hover:bg-blue-400'
        }`}
      >
        {isListening ? <Mic className="w-8 h-8 sm:w-10 sm:h-10" /> : <MicOff className="w-8 h-8 sm:w-10 sm:h-10" />}
      </motion.button>
      
      <h4 className="font-bold mb-2 text-white text-sm sm:text-base">Voice Assistant</h4>
      <div className="h-10 mb-4 flex items-center justify-center flex-col">
        {isListening ? (
          <p className="text-xs text-blue-300 font-medium animate-pulse">Sebutkan perintah (ID)...</p>
        ) : (
          <p className="text-[10px] sm:text-xs text-white/60 leading-relaxed truncate max-w-[200px]">
            {transcript ? `"${transcript}"` : 'Coba: "Nyalakan Relay 1"'}
          </p>
        )}
      </div>

      <div className="flex gap-1 items-end h-6 mt-auto">
        <div className={`w-1 bg-blue-400 rounded-full ${isListening ? 'animate-pulse h-3' : 'h-1'}`}></div>
        <div className={`w-1 bg-blue-400 rounded-full ${isListening ? 'animate-pulse delay-75 h-5' : 'h-1'}`}></div>
        <div className={`w-1 bg-blue-400 rounded-full ${isListening ? 'animate-pulse delay-100 h-2' : 'h-1'}`}></div>
        <div className={`w-1 bg-blue-400 rounded-full ${isListening ? 'animate-pulse delay-150 h-6' : 'h-1'}`}></div>
      </div>
    </div>
  );
}
