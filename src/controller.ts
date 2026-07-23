import { createControllerClient, mountControllerProfileUI, type ControllerClient, type ControllerSdkError } from "@natadecoco/controller-sdk";
import type { SessionState } from "@natadecoco/protocol";
import { DISPLAY_NAME, type ControllerHandoff } from "./contract.js";

const PLATFORM_HEARTBEAT_MS = 2_000;

export async function runController(root: HTMLElement, handoff: ControllerHandoff): Promise<void> {
  const client = createControllerClient({ sessionId: handoff.sessionId, playerId: handoff.playerId, token: handoff.token, tokenExpiresAt: handoff.tokenExpiresAt, profile: "directional-pad" });
  let returning = false;
  const returnToPlatform = (): void => {
    if (returning) return;
    returning = true;
    window.location.replace("/control");
  };
  const maintainLease = async (): Promise<void> => {
    const mode = await platformControlHeartbeat().catch(() => null);
    if (mode && mode !== "playing") returnToPlatform();
  };
  const heartbeat = window.setInterval(() => void maintainLease(), PLATFORM_HEARTBEAT_MS);
  mountController(root, handoff.slot, handoff.displayName, client);
  window.addEventListener("pagehide", () => window.clearInterval(heartbeat), { once: true });
  await client.connect();
}

export function runControllerPreview(root: HTMLElement): void { mountController(root, 2, "Player 2"); }

function mountController(root: HTMLElement, slot: number, playerName: string, client?: ControllerClient, onFinished?: () => void): void {
  root.innerHTML = `<section class="controller-shell natadecoco-safe-area">
    <header><span class="player-badge">${slot}P</span><div><p class="eyebrow">${DISPLAY_NAME}</p><h1>${escapeText(playerName)}</h1></div><span class="connection" role="status">${client ? "接続中" : "プレビュー"}</span></header>
    <p class="guide">大画面を見ながら方向パッドで操作してください</p>
    <div class="control-surface natadecoco-control-surface" aria-label="ゲーム操作"></div>
    <footer><span class="session-state">${client ? "参加待ち" : "プレイ中"}</span><span class="latency">PING ${client ? "--" : "18"} ms</span></footer>
  </section>`;
  const surface = required<HTMLElement>(root, ".control-surface");
  const connection = required<HTMLElement>(root, ".connection");
  const session = required<HTMLElement>(root, ".session-state");
  const latency = required<HTMLElement>(root, ".latency");
  const controls = mountControllerProfileUI({ element: surface, profile: "directional-pad", disabled: Boolean(client), onInput: (input) => { client?.sendInput(input); if (input.buttons?.action1) client?.vibrate(20); } });
  const removeTouchGuards = client?.installTouchGuards(surface);
  const lifecycle = createControllerLifecycle(() => onFinished?.());
  const unsubscribers = client ? [
    client.onStateChanged((state) => { const online = state.state === "connected"; connection.textContent = online ? "オンライン" : state.state === "reconnecting" ? "再接続中" : "接続中"; latency.textContent = `PING ${state.roundTripMs === undefined ? "--" : Math.round(state.roundTripMs)} ms`; controls.setDisabled(!online); }),
    client.onSessionStateChanged((state: SessionState) => {
      session.textContent = state === "playing" ? "プレイ中" : state === "waiting" ? "参加待ち" : state;
      controls.setDisabled(state !== "playing");
      lifecycle.onSessionState(state);
    }),
    client.onError((error) => lifecycle.onError(error))
  ] : [];
  surface.addEventListener("pointerdown", () => { void client?.requestWakeLock(); }, { once: true });
  window.addEventListener("pagehide", () => { unsubscribers.forEach((remove) => remove()); removeTouchGuards?.(); controls.destroy(); client?.disconnect("controller page hidden"); }, { once: true });
}

export function createControllerLifecycle(onFinished: () => void): {
  onSessionState: (state: SessionState) => void;
  onError: (error: Pick<ControllerSdkError, "retryable">) => void;
} {
  let finished = false;
  const finishOnce = (): void => {
    if (finished) return;
    finished = true;
    onFinished();
  };
  return {
    onSessionState: (state) => { if (["finished", "terminated", "error"].includes(state)) finishOnce(); },
    onError: (error) => { if (!error.retryable) finishOnce(); }
  };
}

export async function platformControlHeartbeat(fetcher: typeof fetch = globalThis.fetch): Promise<"catalog" | "lobby" | "playing"> {
  const response = await fetcher("/launcher-api/v1/control/heartbeat", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`platform heartbeat unavailable: ${response.status}`);
  const value = await response.json() as { mode?: unknown };
  if (value.mode !== "catalog" && value.mode !== "lobby" && value.mode !== "playing") throw new Error("invalid platform heartbeat");
  return value.mode;
}

function required<T extends Element>(root: HTMLElement, selector: string): T { const value = root.querySelector<T>(selector); if (!value) throw new Error(`missing ${selector}`); return value; }
function escapeText(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character); }
