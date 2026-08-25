import { compileBusyWorkspace } from '../compiler/compile-workspace.js';
import type {
  BusyDocumentIR,
  BusyWorkspaceIR,
  BusyWorkspaceStats,
  CompileBusyWorkspaceOptions,
} from '../compiler/types.js';
import { loadWorkspaceGraph, type WorkspaceGraph } from './graph.js';

/** @deprecated Prefer BusyDocumentIR. */
export type WorkspaceAutomationDocument = BusyDocumentIR;
/** @deprecated Prefer BusyWorkspaceStats. */
export type WorkspaceAutomationStats = BusyWorkspaceStats;

export type WorkspaceAutomationIR = BusyWorkspaceIR & {
  readonly dependencyGraph?: WorkspaceGraph;
};

export interface LoadWorkspaceAutomationIROptions extends CompileBusyWorkspaceOptions {
  readonly includeGraph?: boolean;
}

/**
 * Compile the canonical semantic BUSY IR used by automation consumers.
 *
 * The optional legacy dependency graph remains available for inspection while
 * semantic consumers migrate to document imports and operation structure in the
 * canonical IR itself.
 */
export async function loadWorkspaceAutomationIR(
  workspaceRoot: string,
  options: LoadWorkspaceAutomationIROptions = {},
): Promise<WorkspaceAutomationIR> {
  const semantic = await compileBusyWorkspace(workspaceRoot, options);
  return Object.freeze({
    ...semantic,
    ...(options.includeGraph
      ? { dependencyGraph: await loadWorkspaceGraph(workspaceRoot) }
      : {}),
  });
}
