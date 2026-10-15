import { createDisplayClient, restoreTerminalDisplay } from "@natadecoco/display-sdk";
import type { InputState, Player, Ranking } from "@natadecoco/protocol";
import { DISPLAY_NAME, GAME_SYNC, GAME_VERSION, platformSession, type LaunchContext, requestDisplayTicket } from "./contract.js";
import { GAME_DURATION_MS, finish, initialState, rank as rankGame, scorePress, stateAdapter, type GameState } from "./game.js";

const PLATFORM_POLL_MS = 2_000;

export async function runDisplay(root: HTMLElement, launch: LaunchContext): Promise<void> {
  const current = await platformSession();
  if (!current || current.sessionId !== launch.sessionId || current.gameId !== launch.gameId) {
    window.location.replace("/launcher/");
    return;
  }
  if ((current.state === "finished" || current.state === "error") && current.runId) {
    const restored = await restoreTerminalDisplay(stateAdapter, { ...launch, runId: current.runId });
    if (restored.outcome.state === "finished") renderResults(root, restored.outcome.rankings, current.players);
    else renderRecoveryError(root);
    if (restored.warningCode) root.insertAdjacentHTML("beforeend", '<p role="status">結果は確定していますが、進行の詳細を復元できませんでした。</p>');
    waitForOrganizer(current.runId);
    return;
  }
  const ticket = await requestDisplayTicket();
  const client = createDisplayClient({ ...launch, gameVersion: GAME_VERSION, gameSync: GAME_SYNC,
    displayTicket: ticket.token, ticketProvider: async () => (await requestDisplayTicket()).token });
  const recovery = client.createRecovery<GameState>({ project: (state) => [{ operation: "put", name: "phase",
    target: { kind: "all-controllers" }, payload: { phase: state.phase, endsAt: state.startedAt + GAME_DURATION_MS } }] });
  const inputs = new Map<string, InputState>(), pressed = new Set<string>();
  let players: readonly Player[] = [], started = false, stopped = false, finishing = false, activeRunId = "";
  let lastRemaining = Number.NaN;
  let deadlineTimer: number | undefined;
  const failed = (error: unknown): void => {
    const code = (error as { code?: string; retryable?: boolean })?.code;
    if (stopped || code === "input_ignored" || (error as { retryable?: boolean })?.retryable) return;
    stopped = true;
    renderRecoveryError(root);
  };
  const removers = [
    client.onSnapshot((snapshot) => {
      players = snapshot.players;
      if (activeRunId && snapshot.runId && snapshot.runId !== activeRunId) window.location.reload();
    }),
    client.onPlayerJoined((player) => { players = replacePlayer(players, player); }),
    client.onPlayerLeft((player) => { players = replacePlayer(players, player); inputs.delete(player.playerId); pressed.delete(player.playerId); }),
    client.onPlayerReconnected((player) => { players = replacePlayer(players, player); }),
    client.onSyncChanged((sync) => { if (sync.state !== "ready") pressed.clear(); }),
    recovery.onStatusChanged((status) => { if (status.state === "failed" || status.state === "superseded") failed(new Error("Recovery unavailable")); }),
    client.onInput((event) => {
      inputs.set(event.playerId, event.input);
      const wasPressed = pressed.has(event.playerId), active = Boolean(event.input.buttons?.action1);
      active ? pressed.add(event.playerId) : pressed.delete(event.playerId);
      if (!started || finishing || !active || wasPressed || client.getSyncStatus().state !== "ready") return;
      const command = { playerId: event.playerId, epoch: event.inputEpoch, sequence: event.sequence, acceptedAt: event.gatewayAcceptedAt };
      void recovery.commitCritical(command, (state) => {
        const next = scorePress(state, command);
        return next ? { kind: "accepted", state: next } : { kind: "rejected", code: "input_ignored" };
      }).catch(failed);
    })
  ];
  window.addEventListener("pagehide", () => {
    stopped = true;
    if (deadlineTimer !== undefined) window.clearTimeout(deadlineTimer);
    removers.forEach((remove) => remove());
    void recovery.close();
    client.disconnect("display page hidden");
  }, { once: true });
  await client.connect();
  const snapshot = client.getSnapshot();
  if (snapshot.state !== "playing" || !snapshot.runId || !snapshot.startedAt) throw new Error("The run has not started");
  activeRunId = snapshot.runId;
  const opened = await recovery.open(stateAdapter);
  if (opened.kind === "fresh") await recovery.initialize(initialState(Date.parse(snapshot.startedAt), snapshot.players));
  started = true;
  const showResult = async (): Promise<void> => {
    const saved = recovery.getCurrentState();
    const result = saved.phase === "finished" ? saved : (await recovery.commitCritical({ kind: "finish" }, (state) => {
      const completed = finish(state, players);
      return { kind: "accepted", state: completed, outcome: { kind: "finish", rankings: completed.rankings } };
    })).state;
    renderResults(root, result.rankings, players, true);
    await client.finishGame({ runId: activeRunId, rankings: result.rankings });
    renderResults(root, result.rankings, players);
    waitForOrganizer(activeRunId);
  };
  // Completion must still run when the browser stops animation frames.
  const deadline = (): void => {
    if (stopped || finishing) return;
    const state = recovery.getCurrentState(), sync = client.getSyncStatus(), clock = client.getServerTimeEstimate();
    if (state.phase === "finished" || (sync.state === "ready" && !clock.stale && clock.serverTime !== null && clock.serverTime >= state.startedAt + GAME_DURATION_MS)) {
      finishing = true;
      void showResult().catch(failed);
      return;
    }
    deadlineTimer = window.setTimeout(deadline, 250);
  };
  const frame = (): void => {
    if (stopped || finishing) return;
    const state = recovery.getCurrentState(), sync = client.getSyncStatus(), clock = client.getServerTimeEstimate();
    if (!clock.stale && clock.serverTime !== null) lastRemaining = Math.max(0, state.startedAt + GAME_DURATION_MS - clock.serverTime);
    renderDisplay(root, players, inputs, new Map(Object.entries(state.scores)), lastRemaining);
    if (sync.state !== "ready" || clock.stale) root.insertAdjacentHTML("beforeend", '<p role="status">ゲームの状態を同期しています…</p>');
    window.requestAnimationFrame(frame);
  };
  deadline();
  window.requestAnimationFrame(frame);
}

export function renderRecoveryError(root: HTMLElement): void {
  root.innerHTML = '<section class="boot-error"><h1>ゲームの進行を確認できません</h1><p>接続を確認してから再読み込みしてください。ホストのメニューからゲームを終了できます。</p><button type="button">再読み込み</button></section>';
  root.querySelector("button")?.addEventListener("click", () => window.location.reload(), { once: true });
}

function waitForOrganizer(finishedRunId: string): void {
  const poll = async (): Promise<void> => {
    const session = await platformSession().catch(() => undefined);
    if (session?.state === "playing" && session.runId && session.runId !== finishedRunId) { window.location.reload(); return; }
    if (session === null || session?.state === "terminated") { window.location.replace("/launcher/"); return; }
    window.setTimeout(() => void poll(), PLATFORM_POLL_MS);
  };
  void poll();
}

export async function runDisplayPreview(root: HTMLElement, result = false): Promise<void> {
  const players: Player[] = [1, 2, 3, 4].map((slot) => ({ playerId: `p${slot}`, slot, displayName: `Player ${slot}`, connected: true, lastSeenAt: new Date().toISOString() }));
  const scores = new Map(players.map((player, index) => [player.playerId, [8, 5, 3, 1][index] ?? 0]));
  if (result) { renderResults(root, rankGame(players, Object.fromEntries(scores)), players); return; }
  const { subscribeLocalPreviewInputs } = await import("@natadecoco/controller-sdk/local-dev");
  const inputs = new Map<string, InputState>();
  const pressed = new Set<string>();
  const render = (): void => renderDisplay(root, players, inputs, scores, 34_000);
  const remove = subscribeLocalPreviewInputs(({ playerId, input }) => {
    inputs.set(playerId, input);
    const active = Boolean(input.buttons?.action1);
    if (active && !pressed.has(playerId)) scores.set(playerId, (scores.get(playerId) ?? 0) + 1);
    if (active) pressed.add(playerId);
    else pressed.delete(playerId);
    render();
  });
  render();
  window.addEventListener("pagehide", remove, { once: true });
}

function renderDisplay(root: HTMLElement, players: readonly Player[], inputs: ReadonlyMap<string, InputState>, scores: ReadonlyMap<string, number>, remaining: number): void {
  root.innerHTML = `<section class="display-shell"><header><div><p class="eyebrow">GAME DEVELOPER KIT</p><h1>${DISPLAY_NAME}</h1></div><div class="timer">${Number.isFinite(remaining) ? Math.ceil(remaining / 1000) : "--"}<small>秒</small></div></header><div class="player-grid">${players.map((player) => playerCard(player, inputs.get(player.playerId), scores.get(player.playerId) ?? 0)).join("")}</div><footer>方向入力とACTIONを受信中 · この画面をゲームロジックに置き換えてください</footer></section>`;
}
function renderResults(root: HTMLElement, rankings: readonly Ranking[], players: readonly Pick<Player, "playerId" | "displayName">[], pending = false): void {
  root.innerHTML = `<section class="display-shell result"><p class="eyebrow">GAME FINISHED</p><h1>ランキング</h1><ol>${rankings.map((ranking) => `<li><strong>${ranking.rank}</strong><span>${escapeText(players.find((player) => player.playerId === ranking.playerId)?.displayName ?? ranking.playerId)}</span></li>`).join("")}</ol><p>${pending ? "結果を確定しています…" : "ホストが「もう一度遊ぶ」または「ゲームを終了」を選びます"}</p></section>`;
}
function playerCard(player: Player, input: InputState | undefined, score: number): string { const direction = [input?.buttons?.up && "↑", input?.buttons?.down && "↓", input?.buttons?.left && "←", input?.buttons?.right && "→"].filter(Boolean).join(" ") || "•"; return `<article class="player-card slot-${Math.min(player.slot, 4)} ${player.connected ? "" : "offline"}"><span class="slot">${player.slot}P</span><h2>${escapeText(player.displayName)}</h2><div class="direction">${direction}</div><div class="score">ACTION <strong>${score}</strong></div></article>`; }
function replacePlayer(players: readonly Player[], player: Player): Player[] { return players.some((value) => value.playerId === player.playerId) ? players.map((value) => value.playerId === player.playerId ? player : value) : [...players, player]; }
function escapeText(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character); }
