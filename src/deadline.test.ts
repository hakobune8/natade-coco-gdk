import assert from "node:assert/strict";
import test from "node:test";
import { scheduleDeadline, type DeadlineScheduler } from "./deadline.js";

test("schedules the game deadline independently from animation frames", () => {
  let callback: (() => void) | undefined;
  let scheduledDelay = -1;
  let fired = 0;
  const scheduler: DeadlineScheduler = {
    now: () => 40_000,
    schedule: (value, delayMs) => {
      callback = value;
      scheduledDelay = delayMs;
      return 7;
    },
    cancel: () => undefined
  };

  scheduleDeadline(10_000, 60_000, () => { fired += 1; }, scheduler);

  assert.equal(scheduledDelay, 30_000);
  assert.equal(fired, 0);
  callback?.();
  assert.equal(fired, 1);
});

test("fires immediately when a restored run is already past its deadline", () => {
  let scheduledDelay = -1;
  const scheduler: DeadlineScheduler = {
    now: () => 65_000,
    schedule: (_, delayMs) => {
      scheduledDelay = delayMs;
      return 9;
    },
    cancel: () => undefined
  };

  scheduleDeadline(0, 60_000, () => undefined, scheduler);
  assert.equal(scheduledDelay, 0);
});

test("returns a cancellation hook for page teardown and early finish", () => {
  let cancelledTimer: number | undefined;
  const scheduler: DeadlineScheduler = {
    now: () => 0,
    schedule: () => 11,
    cancel: (timerId) => { cancelledTimer = timerId; }
  };

  const cancel = scheduleDeadline(0, 60_000, () => undefined, scheduler);
  cancel();
  assert.equal(cancelledTimer, 11);
});
