import { io } from "socket.io-client";

const URL = "https://yugioh-production-3f80.up.railway.app";
const DECK_ID = "cmrwni9us0001ken0vtnnnof5";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connectPlayer(playerId, playerName) {
  return new Promise((resolve) => {
    const socket = io(URL, { path: "/ws/duel" });
    let latest = null;
    socket.on("room:state", (v) => {
      latest = v;
      console.log(`[${playerName}] room:state phase=${v.phase}`);
    });
    socket.on("room:error", (err) => console.log(`[${playerName}] room:error:`, err));
    socket.on("connect", () => resolve({ socket, getState: () => latest, playerId, playerName }));
  });
}

async function main() {
  const a = await connectPlayer("railway-a", "RailwayA");
  const createRes = await new Promise((resolve) =>
    a.socket.emit("room:create", { playerId: a.playerId, playerName: a.playerName }, resolve)
  );
  const code = createRes.code;
  console.log("[A] created room", code);

  const b = await connectPlayer("railway-b", "RailwayB");
  const joinRes = await new Promise((resolve) =>
    b.socket.emit("room:join", { code, playerId: b.playerId, playerName: b.playerName }, resolve)
  );
  console.log("[B] joined:", joinRes);

  await sleep(500);
  a.socket.emit("room:setDeck", { code, playerId: a.playerId, deckId: DECK_ID, deckName: "Test A" });
  b.socket.emit("room:setDeck", { code, playerId: b.playerId, deckId: DECK_ID, deckName: "Test B" });
  await sleep(1000);

  console.log("[A] before ready:", JSON.stringify(a.getState()?.players));

  a.socket.emit("room:ready", { code, playerId: a.playerId, ready: true });
  await sleep(500);
  b.socket.emit("room:ready", { code, playerId: b.playerId, ready: true });
  await sleep(5000);

  const stateA = a.getState();
  console.log("[A] FINAL phase:", stateA?.phase);
  console.log("[A] FINAL players:", JSON.stringify(stateA?.players));
  if (stateA?.phase === "duel") {
    console.log("[A] my deck count:", stateA.duel.self.mainDeckCount);
    console.log("DATABASE CONNECTIVITY FROM RAILWAY: OK");
  }

  process.exit(stateA?.phase === "duel" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
