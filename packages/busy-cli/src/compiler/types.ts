export type BusyDocumentKind =
  | 'checklist'
  | 'concept'
  | 'config'
  | 'document'
  | 'model'
  | 'package'
  | 'playbook'
  | 'prompt'
  | 'role'
  | 'tool'
  | 'view'
  | 'workspace';

export interface BusySourceSpan {
  readonly path: string;
  readonly startLine: number;
  readonly endLine: number;
}

export type BusyDiagnosticSeverity = 'error' | 'warning';

export interface BusyDiagnostic {
  readonly code: string;
  readonly severity: BusyDiagnosticSeverity;
  readonly message: string;
  readonly span: BusySourceSpan;
}

export interface BusyMetadataIR {
  readonly name: string;
  readonly description: string;
  readonly typeLabels: readonly string[];
  /** Frontmatter not interpreted by the compiler remains available to consumers. */
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface BusyImportIR {
  readonly name: string;
  readonly target: string;
  readonly anchor?: string;
  readonly resolvedDocumentId?: string;
  readonly resolvedPath?: string;
  readonly targetKind?: 'busy-document' | 'resource' | 'remote';
  readonly span: BusySourceSpan;
}

export interface BusySectionIR {
  readonly id: string;
  readonly title: string;
  readonly annotations: readonly string[];
  readonly depth: number;
  readonly content: string;
  /** Content before the first child heading. */
  readonly directContent: string;
  readonly children: readonly BusySectionIR[];
  readonly span: BusySourceSpan;
}

export interface BusyFieldIR {
  readonly name: string;
  readonly description: string;
  readonly type?: string;
  readonly required: boolean;
  readonly raw: string;
  readonly span: BusySourceSpan;
}

export interface BusyConditionIR {
  readonly expression: string;
  readonly span: BusySourceSpan;
}

export interface BusyRoleContextIR {
  readonly role: string;
  readonly span: BusySourceSpan;
}

export interface BusyTriggerIR {
  readonly eventType?: string;
  readonly schedule?: string;
  readonly operation?: string;
  readonly queueWhenPaused?: boolean;
  readonly config: Readonly<Record<string, unknown>>;
  readonly raw: string;
  readonly span: BusySourceSpan;
}

export interface BusyEmitIR {
  readonly eventType: string;
  readonly when?: string;
  readonly payload?: string;
  readonly correlation?: string;
  readonly config: Readonly<Record<string, unknown>>;
  readonly raw: string;
  readonly span: BusySourceSpan;
}

export interface BusyChecklistItemIR {
  readonly id: string;
  readonly text: string;
  readonly checked?: boolean;
  readonly span: BusySourceSpan;
}

export interface BusyStepIR {
  readonly id: string;
  readonly ordinal?: string;
  readonly title?: string;
  readonly instruction: string;
  readonly calls: readonly string[];
  readonly conditions: readonly BusyConditionIR[];
  readonly roleContexts: readonly BusyRoleContextIR[];
  readonly children: readonly BusyStepIR[];
  readonly span: BusySourceSpan;
}

export interface BusyOperationIR {
  readonly id: string;
  readonly name: string;
  readonly private: boolean;
  readonly description: string;
  readonly inputs: readonly BusyFieldIR[];
  readonly outputs: readonly BusyFieldIR[];
  readonly triggers: readonly BusyTriggerIR[];
  readonly emits: readonly BusyEmitIR[];
  readonly steps: readonly BusyStepIR[];
  readonly checklist: readonly BusyChecklistItemIR[];
  readonly span: BusySourceSpan;
}

export interface BusyModelIR {
  readonly identity?: BusySectionIR;
  readonly fields: readonly BusyFieldIR[];
  readonly lifecycle?: BusySectionIR;
  readonly rules?: BusySectionIR;
  readonly relationships?: BusySectionIR;
  readonly persistence?: BusySectionIR;
}

export interface BusyDocumentIR {
  readonly id: string;
  readonly path: string;
  readonly sourceHash: string;
  readonly kind: BusyDocumentKind;
  readonly metadata: BusyMetadataIR;
  readonly imports: readonly BusyImportIR[];
  readonly setup?: BusySectionIR;
  readonly sections: readonly BusySectionIR[];
  readonly operations: readonly BusyOperationIR[];
  readonly triggers: readonly BusyTriggerIR[];
  readonly model?: BusyModelIR;
  readonly diagnostics: readonly BusyDiagnostic[];
}

export interface BusyWorkspaceStats {
  readonly documents: number;
  readonly operations: number;
  readonly steps: number;
  readonly triggers: number;
  readonly emits: number;
  readonly checklistItems: number;
  readonly documentsByKind: Readonly<Record<string, number>>;
}

export interface BusyWorkspaceIR {
  readonly schema: 'busy.semantic-ir/v1';
  readonly workspace: string;
  readonly root: string;
  readonly documents: readonly BusyDocumentIR[];
  readonly diagnostics: readonly BusyDiagnostic[];
  readonly stats: BusyWorkspaceStats;
}

export interface CompileBusyWorkspaceOptions {
  /** Throw after compilation when any error diagnostic was produced. */
  readonly strict?: boolean;
}
