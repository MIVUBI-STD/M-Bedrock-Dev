export type MutationDependentActionKind =
  | "function-call"
  | "scoreboard-write"
  | "tag-write"
  | "entity-event"
  | "dialogue"
  | "script-method"
  | "dynamic-property-write";

export interface MutationDependentActionContract {
  id: string;
  kind: MutationDependentActionKind;
  functionTarget?: string;
  objective?: string;
  tag?: string;
  event?: string;
  dialogueScene?: string;
  scriptSymbol?: string;
  dynamicPropertyId?: string;
  purpose?: string;
}

export function mutationDependentActionLabel(
  contract: MutationDependentActionContract,
): string {
  return contract.purpose ?? contract.id;
}
