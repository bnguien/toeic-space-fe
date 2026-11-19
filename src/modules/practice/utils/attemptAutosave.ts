import type { Answer, SavedAnswer } from "../types/practice-exam.types.ts";

export type AnswerState = {
  id: string;
  selected: Answer;
  saved: Answer;
  revision: number;
  /** `locked`: the question was checked; its answer can no longer change. */
  status: "saved" | "saving" | "unsaved" | "error" | "conflict" | "locked";
  server?: { answer: Answer; revision: number };
  /** Optimistic flag value shown to the learner. */
  flagged: boolean;
  flagStatus: "saved" | "saving" | "error";
};
type Operation = {
  answer: Answer;
  revision: number;
  mutationId: string;
  /** Seconds sent with this mutation (kept for an idempotent retry). */
  time: number;
};
type Save = (
  id: string,
  answer: Answer,
  revision: number,
  mutationId: string,
  timeSpentSeconds?: number,
) => Promise<SavedAnswer>;
type SaveFlag = (id: string, flagged: boolean) => Promise<{ flagged: boolean }>;

export interface AutosaveQuestion {
  id: string;
  userAnswer: Answer;
  revision: number;
  flagged?: boolean;
  /** Checked questions start locked. */
  checked?: boolean;
}

export interface AutosaveOptions {
  /** Persists a flag; without it flags stay local. */
  saveFlag?: SaveFlag;
  /** Called once per code when the server says the attempt cannot take answers any more. */
  onFatal?: (code: "attempt_time_up" | "attempt_not_active") => void;
}

/** Server bounds of `timeSpentSeconds` per request. */
const MAX_TIME_DELTA = 3600;

const statusCode = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;
const errorCode = (error: unknown): string => {
  const data = (error as { response?: { data?: { code?: string; errorCode?: string } } })?.response
    ?.data;
  return String(data?.code ?? data?.errorCode ?? "").toLowerCase();
};

// One flight per question. Keep ambiguous network mutations for idempotent retry, including their original baseline.
// Time spent is accumulated per question and sent with the next save of that question (or alone via commitTime);
// flags have their own latest-wins queue.
export class AttemptAutosave {
  private states: AnswerState[];
  private listeners = new Set<() => void>();
  private operations = new Map<string, Operation>();
  private flights = new Map<string, Promise<void>>();
  private pendingTime = new Map<string, number>();
  private timeRequests = new Set<string>();
  private flagFlights = new Map<string, Promise<void>>();
  private serverFlags = new Map<string, boolean>();
  private fatal = new Set<string>();
  private disposed = false;
  private save: Save;
  private options: AutosaveOptions;
  constructor(questions: AutosaveQuestion[], save: Save, options: AutosaveOptions = {}) {
    this.save = save;
    this.options = options;
    this.states = questions.map((q) => ({
      id: q.id,
      selected: q.userAnswer,
      saved: q.userAnswer,
      revision: q.revision,
      status: q.checked ? "locked" : "saved",
      flagged: Boolean(q.flagged),
      flagStatus: "saved",
    }));
    questions.forEach((q) => this.serverFlags.set(q.id, Boolean(q.flagged)));
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  snapshot = () => this.states;
  private find(id: string) {
    return this.states.find((s) => s.id === id);
  }
  private publish(id: string, patch: Partial<AnswerState>) {
    if (this.disposed) return;
    this.states = this.states.map((s) => (s.id === id ? { ...s, ...patch } : s));
    this.listeners.forEach((listener) => listener());
  }
  select(id: string, selected: Answer) {
    if (this.disposed) return;
    const state = this.find(id);
    if (!state || state.status === "locked") return;
    this.publish(id, { selected, status: state.status === "conflict" ? "conflict" : "unsaved" });
    if (state.status !== "conflict") void this.pump(id);
  }
  /** Adds seconds spent on a question; they travel with its next save. */
  addTime(id: string, seconds: number) {
    if (this.disposed || !(seconds > 0)) return;
    const state = this.find(id);
    if (!state || state.status === "locked") return;
    this.pendingTime.set(id, Math.min(MAX_TIME_DELTA, (this.pendingTime.get(id) ?? 0) + seconds));
  }
  /** Sends accumulated time even when the answer did not change (e.g. on leaving a group). */
  commitTime(id: string) {
    if (this.disposed || !((this.pendingTime.get(id) ?? 0) >= 1)) return Promise.resolve();
    const state = this.find(id);
    if (!state || state.status === "locked" || state.status === "conflict")
      return Promise.resolve();
    this.timeRequests.add(id);
    return this.pump(id);
  }
  /** Marks questions as checked with the answer the server graded: their answers are final. */
  lock(items: Iterable<{ id: string; userAnswer: Answer }>) {
    for (const { id, userAnswer } of items) {
      const state = this.find(id);
      if (!state) continue;
      this.pendingTime.delete(id);
      this.timeRequests.delete(id);
      this.operations.delete(id);
      this.publish(id, { status: "locked", selected: userAnswer, saved: userAnswer });
    }
  }
  private pump(id: string): Promise<void> {
    if (this.disposed || this.flights.has(id)) return this.flights.get(id) ?? Promise.resolve();
    const run = async () => {
      while (!this.disposed) {
        const state = this.find(id)!;
        if (state.status === "conflict" || state.status === "locked") return;
        let op = this.operations.get(id);
        if (!op && state.selected === state.saved && !this.timeRequests.has(id)) {
          this.publish(id, { status: "saved" });
          return;
        }
        if (!op) {
          const time = Math.floor(this.pendingTime.get(id) ?? 0);
          op = {
            answer: state.selected,
            revision: state.revision,
            mutationId: crypto.randomUUID(),
            time,
          };
          this.pendingTime.set(id, (this.pendingTime.get(id) ?? 0) - time);
          this.timeRequests.delete(id);
        }
        this.operations.set(id, op);
        this.publish(id, { status: "saving" });
        try {
          let result: SavedAnswer;
          const send = (o: Operation) =>
            o.time > 0
              ? this.save(id, o.answer, o.revision, o.mutationId, o.time)
              : this.save(id, o.answer, o.revision, o.mutationId);
          try {
            result = await send(op);
          } catch (error) {
            const code = statusCode(error);
            if (this.disposed || (code != null && code < 500)) throw error;
            // One bounded retry using exactly the same mutation; no exponential queue that survives logout.
            result = await send(op);
          }
          if (this.disposed) return;
          this.operations.delete(id);
          this.publish(id, { saved: result.userAnswer, revision: result.revision });
        } catch (error) {
          // The operation (with its seconds) stays queued for an idempotent retry, as before.
          const code = errorCode(error);
          if (code === "answer_locked") {
            this.operations.delete(id);
            this.publish(id, { status: "locked", selected: state.saved });
            return;
          }
          if (code === "attempt_time_up" || code === "attempt_not_active") {
            this.operations.delete(id);
            this.publish(id, { status: "error" });
            if (!this.fatal.has(code)) {
              this.fatal.add(code);
              this.options.onFatal?.(code);
            }
            return;
          }
          this.publish(id, { status: statusCode(error) === 409 ? "conflict" : "error" });
          return;
        }
      }
    };
    // Defer so the map is populated before an immediately resolved/rejected save can complete.
    const task = Promise.resolve()
      .then(run)
      .finally(() => this.flights.delete(id));
    this.flights.set(id, task);
    return task;
  }
  private restoreTime(id: string, op: Operation) {
    if (op.time > 0) this.pendingTime.set(id, (this.pendingTime.get(id) ?? 0) + op.time);
  }
  /** Optimistic flag toggle; the latest wish wins, a failure reverts to the server value. */
  toggleFlag(id: string, flagged?: boolean) {
    if (this.disposed) return Promise.resolve();
    const state = this.find(id);
    if (!state) return Promise.resolve();
    const next = flagged ?? !state.flagged;
    this.publish(id, { flagged: next, flagStatus: this.options.saveFlag ? "saving" : "saved" });
    return this.pumpFlag(id);
  }
  private pumpFlag(id: string): Promise<void> {
    const saveFlag = this.options.saveFlag;
    if (!saveFlag || this.disposed) return Promise.resolve();
    if (this.flagFlights.has(id)) return this.flagFlights.get(id)!;
    const run = async () => {
      while (!this.disposed) {
        const wanted = this.find(id)!.flagged;
        if (wanted === this.serverFlags.get(id)) {
          this.publish(id, { flagStatus: "saved" });
          return;
        }
        try {
          const result = await saveFlag(id, wanted);
          this.serverFlags.set(id, result.flagged);
        } catch {
          const server = this.serverFlags.get(id) ?? false;
          this.publish(id, { flagged: server, flagStatus: "error" });
          return;
        }
      }
    };
    const task = Promise.resolve()
      .then(run)
      .finally(() => this.flagFlights.delete(id));
    this.flagFlights.set(id, task);
    return task;
  }
  reconcile(
    questions: {
      id: string;
      userAnswer: Answer;
      revision: number;
      flagged?: boolean;
      checked?: boolean;
    }[],
  ) {
    for (const q of questions) {
      const state = this.find(q.id);
      if (!state) continue;
      if (q.flagged !== undefined && !this.flagFlights.has(q.id)) {
        this.serverFlags.set(q.id, q.flagged);
        if (state.flagStatus !== "saving") this.publish(q.id, { flagged: q.flagged });
      }
      if (this.flights.has(q.id)) continue;
      if (q.checked && state.status !== "locked") {
        this.publish(q.id, {
          selected: q.userAnswer,
          saved: q.userAnswer,
          revision: q.revision,
          status: "locked",
        });
      } else if (state.status === "conflict")
        this.publish(q.id, { server: { answer: q.userAnswer, revision: q.revision } });
      else if (state.status === "saved")
        this.publish(q.id, { selected: q.userAnswer, saved: q.userAnswer, revision: q.revision });
    }
  }
  resolve(id: string, keepLocal: boolean) {
    const state = this.find(id)!;
    if (!state.server || this.disposed) return;
    const dropped = this.operations.get(id);
    if (dropped) this.restoreTime(id, dropped);
    this.operations.delete(id);
    this.publish(id, {
      selected: keepLocal ? state.selected : state.server.answer,
      saved: state.server.answer,
      revision: state.server.revision,
      server: undefined,
      status: keepLocal ? "unsaved" : "saved",
    });
    if (keepLocal) void this.pump(id);
  }
  retry(id: string) {
    return this.pump(id);
  }
  /** Saves every pending answer, time and flag; true when everything is confirmed. */
  async flush() {
    for (const s of this.states) {
      if ((this.pendingTime.get(s.id) ?? 0) >= 1 && s.status !== "locked")
        this.timeRequests.add(s.id);
    }
    await Promise.all([
      ...this.states.map((s) => this.pump(s.id)),
      ...this.states.map((s) => this.pumpFlag(s.id)),
    ]);
    return this.states.every(
      (s) => (s.status === "saved" || s.status === "locked") && s.flagStatus !== "saving",
    );
  }
  /**
   * (Re)starts the queue after `dispose()` — React StrictMode unmounts and remounts effects —
   * optionally replacing the fatal-error handler.
   */
  activate(onFatal?: AutosaveOptions["onFatal"]) {
    this.disposed = false;
    if (onFatal) this.options = { ...this.options, onFatal };
  }
  dispose() {
    this.disposed = true;
    this.listeners.clear();
  }
}
