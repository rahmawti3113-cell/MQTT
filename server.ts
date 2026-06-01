import express from "express";
import path from "path";
import { WebSocketServer, createWebSocketStream } from "ws";
import tls from "tls";
import http from "http";

const PORT = 3000;

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Set up WebSocket server for proxy
  const wss = new WebSocketServer({ server, path: '/mqtt-proxy' });

  wss.on('connection', (ws, req) => {
    try {
      if (!req.url) {
        ws.close();
        return;
      }
      
      const urlParams = new URL(req.url, `http://localhost:${PORT}`);
      const targetHost = urlParams.searchParams.get('host');
      const targetPort = parseInt(urlParams.searchParams.get('port') || '8883', 10);

      if (!targetHost) {
        console.error('MQTT Proxy Error: Missing target host');
        ws.close();
        return;
      }

      console.log(`Proxying new MQTT connection to tls://${targetHost}:${targetPort}`);
      
      // Connect to the external broker using TLS (mqtts)
      const tcpStream = tls.connect({ 
        host: targetHost, 
        port: targetPort,
        servername: targetHost, // SNI support is critical for cloud brokers!
      });

      // Wrap the WebSocket in a duplex stream
      const wsStream = createWebSocketStream(ws);

      // Pipe them together
      wsStream.pipe(tcpStream).pipe(wsStream);

      tcpStream.on('error', (err) => {
        console.error(`TCP connection error to ${targetHost}:`, err);
        ws.close();
      });

      ws.on('error', (err) => {
        console.error(`WebSocket connection error for ${targetHost}:`, err);
        tcpStream.end();
      });

      ws.on('close', () => {
        tcpStream.end();
      });

      tcpStream.on('close', () => {
        ws.close();
      });
      
    } catch (err) {
      console.error('Connection setup failed', err);
      ws.close();
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import to keep Vite out of production build
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express 4 wildcard catchall for SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
