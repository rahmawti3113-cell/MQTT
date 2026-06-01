import mqtt from "mqtt";

console.log("Testing Broker 1 (CloudAMQP)...");
const c1 = mqtt.connect("wss://kingfisher.lmq.cloudamqp.com/ws", {
  username: "ztmxasef:ztmxasef",
  password: "AxprRMcQ9pDWkyWqcCZa_q2fuTBWQsGE",
  clientId: "webtest1_" + Math.random().toString(16).slice(2, 10),
});
c1.on('connect', () => { console.log('Broker 1 Connected (WSS)'); c1.end(); });
c1.on('error', (err) => { console.error('Broker 1 Error (WSS):', err.message); c1.end(); });

console.log("Testing Broker 2 (Cedalo)...");
const c2 = mqtt.connect("wss://pf-26xt4cmufmfw6kr1zpyq.cedalo.cloud", {
  username: "Web",
  password: "a",
  clientId: "webtest2_" + Math.random().toString(16).slice(2, 10),
});
c2.on('connect', () => { console.log('Broker 2 Connected (WSS)'); c2.end(); });
c2.on('error', (err) => { console.error('Broker 2 Error (WSS):', err.message); c2.end(); });

console.log("Testing Broker 3 (Ably)...");
const c3 = mqtt.connect("wss://mqtt.ably.io", {
  username: "2fHRLg.LixlRg",
  password: "bhjvIdszO--QR4JqK4eIcdA2aAbwO0vGNN_kJOPucnQ",
  clientId: "webtest3_" + Math.random().toString(16).slice(2, 10),
});
c3.on('connect', () => { console.log('Broker 3 Connected (WSS)'); c3.end(); });
c3.on('error', (err) => { console.error('Broker 3 Error (WSS):', err.message); c3.end(); });
