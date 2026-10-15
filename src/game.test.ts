import assert from "node:assert/strict";
import test from "node:test";
import type { RecoveryContext } from "@natadecoco/display-sdk";
import { GAME_DURATION_MS, finish, initialState, scorePress, stateAdapter } from "./game.js";

const players = [{ playerId: "p1", slot: 1 }, { playerId: "p2", slot: 2 }];
const context: RecoveryContext = { gameId: "test", sessionId: "session", runId: "run", initializationId: "init", startedAt: 1000,
  roster: players, clock: { serverTime: 1000, uncertaintyMs: 0, sampleAgeMs: 0, stale: false } };

test("scoring candidates leave the prior state unchanged and saved input identities prevent replay", () => {
  const original = initialState(1000, players);
  const command = { playerId: "p1", epoch: "epoch-1", sequence: 4, acceptedAt: 1200 };
  const scored = scorePress(original, command)!;
  assert.equal(original.scores.p1, 0);
  assert.equal(scored.scores.p1, 1);
  const restored = stateAdapter.restore(JSON.parse(JSON.stringify(stateAdapter.serialize(scored))), context);
  assert.equal(scorePress(restored, command), null);
  assert.equal(scorePress(restored, { ...command, sequence: 3 }), null);
  assert.equal(scorePress(restored, { ...command, epoch: "epoch-2", sequence: 0 })!.scores.p1, 2);
  assert.equal(scorePress(restored, { ...command, playerId: "toString" }), null);
});

test("the absolute deadline survives restoration and terminal rankings remain read-only domain data", () => {
  const state = initialState(1000, players);
  assert.equal(scorePress(state, { playerId: "p1", epoch: "epoch", sequence: 1, acceptedAt: 1000 + GAME_DURATION_MS }), null);
  const ended = finish(state, players);
  const restored = stateAdapter.restore(stateAdapter.serialize(ended), context);
  assert.deepEqual(restored.rankings, [{ playerId: "p1", rank: 1, score: 0 }, { playerId: "p2", rank: 2, score: 0 }]);
  assert.equal(scorePress(restored, { playerId: "p1", epoch: "epoch", sequence: 2, acceptedAt: 1200 }), null);
});

test("incompatible or corrupt saved state is rejected rather than initialized again", () => {
  const state = initialState(1000, players);
  const saved = stateAdapter.serialize(state);
  assert.throws(() => stateAdapter.restore(stateAdapter.serialize({ ...state, scores: { p1: 0 } }), context));
  assert.throws(() => stateAdapter.restore(stateAdapter.serialize({ ...finish(state, players), rankings: [] }), context));
  assert.throws(() => stateAdapter.restore(saved, { ...context, startedAt: 2000 }));
  assert.throws(() => stateAdapter.restore({ startedAt: 1000, phase: "playing", scores: { p1: -1 }, appliedInputs: {}, rankings: [] }, context));
  assert.throws(() => stateAdapter.restore({ startedAt: 1000, phase: ["playing"], scores: {}, appliedInputs: {}, rankings: [] }, context));
});
