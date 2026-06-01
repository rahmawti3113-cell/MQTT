import { create } from 'zustand';
import mqtt from 'mqtt';
import * as Ably from 'ably';

export type LogEntry = {
  id: string;
  time: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'command';
};

class AblyMqttWrapper {
  client: Ably.Realtime;
  listeners: { [key: string]: Function[] } = {};

  constructor(key: string) {
    this.client = new Ably.Realtime({ key });
    this.client.connection.on('connected', () => this.emit('connect'));
    this.client.connection.on('failed', (err) => this.emit('error', err));
    this.client.connection.on('closed', () => this.emit('close'));
    this.client.connection.on('disconnected', () => this.emit('close'));
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(...args));
    }
  }

  removeAllListeners() {
    this.listeners = {};
  }

  subscribe(topic: string) {
    const channel = this.client.channels.get(topic);
    channel.subscribe((msg) => {
      let payload = '';
      if (typeof msg.data === 'string') {
        payload = msg.data;
      } else if (msg.data instanceof ArrayBuffer || (msg.data && msg.data.buffer instanceof ArrayBuffer)) {
        payload = new TextDecoder().decode(new Uint8Array(msg.data as any));
      } else {
        payload = String(msg.data);
      }
      this.emit('message', topic, payload);
    });
  }

  publish(topic: string, message: string) {
    const channel = this.client.channels.get(topic);
    channel.publish(undefined, message);
  }

  end(force?: boolean) {
    this.client.close();
  }
}

export const BROKERS = [
  {
    id: 'BROKER1',
    name: 'BROKER1 (CloudAMQP)',
    url: 'wss://kingfisher.lmq.cloudamqp.com:443/mqtt',
    options: {
      username: 'ztmxasef:ztmxasef',
      password: 'AxprRMcQ9pDWkyWqcCZa_q2fuTBWQsGE',
      protocolVersion: 4 as const,
      clean: true,
      reconnectPeriod: 5000,
    },
    useAbly: false
  },
  {
    id: 'BROKER2',
    name: 'BROKER2 (Cedalo)',
    url: 'wss://pf-26xt4cmufmfw6kr1zpyq.cedalo.cloud:443/mqtt',
    options: {
      username: 'Web',
      password: 'a',
      clientId: 'WebClient',
      protocolVersion: 4 as const,
      clean: true,
      reconnectPeriod: 5000,
    },
    useAbly: false
  },
  {
    id: 'BROKER3',
    name: 'BROKER3 (Ably)',
    url: '', // connection handled by ably sdk
    options: {
      username: '2fHRLg.LixlRg',
      password: 'bhjvIdszO--QR4JqK4eIcdA2aAbwO0vGNN_kJOPucnQ',
    },
    useAbly: true
  },
];

interface AppState {
  client: any | null; // Allow our wrapper

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
    
    // Request ESP32 to switch broker BEFORE disconnecting from the current one
    if (state.client && state.connectionStatus === 'Connected') {
      state.client.publish('kontrol/broker', brokerId);
      state.addLog(`Mengirim instruksi ganti broker ke ESP32: ${brokerId}`, 'command');
    }

    if (state.client) {
      state.client.removeAllListeners(); // Prevent old events from interfering
      state.client.end(true);
      state.addLog('Disconnected from previous broker.', 'info');
    }

    const brokerConfig = BROKERS.find((b) => b.id === brokerId);
    if (!brokerConfig) return;

    set({ connectionStatus: 'Connecting', activeBroker: brokerId });
    state.addLog(`Connecting to ${brokerConfig.name}...`, 'info');

    try {
      let newClient: any;
      
      if (brokerConfig.useAbly) {
        newClient = new AblyMqttWrapper(`${brokerConfig.options.username}:${brokerConfig.options.password}`);
      } else {
        const connectOptions = {
          clientId: `WebClient_${Math.random().toString(16).slice(2, 10)}`,
          ...brokerConfig.options,
        };
        newClient = mqtt.connect(brokerConfig.url, connectOptions);
      }

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
