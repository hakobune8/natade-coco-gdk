import type { Player, Ranking } from "@natadecoco/protocol";
import type { RecoveryContext, StateAdapter } from "@natadecoco/display-sdk";

export const GAME_DURATION_MS = 60_000;
export type GameState = {
  startedAt: number;
  phase: "playing" | "finished";
  scores: Record<string, number>;
  appliedInputs: Record<string, { epoch: string; sequence: number }>;
  rankings: Ranking[];
};
export type Press = { playerId: string; epoch: string; sequence: number; acceptedAt: number };

export function initialState(startedAt: number, players: readonly Pick<Player, "playerId">[]): GameState {
  return { startedAt, phase: "playing", scores: Object.fromEntries(players.map((player) => [player.playerId, 0])), appliedInputs: {}, rankings: [] };
}
export function scorePress(state: Readonly<GameState>, command: Press): GameState | null {
  const previous = state.appliedInputs[command.playerId];
  if (state.phase !== "playing" || !Object.hasOwn(state.scores, command.playerId) ||
      command.acceptedAt < state.startedAt || command.acceptedAt >= state.startedAt + GAME_DURATION_MS ||
      (previous?.epoch === command.epoch && previous.sequence >= command.sequence)) return null;
  return { ...state, scores: { ...state.scores, [command.playerId]: state.scores[command.playerId]! + 1 },
    appliedInputs: { ...state.appliedInputs, [command.playerId]: { epoch: command.epoch, sequence: command.sequence } } };
}
export function rank(players: readonly Pick<Player, "playerId" | "slot">[], scores: Readonly<Record<string, number>>): Ranking[] {
  return [...players].sort((left, right) => (scores[right.playerId] ?? 0) - (scores[left.playerId] ?? 0) || left.slot - right.slot)
    .map((player, index) => ({ playerId: player.playerId, rank: index + 1, score: scores[player.playerId] ?? 0 }));
}
export function finish(state: Readonly<GameState>, players: readonly Pick<Player, "playerId" | "slot">[]): GameState {
  return { ...state, phase: "finished", rankings: rank(players, state.scores) };
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const identifier = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(value);
const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

/** The SDK owns storage. This adapter validates only this game's plain data. */
export const stateAdapter: StateAdapter<GameState> = {
  stateSchemaVersion: 1,
  serialize: (state) => ({ startedAt: state.startedAt, phase: state.phase, scores: { ...state.scores },
    appliedInputs: Object.fromEntries(Object.entries(state.appliedInputs).map(([id, cursor]) => [id, { epoch: cursor.epoch, sequence: cursor.sequence }])),
    rankings: state.rankings.map((ranking) => ({ playerId: ranking.playerId, rank: ranking.rank, score: ranking.score ?? 0 })) }),
  restore: (payload, context: Readonly<RecoveryContext>) => {
    if (!object(payload) || payload.startedAt !== context.startedAt || (payload.phase !== "playing" && payload.phase !== "finished") ||
        !object(payload.scores) || Object.keys(payload.scores).length > 8 || !object(payload.appliedInputs) ||
        Object.keys(payload.appliedInputs).length > 8 || !Array.isArray(payload.rankings) || payload.rankings.length > 8)
      throw new Error("Invalid saved game state");
    const scores: Record<string, number> = {}, appliedInputs: GameState["appliedInputs"] = {};
    for (const [id, score] of Object.entries(payload.scores)) {
      if (!identifier(id) || !nonnegative(score)) throw new Error("Invalid saved score");
      scores[id] = score;
    }
    if (Object.keys(scores).length !== context.roster.length || context.roster.some((player) => !Object.hasOwn(scores, player.playerId)))
      throw new Error("Invalid saved roster");
    for (const [id, cursor] of Object.entries(payload.appliedInputs)) {
      if (!Object.hasOwn(scores, id) || !object(cursor) || !identifier(cursor.epoch) || !nonnegative(cursor.sequence))
        throw new Error("Invalid saved input cursor");
      appliedInputs[id] = { epoch: cursor.epoch, sequence: cursor.sequence };
    }
    const identities = new Set<string>();
    const rankings = payload.rankings.map((entry): Ranking => {
      if (!object(entry) || !identifier(entry.playerId) || identities.has(entry.playerId) || !Object.hasOwn(scores, entry.playerId) ||
          !nonnegative(entry.rank) || entry.rank < 1 || entry.rank > 8 || !nonnegative(entry.score) || entry.score !== scores[entry.playerId])
        throw new Error("Invalid saved ranking");
      identities.add(entry.playerId);
      return { playerId: entry.playerId, rank: entry.rank, score: entry.score };
    });
    if (payload.phase === "playing" && rankings.length) throw new Error("Unexpected unfinished result");
    if (payload.phase === "finished" && JSON.stringify(rankings) !== JSON.stringify(rank(context.roster, scores)))
      throw new Error("Invalid completed result");
    return { startedAt: context.startedAt, phase: payload.phase, scores, appliedInputs, rankings };
  }
};
