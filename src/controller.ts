import { createControllerClient, mountControllerProfileUI, type ControllerClient, type ControllerSdkError } from "@natadecoco/controller-sdk";
import type { SessionState } from "@natadecoco/protocol";
import {
  DISPLAY_NAME,
  endPlatformGame,
  platformControlHeartbeat,
  platformSession,
  restartPlatformGame,
  type ControllerHandoff,
  type PlatformControlState,
  type PlatformSessionState
} from "./contract.js";

const PLATFORM_HEARTBEAT_MS = 2_000;

export async function runController(root: HTMLElement, handoff: ControllerHandoff): Promise<void> {
  const client = createControllerClient({ sessionId: handoff.sessionId, playerId: handoff.playerId, token: handoff.token, tokenExpiresAt: handoff.tokenExpiresAt, profile: "directional-pad" });
  let returning = false;
  let busy = false;
  const returnToPlatform = (): void => {
    if (returning) return;
    returning = true;
    window.location.replace("/control");
  };
  const controller = mountController(root, handoff.slot, handoff.displayName, client, {
    async restart() {
      if (busy) return;
      busy = true;
      controller.setBusy(true);
      controller.setActionError("");
      try {
        controller.setPlatformSession(await restartPlatformGame());
      } catch {
        controller.setActionError("やり直しを開始できませんでした。接続を確認してください。");
      } finally {
        busy = false;
        controller.setBusy(false);
      }
    },
    async end() {
      if (busy) return;
      busy = true;
      controller.setBusy(true);
      controller.setActionError("");
      try {
        await endPlatformGame();
        returnToPlatform();
      } catch {
        controller.setActionError("ゲームを終了できませんでした。接続を確認してください。");
      } finally {
        busy = false;
        controller.setBusy(false);
      }
    }
  });
  const maintainLease = async (): Promise<void> => {
    const [control, session] = await Promise.all([
      platformControlHeartbeat().catch(() => null),
      platformSession().catch(() => undefined)
    ]);
    if (control) controller.setPlatformControl(control);
    if (session) controller.setPlatformSession(session);
    if (control && control.mode !== "playing" || session === null) returnToPlatform();
  };
  const heartbeat = window.setInterval(() => void maintainLease(), PLATFORM_HEARTBEAT_MS);
  void maintainLease();
  window.addEventListener("pagehide", () => window.clearInterval(heartbeat), { once: true });
  await client.connect();
}

export function runControllerPreview(root: HTMLElement): void {
  const controller = mountController(root, 2, "Player 2");
  controller.setPlatformControl({ mode: "playing", role: "organizer", hasLease: true });
  controller.setPlatformSession({ state: "finished", runId: "preview-run" });
}

interface OrganizerActions {
  restart(): Promise<void>;
  end(): Promise<void>;
}

export interface MountedController {
  setPlatformControl(state: PlatformControlState): void;
  setPlatformSession(state: PlatformSessionState): void;
  setBusy(busy: boolean): void;
  setActionError(message: string): void;
}

function mountController(root: HTMLElement, slot: number, playerName: string, client?: ControllerClient, actions?: OrganizerActions): MountedController {
  root.innerHTML = `<section class="controller-shell natadecoco-safe-area">
    <header><span class="player-badge">${slot}P</span><div><p class="eyebrow">${DISPLAY_NAME}</p><h1>${escapeText(playerName)}</h1></div><span class="connection" role="status">${client ? "接続中" : "プレビュー"}</span></header>
    <p class="guide">大画面を見ながら方向パッドで操作してください</p>
    <div class="control-surface natadecoco-control-surface" aria-label="ゲーム操作"></div>
    <section class="organizer-actions" aria-label="主催者メニュー" hidden>
      <button class="restart-game" type="button">もう一度遊ぶ</button>
      <button class="end-game" type="button">ゲームを終了</button>
    </section>
    <p class="action-error" role="alert" hidden></p>
    <footer><span class="session-state">${client ? "参加待ち" : "プレイ中"}</span><span class="latency">PING ${client ? "--" : "18"} ms</span></footer>
  </section>`;
  const surface = required<HTMLElement>(root, ".control-surface");
  const connection = required<HTMLElement>(root, ".connection");
  const session = required<HTMLElement>(root, ".session-state");
  const latency = required<HTMLElement>(root, ".latency");
  const organizerActions = required<HTMLElement>(root, ".organizer-actions");
  const restart = required<HTMLButtonElement>(root, ".restart-game");
  const end = required<HTMLButtonElement>(root, ".end-game");
  const actionError = required<HTMLElement>(root, ".action-error");
  let platformControl: PlatformControlState = { mode: "playing", role: "participant", hasLease: false };
  let platformSession: PlatformSessionState = { state: client ? "waiting" : "playing" };
  let busy = false;
  let endArmed = false;
  const controls = mountControllerProfileUI({ element: surface, profile: "directional-pad", disabled: Boolean(client), onInput: (input) => { client?.sendInput(input); if (input.buttons?.action1) client?.vibrate(20); } });
  const removeTouchGuards = client?.installTouchGuards(surface);
  const lifecycle = createControllerLifecycle(() => undefined);
  const renderLifecycle = (): void => {
    const organizer = platformControl.role === "organizer" && platformControl.hasLease;
    organizerActions.hidden = !organizer;
    restart.hidden = platformSession.state !== "finished";
    restart.disabled = busy || platformSession.state !== "finished";
    end.disabled = busy;
    controls.setDisabled(Boolean(client) && platformSession.state !== "playing");
    session.textContent = platformSession.state === "playing" ? "プレイ中" : platformSession.state === "finished" ? "結果表示中" : platformSession.state;
  };
  restart.addEventListener("click", () => void actions?.restart());
  end.addEventListener("click", () => {
    if (!endArmed) {
      endArmed = true;
      end.textContent = "もう一度押して終了";
      window.setTimeout(() => {
        endArmed = false;
        end.textContent = "ゲームを終了";
      }, 5_000);
      return;
    }
    void actions?.end();
  });
  const unsubscribers = client ? [
    client.onStateChanged((state) => { const online = state.state === "connected"; connection.textContent = online ? "オンライン" : state.state === "reconnecting" ? "再接続中" : "接続中"; latency.textContent = `PING ${state.roundTripMs === undefined ? "--" : Math.round(state.roundTripMs)} ms`; controls.setDisabled(!online || platformSession.state !== "playing"); }),
    client.onSessionStateChanged((state: SessionState) => {
      platformSession = { ...platformSession, state };
      renderLifecycle();
      lifecycle.onSessionState(state);
    }),
    client.onError((error) => lifecycle.onError(error))
  ] : [];
  surface.addEventListener("pointerdown", () => { void client?.requestWakeLock(); }, { once: true });
  window.addEventListener("pagehide", () => { unsubscribers.forEach((remove) => remove()); removeTouchGuards?.(); controls.destroy(); client?.disconnect("controller page hidden"); }, { once: true });
  renderLifecycle();
  return {
    setPlatformControl(state) {
      platformControl = state;
      renderLifecycle();
    },
    setPlatformSession(state) {
      platformSession = state;
      renderLifecycle();
    },
    setBusy(value) {
      busy = value;
      renderLifecycle();
    },
    setActionError(message) {
      actionError.textContent = message;
      actionError.hidden = message === "";
    }
  };
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
    onSessionState: (state) => { if (["terminated", "error"].includes(state)) finishOnce(); },
    onError: (error) => { if (!error.retryable) finishOnce(); }
  };
}

function required<T extends Element>(root: HTMLElement, selector: string): T { const value = root.querySelector<T>(selector); if (!value) throw new Error(`missing ${selector}`); return value; }
function escapeText(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character); }
