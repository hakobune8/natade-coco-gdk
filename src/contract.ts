export const GAME_ID = "gdk-reference" as const;
export const DISPLAY_NAME = "natadeCOCO GDK Reference" as const;
export const DISPLAY_PATH = "/games/gdk-reference/display" as const;
export const CONTROLLER_PATH = "/games/gdk-reference/controller" as const;

export interface LaunchContext { sessionId: string; gameId: typeof GAME_ID }
export interface PlatformSessionState {
  state: "idle" | "waiting" | "ready" | "playing" | "finished" | "terminated" | "error";
  runId?: string;
}

export function parseLaunchContext(search: string): LaunchContext | null {
  const params = new URLSearchParams(search);
  const sessionId = params.get("sessionId") ?? "";
  return validIdentifier(sessionId) && params.get("gameId") === GAME_ID ? { sessionId, gameId: GAME_ID } : null;
}

export async function requestDisplayTicket(fetcher: typeof fetch = globalThis.fetch): Promise<{ token: string; tokenExpiresAt: string }> {
  const response = await fetcher("/launcher-api/v1/session/display-ticket", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`display ticket unavailable: ${response.status}`);
  const value = await response.json() as { token?: unknown; tokenExpiresAt?: unknown };
  if (typeof value.token !== "string" || value.token.length < 16 || typeof value.tokenExpiresAt !== "string" || !Number.isFinite(Date.parse(value.tokenExpiresAt))) throw new Error("invalid display ticket");
  return { token: value.token, tokenExpiresAt: value.tokenExpiresAt };
}

/** Display-side lifecycle observation; Controller platform operations live in Controller Shell. */
export async function platformSession(fetcher: typeof fetch = globalThis.fetch): Promise<PlatformSessionState | null> {
  const response = await fetcher("/launcher-api/v1/session", { credentials: "same-origin", headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`platform session unavailable: ${response.status}`);
  const value = await response.json() as { session?: Partial<PlatformSessionState> };
  const state = value.session?.state;
  if (state !== "idle" && state !== "waiting" && state !== "ready" && state !== "playing" && state !== "finished" && state !== "terminated" && state !== "error") throw new Error("invalid platform session");
  const runId = value.session?.runId;
  if (runId !== undefined && !validIdentifier(runId)) throw new Error("invalid platform run");
  return { state, ...(runId === undefined ? {} : { runId }) };
}

function validIdentifier(value: unknown): value is string { return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value); }
