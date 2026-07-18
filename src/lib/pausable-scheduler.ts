/** Scheduler de timeouts que respeta pausa y conserva el tiempo restante. */

type Entry = {
  id: number;
  remaining: number;
  fn: () => void;
  handle: number | null;
  startedAt: number | null;
};

export type PausableScheduler = {
  schedule: (fn: () => void, delayMs: number) => number;
  clear: (id: number) => void;
  clearAll: () => void;
  setPaused: (paused: boolean) => void;
  isPaused: () => boolean;
};

export function createPausableScheduler(): PausableScheduler {
  let nextId = 1;
  let paused = false;
  const entries = new Map<number, Entry>();

  const arm = (e: Entry) => {
    if (paused || e.handle != null) return;
    e.startedAt = Date.now();
    e.handle = globalThis.setTimeout(() => {
      entries.delete(e.id);
      e.fn();
    }, Math.max(0, e.remaining)) as unknown as number;
  };

  const disarm = (e: Entry) => {
    if (e.handle == null) return;
    globalThis.clearTimeout(e.handle);
    if (e.startedAt != null) {
      const elapsed = Date.now() - e.startedAt;
      e.remaining = Math.max(0, e.remaining - elapsed);
    }
    e.handle = null;
    e.startedAt = null;
  };

  return {
    schedule(fn, delayMs) {
      const id = nextId++;
      const e: Entry = {
        id,
        remaining: delayMs,
        fn,
        handle: null,
        startedAt: null,
      };
      entries.set(id, e);
      arm(e);
      return id;
    },
    clear(id) {
      const e = entries.get(id);
      if (!e) return;
      disarm(e);
      entries.delete(id);
    },
    clearAll() {
      for (const e of entries.values()) disarm(e);
      entries.clear();
    },
    setPaused(next) {
      if (paused === next) return;
      paused = next;
      if (paused) {
        for (const e of entries.values()) disarm(e);
      } else {
        for (const e of entries.values()) arm(e);
      }
    },
    isPaused() {
      return paused;
    },
  };
}
