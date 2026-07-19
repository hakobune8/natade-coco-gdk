import { createDisplayClient } from "@natadecoco/display-sdk";
import type { InputState, Player, Ranking } from "@natadecoco/protocol";
import { DISPLAY_NAME, type LaunchContext, requestDisplayTicket } from "./contract.js";

const GAME_DURATION_MS = 60_000;
const RESULT_DURATION_MS = 10_000;

export async function runDisplay(root: HTMLElement, launch: LaunchContext): Promise<void> {
  const ticket = await requestDisplayTicket();
  const client = createDisplayClient({ sessionId: launch.sessionId, gameId: launch.gameId, displayTicket: ticket.token, ticketProvider: async () => (await requestDisplayTicket()).token });
  const inputs = new Map<string, InputState>();
  const scores = new Map<string, number>();
  const pressed = new Set<string>();
  let players: readonly Player[] = [];
  let finished = false;
  client.onSnapshot((snapshot) => { players = snapshot.players; for (const [playerID, latest] of Object.entries(snapshot.latestInputs)) inputs.set(playerID, latest.input); });
  client.onPlayerJoined((player) => { players = replacePlayer(players, player); });
  client.onPlayerLeft((player) => { players = replacePlayer(players, player); });
  client.onPlayerReconnected((player) => { players = replacePlayer(players, player); });
  client.onInput((event) => { inputs.set(event.playerId, event.input); const active = Boolean(event.input.buttons?.action1); if (active && !pressed.has(event.playerId)) scores.set(event.playerId, (scores.get(event.playerId) ?? 0) + 1); active ? pressed.add(event.playerId) : pressed.delete(event.playerId); });
  await client.connect();
  const snapshot = client.getSnapshot();
  if (snapshot.state !== "playing" || !snapshot.runId) throw new Error("session is not playing");
  players = snapshot.players;
  const startedAt = snapshot.startedAt ? Date.parse(snapshot.startedAt) : Date.now();
  const frame = (): void => {
    const remaining = Math.max(0, GAME_DURATION_MS - (Date.now() - startedAt));
    renderDisplay(root, players, inputs, scores, remaining);
    if (remaining === 0 && !finished) {
      finished = true;
      const rankings = rank(players, scores);
      renderResults(root, rankings, players);
      void client.finishGame({ runId: snapshot.runId!, rankings });
      window.setTimeout(() => window.location.replace("/launcher/"), RESULT_DURATION_MS);
      return;
    }
    window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame(frame);
  window.addEventListener("pagehide", () => client.disconnect("display page hidden"), { once: true });
}

export function runDisplayPreview(root: HTMLElement, result = false): void {
  const players: Player[] = [1, 2, 3, 4].map((slot) => ({ playerId: `p${slot}`, slot, displayName: `Player ${slot}`, connected: slot !== 4, lastSeenAt: new Date().toISOString() }));
  const scores = new Map(players.map((player, index) => [player.playerId, [8, 5, 3, 1][index] ?? 0]));
  if (result) renderResults(root, rank(players, scores), players);
  else renderDisplay(root, players, new Map([["p1", { buttons: { right: true, action1: true } }], ["p2", { buttons: { up: true } }]]), scores, 34_000);
}

function renderDisplay(root: HTMLElement, players: readonly Player[], inputs: ReadonlyMap<string, InputState>, scores: ReadonlyMap<string, number>, remaining: number): void {
  root.innerHTML = `<section class="display-shell"><header><div><p class="eyebrow">GAME DEVELOPER KIT</p><h1>${DISPLAY_NAME}</h1></div><div class="timer">${Math.ceil(remaining / 1000)}<small>秒</small></div></header><div class="player-grid">${players.map((player) => playerCard(player, inputs.get(player.playerId), scores.get(player.playerId) ?? 0)).join("")}</div><footer>方向入力とACTIONを受信中 · この画面をゲームロジックに置き換えてください</footer></section>`;
}
function renderResults(root: HTMLElement, rankings: readonly Ranking[], players: readonly Player[]): void {
  root.innerHTML = `<section class="display-shell result"><p class="eyebrow">GAME FINISHED</p><h1>ランキング</h1><ol>${rankings.map((ranking) => `<li><strong>${ranking.rank}</strong><span>${escapeText(players.find((player) => player.playerId === ranking.playerId)?.displayName ?? ranking.playerId)}</span></li>`).join("")}</ol><p>10秒後にランチャーへ戻ります</p></section>`;
}
function playerCard(player: Player, input: InputState | undefined, score: number): string { const direction = [input?.buttons?.up && "↑", input?.buttons?.down && "↓", input?.buttons?.left && "←", input?.buttons?.right && "→"].filter(Boolean).join(" ") || "•"; return `<article class="player-card slot-${Math.min(player.slot, 4)} ${player.connected ? "" : "offline"}"><span class="slot">${player.slot}P</span><h2>${escapeText(player.displayName)}</h2><div class="direction">${direction}</div><div class="score">ACTION <strong>${score}</strong></div></article>`; }
function rank(players: readonly Player[], scores: ReadonlyMap<string, number>): Ranking[] { return [...players].sort((left, right) => (scores.get(right.playerId) ?? 0) - (scores.get(left.playerId) ?? 0) || left.slot - right.slot).map((player, index) => ({ playerId: player.playerId, rank: index + 1, score: scores.get(player.playerId) ?? 0 })); }
function replacePlayer(players: readonly Player[], player: Player): Player[] { return players.some((value) => value.playerId === player.playerId) ? players.map((value) => value.playerId === player.playerId ? player : value) : [...players, player]; }
function escapeText(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character); }
