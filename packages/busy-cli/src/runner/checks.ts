import type { Interpretation } from './schema.js';

const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(v => b.has(v));
const routes = (step: Interpretation['operations'][string]['steps'][number]) => step.routes ? Object.values(step.routes) : [{ next: step.next! }];

/** Must-analysis of binding availability, not truth or semantic compliance. */
export function checkBindings(plan: Interpretation): string[] {
  const findings: string[] = [];
  for (const [name, operation] of Object.entries(plan.operations)) {
    const steps = new Map(operation.steps.map(s => [s.id, s]));
    const first = operation.steps[0].id;
    const reachable = new Set<string>();
    const todo = [first];
    while (todo.length) {
      const id = todo.pop()!;
      if (reachable.has(id) || !steps.has(id)) continue;
      reachable.add(id);
      for (const route of routes(steps.get(id)!)) if (route.next) todo.push(route.next);
    }
    const produced = (step: typeof operation.steps[number]) => step.respondWith.required ?? [];
    const outgoing = (step: typeof operation.steps[number], route: { call?: string; next: string | null }, before: Set<string>) =>
      new Set([...before, ...produced(step), ...(route.call ? plan.operations[route.call].outputs : [])]);
    const universe = new Set([...operation.inputs, ...operation.steps.flatMap(produced), ...Object.values(plan.operations).flatMap(o => o.outputs)]);
    const before = new Map([...reachable].map(id => [id, new Set(universe)]));
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of reachable) {
        const incoming = id === first ? [new Set(operation.inputs)] : [];
        for (const predecessor of operation.steps.filter(s => reachable.has(s.id))) {
          for (const route of routes(predecessor).filter(r => r.next === id)) incoming.push(outgoing(predecessor, route, before.get(predecessor.id)!));
        }
        const available = new Set([...incoming[0]].filter(v => incoming.every(s => s.has(v))));
        if (!same(available, before.get(id)!)) { before.set(id, available); changed = true; }
      }
    }
    for (const step of operation.steps) {
      if (!reachable.has(step.id)) { findings.push(`${name}/${step.id}: unreachable step`); continue; }
      for (const value of step.context) if (!before.get(step.id)!.has(value)) findings.push(`${name}/${step.id}: context ${value} is not defined on every path`);
      for (const route of routes(step)) {
        const afterReply = new Set([...before.get(step.id)!, ...produced(step)]);
        if (route.call) for (const value of plan.operations[route.call].inputs) if (!afterReply.has(value)) findings.push(`${name}/${step.id}: call ${route.call} lacks input ${value}`);
        if (route.next === null) for (const value of operation.outputs) if (!outgoing(step, route, before.get(step.id)!).has(value)) findings.push(`${name}/${step.id}: completion lacks output ${value}`);
      }
    }
  }
  const used = new Set<string>();
  const todo = [plan.entry];
  while (todo.length) {
    const name = todo.pop()!;
    if (used.has(name)) continue;
    used.add(name);
    for (const step of plan.operations[name].steps) for (const route of routes(step)) if (route.call) todo.push(route.call);
  }
  for (const name of Object.keys(plan.operations)) if (!used.has(name)) findings.push(`${name}: operation is never called`);
  return findings;
}
