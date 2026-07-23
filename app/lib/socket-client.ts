import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

// Lazily created so this never runs during SSR - only ever called from
// inside client-side event handlers/effects.
export function getSocket(): Socket {
  if (!socket) {
    // Unset in local dev: connects same-origin, to the socket server the
    // Vite plugin attaches to `npm run dev` itself. Set in production
    // (VITE_SOCKET_URL, baked in at build time) to point at the standalone
    // duel server when it's deployed separately from the web app, e.g.
    // Vercel for the app + Railway/Fly for this socket server.
    const url = import.meta.env.VITE_SOCKET_URL || undefined;
    socket = io(url, { path: "/ws/duel" });
  }
  return socket;
}
