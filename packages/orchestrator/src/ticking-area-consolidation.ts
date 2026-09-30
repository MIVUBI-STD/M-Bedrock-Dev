export interface TickingAreaBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface TickingAreaConsolidationInput {
  arenaAreas: readonly TickingAreaBox[];
  permanentAreaCount: number;
  globalAreaLimit: number;
  targetConcurrentArenas: number;
  maxChunksPerArea?: number;
}

export interface TickingAreaConsolidationPlan {
  status: "not-needed" | "feasible" | "not-feasible" | "invalid";
  currentAreasPerArena: number;
  currentSafeConcurrentArenas: number;
  candidateAreasPerArena: number;
  candidateSafeConcurrentArenas: number;
  mergedArea?: TickingAreaBox;
  mergedChunkCount?: number;
  reasons: readonly string[];
}

function normalize(box: TickingAreaBox): TickingAreaBox {
  return { ...box, minX: Math.min(box.minX, box.maxX), maxX: Math.max(box.minX, box.maxX),
    minZ: Math.min(box.minZ, box.maxZ), maxZ: Math.max(box.minZ, box.maxZ) };
}

function chunkCount(box: TickingAreaBox): number {
  const value = normalize(box);
  const minChunkX = Math.floor(value.minX / 16);
  const maxChunkX = Math.floor(value.maxX / 16);
  const minChunkZ = Math.floor(value.minZ / 16);
  const maxChunkZ = Math.floor(value.maxZ / 16);
  return (maxChunkX - minChunkX + 1) * (maxChunkZ - minChunkZ + 1);
}

function safeConcurrency(limit: number, permanent: number, perArena: number): number {
  if (perArena <= 0) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.floor((limit - permanent) / perArena));
}

export function proposeTickingAreaConsolidation(
  input: TickingAreaConsolidationInput,
): TickingAreaConsolidationPlan {
  const reasons: string[] = [];
  if (!Number.isInteger(input.permanentAreaCount) || input.permanentAreaCount < 0 ||
      !Number.isInteger(input.globalAreaLimit) || input.globalAreaLimit < 1 ||
      !Number.isInteger(input.targetConcurrentArenas) || input.targetConcurrentArenas < 1) {
    return {
      status: "invalid",
      currentAreasPerArena: input.arenaAreas.length,
      currentSafeConcurrentArenas: 0,
      candidateAreasPerArena: 0,
      candidateSafeConcurrentArenas: 0,
      reasons: ["Capacity inputs must be non-negative integers and target concurrency must be positive."],
    };
  }

  const currentAreasPerArena = input.arenaAreas.length;
  const currentSafeConcurrentArenas = safeConcurrency(
    input.globalAreaLimit, input.permanentAreaCount, currentAreasPerArena,
  );

  if (currentSafeConcurrentArenas >= input.targetConcurrentArenas) {
    return {
      status: "not-needed",
      currentAreasPerArena,
      currentSafeConcurrentArenas,
      candidateAreasPerArena: currentAreasPerArena,
      candidateSafeConcurrentArenas: currentSafeConcurrentArenas,
      reasons: ["Existing ticking-area allocation already satisfies target concurrency."],
    };
  }

  if (input.arenaAreas.length === 0) {
    return {
      status: "not-feasible",
      currentAreasPerArena,
      currentSafeConcurrentArenas,
      candidateAreasPerArena: 0,
      candidateSafeConcurrentArenas: currentSafeConcurrentArenas,
      reasons: ["No per-arena ticking areas were available to consolidate."],
    };
  }

  const boxes = input.arenaAreas.map(normalize);
  const mergedArea: TickingAreaBox = {
    id: "merged-arena-area",
    minX: Math.min(...boxes.map((item) => item.minX)),
    maxX: Math.max(...boxes.map((item) => item.maxX)),
    minZ: Math.min(...boxes.map((item) => item.minZ)),
    maxZ: Math.max(...boxes.map((item) => item.maxZ)),
  };
  const mergedChunkCount = chunkCount(mergedArea);
  const candidateSafeConcurrentArenas = safeConcurrency(
    input.globalAreaLimit, input.permanentAreaCount, 1,
  );

  if (input.maxChunksPerArea !== undefined && mergedChunkCount > input.maxChunksPerArea) {
    reasons.push("Merged area spans " + mergedChunkCount +
      " chunks, exceeding the declared per-area budget of " + input.maxChunksPerArea + ".");
  }
  if (candidateSafeConcurrentArenas < input.targetConcurrentArenas) {
    reasons.push("Even one ticking area per arena supports only " + candidateSafeConcurrentArenas +
      " concurrent arenas at the declared global limit.");
  }

  const feasible = reasons.length === 0 &&
    candidateSafeConcurrentArenas >= input.targetConcurrentArenas;

  if (feasible) {
    reasons.push("Consolidating " + currentAreasPerArena +
      " arena areas into one raises declared capacity from " + currentSafeConcurrentArenas +
      " to " + candidateSafeConcurrentArenas + " concurrent arenas.");
  }

  return {
    status: feasible ? "feasible" : "not-feasible",
    currentAreasPerArena,
    currentSafeConcurrentArenas,
    candidateAreasPerArena: 1,
    candidateSafeConcurrentArenas,
    mergedArea,
    mergedChunkCount,
    reasons,
  };
}
