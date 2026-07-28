export const GAME_ID = "gdk-reference" as const;
export const DISPLAY_NAME = "natadeCOCO GDK Reference" as const;
export const DISPLAY_PATH = "/games/gdk-reference/display" as const;
export const CONTROLLER_PATH = "/games/gdk-reference/controller" as const;
export const CONTROLLER_HANDOFF_KEY = "natadecoco.controller.handoff.v1";

export interface LaunchContext { sessionId: string; gameId: typeof GAME_ID }
export interface ControllerHandoff {
  sessionId: string;
  playerId: string;
  slot: number;
  displayName: string;
  token: string;
  tokenExpiresAt: string;
  controllerUrl: typeof CONTROLLER_PATH;
}

export interface PlatformControlState {
  mode: "catalog" | "lobby" | "playing";
  role: "organizer" | "participant";
  hasLease: boolean;
}

export interface PlatformSessionState {
  state: "idle" | "waiting" | "ready" | "playing" | "finished" | "terminated" | "error";
  runId?: string;
}

export function parseLaunchContext(search: string): LaunchContext | null {
  const params = new URLSearchParams(search);
  const sessionId = params.get("sessionId") ?? "";
  return validIdentifier(sessionId) && params.get("gameId") === GAME_ID ? { sessionId, gameId: GAME_ID } : null;
}

export function consumeControllerHandoff(storage: Pick<Storage, "getItem" | "removeItem">, nowMs: number, origin: string): ControllerHandoff | null {
  const raw = storage.getItem(CONTROLLER_HANDOFF_KEY);
  if (!raw) return null;
  if (raw.length > 8192) return invalidControllerHandoff(storage);
  try {
    const value = JSON.parse(raw) as Partial<ControllerHandoff>;
    const expiresAt = typeof value.tokenExpiresAt === "string" ? Date.parse(value.tokenExpiresAt) : Number.NaN;
    if (!validIdentifier(value.sessionId) || !validIdentifier(value.playerId)) return invalidControllerHandoff(storage);
    if (!Number.isInteger(value.slot) || (value.slot ?? 0) < 1 || (value.slot ?? 0) > 8) return invalidControllerHandoff(storage);
    if (typeof value.displayName !== "string" || value.displayName.length < 1 || value.displayName.length > 40) return invalidControllerHandoff(storage);
    if (typeof value.token !== "string" || value.token.length < 16 || value.token.length > 4096) return invalidControllerHandoff(storage);
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs || !exactControllerURL(value.controllerUrl, origin)) return invalidControllerHandoff(storage);
    return { ...value, controllerUrl: CONTROLLER_PATH } as ControllerHandoff;
  } catch { return invalidControllerHandoff(storage); }
}

function invalidControllerHandoff(storage: Pick<Storage, "removeItem">): null {
  storage.removeItem(CONTROLLER_HANDOFF_KEY);
  return null;
}

export function clearControllerHandoff(storage: Pick<Storage, "removeItem"> = sessionStorage): void {
  storage.removeItem(CONTROLLER_HANDOFF_KEY);
}

export function persistRefreshedControllerToken(
  storage: Pick<Storage, "setItem">,
  handoff: ControllerHandoff,
  token: string,
  tokenExpiresAt?: string
): void {
  if (token.length < 16 || token.length > 4096 || !tokenExpiresAt || !Number.isFinite(Date.parse(tokenExpiresAt))) return;
  handoff.token = token;
  handoff.tokenExpiresAt = tokenExpiresAt;
  storage.setItem(CONTROLLER_HANDOFF_KEY, JSON.stringify(handoff));
}

export async function requestDisplayTicket(fetcher: typeof fetch = globalThis.fetch): Promise<{ token: string; tokenExpiresAt: string }> {
  const response = await fetcher("/launcher-api/v1/session/display-ticket", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`display ticket unavailable: ${response.status}`);
  const value = await response.json() as { token?: unknown; tokenExpiresAt?: unknown };
  if (typeof value.token !== "string" || value.token.length < 16 || typeof value.tokenExpiresAt !== "string" || !Number.isFinite(Date.parse(value.tokenExpiresAt))) throw new Error("invalid display ticket");
  return { token: value.token, tokenExpiresAt: value.tokenExpiresAt };
}

export async function platformControlHeartbeat(fetcher: typeof fetch = globalThis.fetch): Promise<PlatformControlState> {
  const response = await fetcher("/launcher-api/v1/control/heartbeat", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`platform heartbeat unavailable: ${response.status}`);
  const value = await response.json() as Partial<PlatformControlState>;
  if (
    value.mode !== "catalog" && value.mode !== "lobby" && value.mode !== "playing"
    || value.role !== "organizer" && value.role !== "participant"
    || typeof value.hasLease !== "boolean"
  ) throw new Error("invalid platform heartbeat");
  return value as PlatformControlState;
}

export async function platformSession(fetcher: typeof fetch = globalThis.fetch): Promise<PlatformSessionState | null> {
  const response = await fetcher("/launcher-api/v1/session", { credentials: "same-origin", headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`platform session unavailable: ${response.status}`);
  const value = await response.json() as { session?: Partial<PlatformSessionState> };
  const state = value.session?.state;
  if (state !== "idle" && state !== "waiting" && state !== "ready" && state !== "playing" && state !== "finished" && state !== "terminated" && state !== "error") {
    throw new Error("invalid platform session");
  }
  const runId = value.session?.runId;
  if (runId !== undefined && !validIdentifier(runId)) throw new Error("invalid platform run");
  return { state, ...(runId === undefined ? {} : { runId }) };
}

export async function restartPlatformGame(fetcher: typeof fetch = globalThis.fetch): Promise<PlatformSessionState> {
  const response = await fetcher("/launcher-api/v1/control/restart", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`game restart unavailable: ${response.status}`);
  const value = await response.json() as { session?: Partial<PlatformSessionState> };
  if (value.session?.state !== "playing" || !validIdentifier(value.session.runId)) throw new Error("invalid restarted session");
  return { state: "playing", runId: value.session.runId };
}

export async function endPlatformGame(fetcher: typeof fetch = globalThis.fetch): Promise<void> {
  const response = await fetcher("/launcher-api/v1/control/end", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`game end unavailable: ${response.status}`);
}

function validIdentifier(value: unknown): value is string { return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value); }
function exactControllerURL(value: unknown, origin: string): boolean {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value, origin);
    return parsed.origin === origin && !parsed.username && !parsed.password && !parsed.search && !parsed.hash && (parsed.pathname === CONTROLLER_PATH || parsed.pathname === `${CONTROLLER_PATH}/`);
  } catch { return false; }
}
