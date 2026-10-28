import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import { checkReply, jsonValue, selectValues, type Values, type ReplySchema } from './schema.js';
import type { RunProgram, RunStep } from './program.js';

export interface Sense {
  token: string;
  pointer: { operation: string; step: string; source: RunStep['source'] };
  packet: { context: Values; respondWith: ReplySchema; failWith: ReplySchema };
}
export interface Frame { operation: string; step: string | null; values: Values }
const failureSchema: ReplySchema = { type: 'object', properties: {
  reason: { type: 'string' }, evidence: { type: 'array', items: { type: 'string' } },
  partialEffects: { type: 'array', items: { type: 'string' } },
}, required: ['reason'], additionalProperties: false };
export interface RunFailure {
  id: string; reason: string; evidence: string[]; partialEffects: string[];
  pointer: Sense['pointer']; inputs: Values; stack: Frame[];
  /** The invoking frame's continuation; it has not executed while its child failed. */
  caller: { operation: string; step: string | null } | null;
}
interface RunState {
  id: string; programId: string; status: 'waiting' | 'failed' | 'completed' | 'cancelled'; createdAt: string;
  inputs: Values; sequence: number; stack: Frame[]; restartedFrom: string | null;
  current: Sense | null; result: Values | null;
  failure?: RunFailure | null;
}
export interface RunEvent { seq: number; at: string; type: string; [key: string]: unknown }
export interface RunExchange extends Partial<Sense> {
  runId: string; status: RunState['status']; result?: Values | null;
  failure?: RunFailure;
  recoveryGuidance?: string;
}

const recoveryGuidance = 'Failure recorded; the goal remains open. Diagnose the failed boundary and take the next authorized repair action. Check the owning Tool’s documented providers and setup before declaring it unavailable. Preserve partial effects and explicit no-retry limits; this guidance grants no new authority or automatic retry. Verify the repair before explicitly resuming this instruction. If blocked externally, record the dependency, owner and next action/checkpoint. Do not advance or imply completion while required work remains unmet.';

/** Storage and control flow only. The caller owns execution and semantic judgments. */
export class BusyRunner {
  private constructor(private readonly db: DatabaseSync) {
    db.exec(`PRAGMA busy_timeout = 3000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS programs (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, program_id TEXT NOT NULL REFERENCES programs(id), state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (run_id TEXT NOT NULL REFERENCES runs(id), seq INTEGER NOT NULL, record TEXT NOT NULL, PRIMARY KEY(run_id, seq));`);
  }
  static async open(path: string): Promise<BusyRunner> {
    // Loading the public BUSY API or unrelated CLI commands must not require SQLite.
    let sqlite: typeof import('node:sqlite');
    try { sqlite = await import('node:sqlite'); }
    catch { throw new Error('busy run requires Node.js 22.13+ with node:sqlite available.'); }
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    const db = new sqlite.DatabaseSync(path);
    try { return new BusyRunner(db); } catch (error) { db.close(); throw error; }
  }
  close(): void { this.db.close(); }
  private atomic<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  private program(id: string): RunProgram {
    const row = this.db.prepare('SELECT snapshot FROM programs WHERE id = ?').get(id);
    if (!row) throw new Error(`Unknown program: ${id}`);
    return JSON.parse(row.snapshot as string) as RunProgram;
  }
  private state(id: string): RunState {
    const row = this.db.prepare('SELECT state FROM runs WHERE id = ?').get(id);
    if (!row) throw new Error(`Unknown run: ${id}`);
    return JSON.parse(row.state as string) as RunState;
  }
  private exchange(state: RunState): RunExchange {
    // Also advertise the universal failure path when reopening a pre-existing run.
    const current = state.current ? { ...state.current, packet: { ...state.current.packet, failWith: structuredClone(failureSchema) } } : {};
    return { runId: state.id, status: state.status, ...current, ...(state.failure ? { failure: state.failure } : {}),
      ...(state.status === 'failed' ? { recoveryGuidance } : {}),
      ...(state.status === 'completed' ? { result: state.result } : {}) };
  }
  sense(id: string): RunExchange { return this.exchange(this.state(id)); }
  list(): { runId: string; status: RunState['status']; createdAt: string; programId: string }[] {
    return this.db.prepare('SELECT state FROM runs ORDER BY rowid DESC').all().map(row => {
      const state = JSON.parse(row.state as string) as RunState;
      return { runId: state.id, status: state.status, createdAt: state.createdAt, programId: state.programId };
    });
  }
  private save(state: RunState): void { this.db.prepare('UPDATE runs SET state = ? WHERE id = ?').run(JSON.stringify(state), state.id); }
  private event(state: RunState, type: string, data: Record<string, unknown> = {}): void {
    const event: RunEvent = { seq: ++state.sequence, at: new Date().toISOString(), type, ...data };
    this.db.prepare('INSERT INTO events (run_id, seq, record) VALUES (?, ?, ?)').run(state.id, event.seq, JSON.stringify(event));
  }
  history(id: string): RunEvent[] {
    this.state(id);
    return this.db.prepare('SELECT record FROM events WHERE run_id = ? ORDER BY seq').all(id).map(row => JSON.parse(row.record as string) as RunEvent);
  }
  private frame(program: RunProgram, operation: string, values: Values): Frame {
    const op = program.operations[operation];
    return { operation, step: op.steps[0].id, values: selectValues(op.inputs, values) };
  }
  private locate(state: RunState, program: RunProgram): { frame: Frame; step: RunStep } {
    const frame = state.stack[state.stack.length - 1];
    const step = program.operations[frame.operation].steps.find(s => s.id === frame.step);
    if (!step) throw new Error(`Invalid program pointer: ${frame.operation}/${frame.step}`);
    return { frame, step };
  }
  private present(state: RunState, program: RunProgram): void {
    const { frame, step } = this.locate(state, program);
    const context: Values = { instruction: step.instruction, ...selectValues(step.context, frame.values) };
    if (Object.keys(step.definitions).length) context.definitions = step.definitions;
    if (Object.keys(step.tools).length) context.tools = step.tools;
    state.current = {
      token: randomUUID(), pointer: { operation: frame.operation, step: step.id, source: step.source },
      packet: { context, respondWith: step.respondWith, failWith: failureSchema },
    };
    this.event(state, 'sense', { ...state.current, stack: state.stack.map(({ operation, step }) => ({ operation, step })) });
  }
  start(program: RunProgram, inputs: Values, restartId?: string): RunExchange {
    const values = z.record(jsonValue).parse(inputs);
    if (program.version !== 1) throw new Error('Unsupported runner program version');
    return this.atomic(() => {
      const previous = restartId ? this.state(restartId) : undefined;
      this.db.prepare('INSERT OR IGNORE INTO programs (id, snapshot) VALUES (?, ?)').run(program.id, JSON.stringify(program));
      const state: RunState = {
        id: randomUUID(), programId: program.id, status: 'waiting', createdAt: new Date().toISOString(),
        inputs: values, sequence: 0, stack: [this.frame(program, program.entry, values)],
        restartedFrom: restartId ?? null, current: null, result: null,
      };
      this.db.prepare('INSERT INTO runs (id, program_id, state) VALUES (?, ?, ?)').run(state.id, program.id, JSON.stringify(state));
      this.event(state, 'started', { programId: program.id, inputs: values, restartedFrom: state.restartedFrom });
      if (previous) {
        if (previous.status === 'waiting') {
          this.event(previous, 'cancelled', { reason: 'Restart requested', pointer: previous.current!.pointer });
          previous.status = 'cancelled';
          previous.current = null;
        }
        this.event(previous, 'restarted', { newRunId: state.id });
        this.save(previous);
      }
      this.present(state, program);
      this.save(state);
      return this.exchange(state);
    });
  }
  emit(id: string, token: string, reply: unknown): RunExchange {
    return this.atomic(() => {
      const state = this.state(id);
      if (state.status !== 'waiting') throw new Error(`Run is ${state.status}`);
      if (!token || state.current!.token !== token) throw new Error('Stale reply: use busy run sense to read the current token');
      const program = this.program(state.programId);
      const { frame, step } = this.locate(state, program);
      checkReply(reply, step.respondWith);
      const values = reply as Values; // Compiled step replies always have an object schema.
      this.event(state, 'emit', { token, pointer: state.current!.pointer, response: reply });
      Object.assign(frame.values, values);
      const route = step.routes ? step.routes[values.decision as string] : { next: step.next! };
      frame.step = route.next;
      if (route.call) {
        const child = this.frame(program, route.call, frame.values);
        state.stack.push(child);
        this.event(state, 'call', { operation: route.call, from: frame.operation, resumeAt: route.next, inputs: child.values });
      }
      while (state.stack.length && state.stack[state.stack.length - 1].step === null) {
        const finished = state.stack.pop()!;
        const values = selectValues(program.operations[finished.operation].outputs, finished.values);
        this.event(state, 'return', { operation: finished.operation, values });
        if (state.stack.length) Object.assign(state.stack[state.stack.length - 1].values, values);
        else state.result = values;
      }
      if (state.stack.length) this.present(state, program);
      else {
        state.status = 'completed'; state.current = null;
        this.event(state, 'completed', { result: state.result, meaning: 'Declared exchanges completed; results remain caller-reported.' });
      }
      this.save(state);
      return this.exchange(state);
    });
  }
  /** Report inability to follow the current instruction, independent of its success schema. */
  fail(id: string, token: string, report: unknown): RunExchange {
    return this.atomic(() => {
      const state = this.state(id);
      if (state.status !== 'waiting') throw new Error(`Run is ${state.status}`);
      if (!token || state.current!.token !== token) throw new Error('Stale reply: use busy run sense to read the current token');
      checkReply(report, failureSchema, 'failure');
      const value = report as { reason: string; evidence?: string[]; partialEffects?: string[] };
      if (!value.reason.trim()) throw new Error('Give a failure reason');
      const caller = state.stack.at(-2);
      state.failure = { id: randomUUID(), reason: value.reason, evidence: value.evidence ?? [],
        partialEffects: value.partialEffects ?? [], pointer: state.current!.pointer,
        inputs: state.inputs, stack: state.stack,
        caller: caller ? { operation: caller.operation, step: caller.step } : null };
      state.status = 'failed';
      state.current!.token = randomUUID();
      this.event(state, 'failed', { token, recoveryToken: state.current!.token, failure: state.failure });
      this.save(state);
      return this.exchange(state);
    });
  }
  /** Explicitly retry the pinned failed instruction, optionally correcting scoped values. */
  resume(id: string, token: string, updates: Values = {}): RunExchange {
    const values = z.record(jsonValue).parse(updates);
    return this.atomic(() => {
      const state = this.state(id);
      if (state.status !== 'failed') throw new Error(`Run is ${state.status}; resume requires a failed run`);
      if (!token || state.current!.token !== token) throw new Error('Stale recovery: use busy run sense to read the current token');
      const program = this.program(state.programId);
      const { frame, step } = this.locate(state, program);
      const allowed = new Set([...Object.keys(frame.values), ...program.operations[frame.operation].inputs, ...step.context]);
      for (const key of Object.keys(values)) if (!allowed.has(key)) throw new Error(`Unknown recovery binding: ${key}`);
      this.event(state, 'resumed', { failureId: state.failure!.id, pointer: state.current!.pointer, updates: values });
      Object.assign(frame.values, values);
      state.status = 'waiting'; state.failure = null;
      this.present(state, program);
      this.save(state);
      return this.exchange(state);
    });
  }
  cancel(id: string, reason: string): RunExchange {
    if (!reason.trim()) throw new Error('Give a cancellation reason');
    return this.atomic(() => {
      const state = this.state(id);
      if (state.status !== 'waiting' && state.status !== 'failed') throw new Error(`Run is ${state.status}`);
      this.event(state, 'cancelled', { reason, pointer: state.current!.pointer, stack: state.stack });
      state.status = 'cancelled'; state.current = null;
      this.save(state);
      return this.exchange(state);
    });
  }
  inspect(id: string): RunState & { program: RunProgram; history: RunEvent[] } {
    const state = this.state(id);
    return { ...state, program: this.program(state.programId), history: this.history(id) };
  }
  receipt(id: string): Record<string, unknown> {
    const { status, program, history, result, failure } = this.inspect(id);
    return {
      runId: id, status, programId: program.id, sourceHash: program.sourceHash, interpretationHash: program.interpretationHash,
      meaning: 'Records presented instructions and accepted replies. It does not independently verify execution, truth, or semantic compliance.',
      exchanges: history.filter(event => event.type === 'emit').length, result, history,
      ...(failure ? { failure } : {}),
    };
  }
}
