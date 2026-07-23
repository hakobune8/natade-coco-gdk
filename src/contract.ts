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

export function parseLaunchContext(search: string): LaunchContext | null {
  const params = new URLSearchParams(search);
  const sessionId = params.get("sessionId") ?? "";
  return validIdentifier(sessionId) && params.get("gameId") === GAME_ID ? { sessionId, gameId: GAME_ID } : null;
}

export function consumeControllerHandoff(storage: Pick<Storage, "getItem" | "removeItem">, nowMs: number, origin: string): ControllerHandoff | null {
  const raw = storage.getItem(CONTROLLER_HANDOFF_KEY);
  storage.removeItem(CONTROLLER_HANDOFF_KEY);
  if (!raw || raw.length > 8192) return null;
  try {
    const value = JSON.parse(raw) as Partial<ControllerHandoff>;
    const expiresAt = typeof value.tokenExpiresAt === "string" ? Date.parse(value.tokenExpiresAt) : Number.NaN;
    if (!validIdentifier(value.sessionId) || !validIdentifier(value.playerId)) return null;
    if (!Number.isInteger(value.slot) || (value.slot ?? 0) < 1 || (value.slot ?? 0) > 8) return null;
    if (typeof value.displayName !== "string" || value.displayName.length < 1 || value.displayName.length > 40) return null;
    if (typeof value.token !== "string" || value.token.length < 16 || value.token.length > 4096) return null;
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs || !exactControllerURL(value.controllerUrl, origin)) return null;
    return { ...value, controllerUrl: CONTROLLER_PATH } as ControllerHandoff;
  } catch { return null; }
}

export async function requestDisplayTicket(fetcher: typeof fetch = globalThis.fetch): Promise<{ token: string; tokenExpiresAt: string }> {
  const response = await fetcher("/launcher-api/v1/session/display-ticket", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`display ticket unavailable: ${response.status}`);
  const value = await response.json() as { token?: unknown; tokenExpiresAt?: unknown };
  if (typeof value.token !== "string" || value.token.length < 16 || typeof value.tokenExpiresAt !== "string" || !Number.isFinite(Date.parse(value.tokenExpiresAt))) throw new Error("invalid display ticket");
  return { token: value.token, tokenExpiresAt: value.tokenExpiresAt };
}

export async function completeDisplayRun(fetcher: typeof fetch = globalThis.fetch): Promise<void> {
  const response = await fetcher("/launcher-api/v1/session/display-complete", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`display completion unavailable: ${response.status}`);
}

function validIdentifier(value: unknown): value is string { return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value); }
function exactControllerURL(value: unknown, origin: string): boolean {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value, origin);
    return parsed.origin === origin && !parsed.username && !parsed.password && !parsed.search && !parsed.hash && (parsed.pathname === CONTROLLER_PATH || parsed.pathname === `${CONTROLLER_PATH}/`);
  } catch { return false; }
}
