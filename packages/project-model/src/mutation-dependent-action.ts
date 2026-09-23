export type MutationDependentActionKind =
  | "function-call"
  | "scoreboard-write"
  | "tag-write"
  | "entity-event"
  | "dialogue";

export interface MutationDependentActionContract {
  id: string;
  kind: MutationDependentActionKind;
  functionTarget?: string;
  objective?: string;
  tag?: string;
  event?: string;
  dialogueScene?: string;
  purpose?: string;
}

export function mutationDependentActionLabel(
  contract: MutationDependentActionContract,
): string {
  return contract.purpose ?? contract.id;
}
