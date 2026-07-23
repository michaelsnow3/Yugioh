import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Attaches the Socket.IO duel server to Vite's own dev-server HTTP server,
// so real-time dueling runs on the same host/port as `npm run dev` with no
// second process to manage.
function duelSocketPlugin(): Plugin {
  return {
    name: "duel-socket-server",
    async configureServer(server) {
      if (!server.httpServer) return;
      const { attachSocketServer } = await import("./server/socket-server");
      attachSocketServer(server.httpServer);
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), duelSocketPlugin()],
});
