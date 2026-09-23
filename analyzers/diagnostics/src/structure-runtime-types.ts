export interface StructureRuntimeDiagnosticInput {
  correlations: Array<{
    load: {
      functionId: string;
      line?: number;
      semantics: {
        name: string;
        includeEntities?: boolean;
        includeBlocks?: boolean;
        integrity?: number;
      };
    };
    status: "resolved" | "missing" | "ambiguous";
    candidates: Array<{
      relativePath: string;
      semantics: {
        entityCount: number;
        hasEntities: boolean;
        paletteSize: number;
        commandBlockPaletteEntries: number;
        containerPaletteEntries: number;
      };
    }>;
    findings: Array<
      | "entities-excluded"
      | "blocks-excluded"
      | "probabilistic-command-block-load"
      | "probabilistic-container-load"
      | "runtime-logic-content"
    >;
  }>;
  runtimeLogicStructureLoads: number;
  chunkLifecycleEvidence: {
    tickingAreas: number;
    preloadedTickingAreas: number;
    areaLoadedSchedules: number;
  };
}
