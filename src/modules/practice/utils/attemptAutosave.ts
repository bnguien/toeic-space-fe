import type { Answer, SavedAnswer } from "../api/attempts.api.ts";

export type AnswerState = {
  id: string;
  selected: Answer;
  saved: Answer;
  revision: number;
  status: "saved" | "saving" | "unsaved" | "error" | "conflict";
  server?: { answer: Answer; revision: number };
};
type Operation = { answer: Answer; revision: number; mutationId: string };
type Save = (
  id: string,
  answer: Answer,
  revision: number,
  mutationId: string,
) => Promise<SavedAnswer>;
const statusCode = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

// One flight per question. Keep ambiguous network mutations for idempotent retry, including their original baseline.
export class AttemptAutosave {
  private states: AnswerState[];
  private listeners = new Set<() => void>();
  private operations = new Map<string, Operation>();
  private flights = new Map<string, Promise<void>>();
  private disposed = false;
  private save: Save;
  constructor(questions: { id: string; userAnswer: Answer; revision: number }[], save: Save) {
    this.save = save;
    this.states = questions.map((q) => ({
      id: q.id,
      selected: q.userAnswer,
      saved: q.userAnswer,
      revision: q.revision,
      status: "saved",
    }));
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  snapshot = () => this.states;
  private publish(id: string, patch: Partial<AnswerState>) {
    if (this.disposed) return;
    this.states = this.states.map((s) => (s.id === id ? { ...s, ...patch } : s));
    this.listeners.forEach((listener) => listener());
  }
  select(id: string, selected: Answer) {
    if (this.disposed) return;
    const state = this.states.find((s) => s.id === id)!;
    this.publish(id, { selected, status: state.status === "conflict" ? "conflict" : "unsaved" });
    if (state.status !== "conflict") void this.pump(id);
  }
  private pump(id: string): Promise<void> {
    if (this.disposed || this.flights.has(id)) return this.flights.get(id) ?? Promise.resolve();
    const run = async () => {
      while (!this.disposed) {
        const state = this.states.find((s) => s.id === id)!;
        if (state.status === "conflict") return;
        let op = this.operations.get(id);
        if (!op && state.selected === state.saved) {
          this.publish(id, { status: "saved" });
          return;
        }
        op ??= {
          answer: state.selected,
          revision: state.revision,
          mutationId: crypto.randomUUID(),
        };
        this.operations.set(id, op);
        this.publish(id, { status: "saving" });
        try {
          let result: SavedAnswer;
          try {
            result = await this.save(id, op.answer, op.revision, op.mutationId);
          } catch (error) {
            const code = statusCode(error);
            if (this.disposed || (code != null && code < 500)) throw error;
            // One bounded retry using exactly the same mutation; no exponential queue that survives logout.
            result = await this.save(id, op.answer, op.revision, op.mutationId);
          }
          if (this.disposed) return;
          this.operations.delete(id);
          this.publish(id, { saved: result.userAnswer, revision: result.revision });
        } catch (error) {
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
  reconcile(questions: { id: string; userAnswer: Answer; revision: number }[]) {
    for (const q of questions) {
      const state = this.states.find((s) => s.id === q.id);
      if (!state || this.flights.has(q.id)) continue;
      if (state.status === "conflict")
        this.publish(q.id, { server: { answer: q.userAnswer, revision: q.revision } });
      else if (state.status === "saved")
        this.publish(q.id, { selected: q.userAnswer, saved: q.userAnswer, revision: q.revision });
    }
  }
  resolve(id: string, keepLocal: boolean) {
    const state = this.states.find((s) => s.id === id)!;
    if (!state.server || this.disposed) return;
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
  async flush() {
    await Promise.all(this.states.map((s) => this.pump(s.id)));
    return this.states.every((s) => s.status === "saved");
  }
  dispose() {
    this.disposed = true;
    this.listeners.clear();
  }
}
