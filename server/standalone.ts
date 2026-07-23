// Standalone entry point for deploying the duel Socket.IO server on its own
// host (Railway, Fly.io, Render, ...) separate from the Vercel-hosted web
// app, since Vercel's serverless functions can't run a persistent WebSocket
// server. Local dev doesn't use this file - it attaches to Vite's own dev
// server instead (see vite.config.ts).
import { createServer } from "node:http";
import { attachSocketServer } from "./socket-server";

const port = Number(process.env.PORT) || 3001;

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(
    `Duel Arena socket server is running.\nALLOWED_ORIGIN=${JSON.stringify(process.env.ALLOWED_ORIGIN)}\n`
  );
});

attachSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`Duel socket server listening on port ${port}`);
});
