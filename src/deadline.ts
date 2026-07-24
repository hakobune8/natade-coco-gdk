export interface DeadlineScheduler {
  now: () => number;
  schedule: (callback: () => void, delayMs: number) => number;
  cancel: (timerId: number) => void;
}

const browserScheduler: DeadlineScheduler = {
  now: Date.now,
  schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
  cancel: (timerId) => window.clearTimeout(timerId)
};

export function scheduleDeadline(
  startedAt: number,
  durationMs: number,
  onDeadline: () => void,
  scheduler: DeadlineScheduler = browserScheduler
): () => void {
  const delayMs = Math.max(0, startedAt + durationMs - scheduler.now());
  const timerId = scheduler.schedule(onDeadline, delayMs);
  return () => scheduler.cancel(timerId);
}
