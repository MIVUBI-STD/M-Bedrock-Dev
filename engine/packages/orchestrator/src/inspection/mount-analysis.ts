import { extractRideableSemantics, type ParsedEntityDefinition } from "../../../../analyzers/entities/src/index.js";

export function analyzeMountSurfaces(
  entities: readonly ParsedEntityDefinition[],
) {
  const rideableStates = entities.flatMap(extractRideableSemantics);
  return {
    rideableStates,
    rideableEntities: new Set(
      rideableStates.map((item) => item.entityIdentifier ?? item.stateId),
    ).size,
    seatCountMismatches: rideableStates.filter(
      (item) =>
        item.seatCount !== undefined &&
        item.declaredSeats > 0 &&
        item.seatCount !== item.declaredSeats,
    ).length,
    multipleControllingSeatStates: rideableStates.filter(
      (item) => item.controllingSeats.length > 1,
    ).length,
    runtimeRelationshipStatus:
      rideableStates.length > 0
        ? "unresolved" as const
        : "not-applicable" as const,
  };
}
