import { create } from 'zustand';
import mqtt from 'mqtt';

export type LogEntry = {
  id: string;
  time: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'command';
};

const getProxyUrl = (targetHost: string, targetPort: number) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/mqtt-proxy?host=${targetHost}&port=${targetPort}`;
};

export const BROKERS = [
  {
    id: 'BROKER1',
    name: 'BROKER1 (CloudAMQP)',
    url: getProxyUrl('kingfisher.lmq.cloudamqp.com', 8883),
    options: {
      username: 'ztmxasef:ztmxasef',
      password: 'AxprRMcQ9pDWkyWqcCZa_q2fuTBWQsGE',
      protocol: 'ws' as const,
      protocolVersion: 4 as const,
      clean: true,
      reconnectPeriod: 5000,
    },
  },
  {
    id: 'BROKER2',
    name: 'BROKER2 (Cedalo)',
    url: getProxyUrl('pf-26xt4cmufmfw6kr1zpyq.cedalo.cloud', 8883),
    options: {
      username: 'Web',
      password: 'a',
      protocol: 'ws' as const,
      protocolVersion: 4 as const,
      clean: true,
      reconnectPeriod: 5000,
    },
  },
  {
    id: 'BROKER3',
    name: 'BROKER3 (Ably)',
    url: getProxyUrl('mqtt.ably.io', 8883),
    options: {
      username: '2fHRLg.LixlRg',
      password: 'bhjvIdszO--QR4JqK4eIcdA2aAbwO0vGNN_kJOPucnQ',
      protocol: 'ws' as const,
      protocolVersion: 4 as const,
      clean: true,
      reconnectPeriod: 5000,
    },
  },
];

interface AppState {
  client: mqtt.MqttClient | null;
  activeBroker: string;
  connectionStatus: 'Disconnected' | 'Connecting' | 'Connected' | 'Error';
  temperature: string;
  humidity: string;
  relays: { [key: string]: string };
  variasiMode: number;
  activityLog: LogEntry[];
  
  connect: (brokerId: string) => void;
  disconnect: () => void;
  publishCommand: (topic: string, message: string, silent?: boolean) => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
  setRelayState: (id: string, state: string) => void;
  setTemperature: (temp: string) => void;
  setHumidity: (hum: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  client: null,
  activeBroker: 'BROKER1',
  connectionStatus: 'Disconnected',
  temperature: '--',
  humidity: '--',
  relays: {
    relay1: 'OFF',
    relay2: 'OFF',
    relay3: 'OFF',
    relay4: 'OFF',
  },
  variasiMode: 0,
  activityLog: [],

  addLog: (message, type = 'info') => {
    set((state) => ({
      activityLog: [
        { id: Math.random().toString(36).substr(2, 9), time: new Date(), message, type },
        ...state.activityLog,
      ].slice(0, 100), // Keep last 100 entries
    }));
  },

  connect: (brokerId: string) => {
    const state = get();
    if (state.client) {
      state.client.end(true);
      state.addLog('Disconnected from previous broker.', 'info');
    }

    const brokerConfig = BROKERS.find((b) => b.id === brokerId);
    if (!brokerConfig) return;

    set({ connectionStatus: 'Connecting', activeBroker: brokerId });
    state.addLog(`Connecting to ${brokerConfig.name}...`, 'info');

    try {
      // Create dynamic options per connection to prevent clientId collision
      const connectOptions = {
        ...brokerConfig.options,
        clientId: `WebClient_${Math.random().toString(16).slice(2, 10)}`,
      };

      const newClient = mqtt.connect(brokerConfig.url, connectOptions);

      newClient.on('connect', () => {
        set({ connectionStatus: 'Connected' });
        get().addLog(`Successfully connected to ${brokerConfig.name}`, 'success');
        
        // Subscribe to topics
        newClient.subscribe('sensor/suhu');
        newClient.subscribe('sensor/kelembaban');
        newClient.subscribe('kontrol/relay1');
        newClient.subscribe('kontrol/relay2');
        newClient.subscribe('kontrol/relay3');
        newClient.subscribe('kontrol/relay4');
        newClient.subscribe('kontrol/variasi1');
        newClient.subscribe('kontrol/variasi2');
        newClient.subscribe('kontrol/broker');
      });

      newClient.on('error', (err) => {
        console.error('MQTT Error: ', err);
        set({ connectionStatus: 'Error' });
        get().addLog(`Connection error: ${err.message}`, 'error');
      });

      newClient.on('close', () => {
        if (get().connectionStatus !== 'Disconnected') {
           set({ connectionStatus: 'Disconnected' });
           get().addLog('Connection closed.', 'error');
        }
      });

      newClient.on('message', (topic, message) => {
        const payload = message.toString().trim();
        // get().addLog(`[${topic}] ${payload}`); // Optionally log all messages
        
        if (topic === 'sensor/suhu') {
          set({ temperature: payload });
        } else if (topic === 'sensor/kelembaban') {
          set({ humidity: payload });
        } else if (topic.startsWith('kontrol/relay')) {
          const id = topic.replace('kontrol/', '');
          set((s) => ({ relays: { ...s.relays, [id]: payload } }));
          // If a relay turns on visually we might want to shut off variasi memory
          if (payload === 'ON') {
             set({ variasiMode: 0 });
          }
        } else if (topic === 'kontrol/variasi1') {
          if (payload === 'START') {
            set({ variasiMode: 1 });
            get().addLog('Variasi 1 Dimulai', 'info');
          } else if (payload === 'STOP') {
            set({ variasiMode: 0 });
            get().addLog('Variasi 1 Dihentikan', 'info');
          }
        } else if (topic === 'kontrol/variasi2') {
          if (payload === 'START') {
            set({ variasiMode: 2 });
            get().addLog('Variasi 2 Dimulai', 'info');
          } else if (payload === 'STOP') {
            set({ variasiMode: 0 });
            get().addLog('Variasi 2 Dihentikan', 'info');
          }
        } else if (topic === 'kontrol/broker') {
          // If device asks to change broker, maybe we reflect that
          get().addLog(`Device requested broker change to: ${payload}`, 'info');
        }
      });

      set({ client: newClient });
    } catch (err: any) {
      set({ connectionStatus: 'Error' });
      state.addLog(`Failed to initialize MQTT: ${err.message}`, 'error');
    }
  },

  disconnect: () => {
    const { client } = get();
    if (client) {
      client.end(true);
      set({ client: null, connectionStatus: 'Disconnected' });
      get().addLog('Disconnected by user.', 'info');
    }
  },

  publishCommand: (topic: string, message: string, silent = false) => {
    const { client, connectionStatus } = get();
    if (client && connectionStatus === 'Connected') {
      client.publish(topic, message);
      if (!silent) {
        get().addLog(`Command sent: [${topic}] ${message}`, 'command');
      }
    } else {
      get().addLog(`Failed to send command [${topic}]. Not connected.`, 'error');
    }
  },

  setRelayState: (id: string, state: string) => {
    set((s) => ({ relays: { ...s.relays, [id]: state } }));
  },

  setTemperature: (temp: string) => set({ temperature: temp }),
  setHumidity: (hum: string) => set({ humidity: hum }),
}));
