import type { ParsedEntityDefinition } from "./types.js";

export interface EntityRideableSemantics {
  entityIdentifier?: string;
  stateId: string;
  seatCount?: number;
  declaredSeats: number;
  controllingSeats: readonly number[];
  dismountMode?: string;
  riderFamilies: readonly string[];
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function extractRideableSemantics(
  entity: ParsedEntityDefinition,
): EntityRideableSemantics[] {
  const states = [
    { id: "base", data: entity.baseComponentData },
    ...Object.entries(entity.componentGroupData).map(
      ([id, data]) => ({ id: "group:" + id, data }),
    ),
  ];
  return states.flatMap((state) => {
    const rideable = record(state.data["minecraft:rideable"]);
    if (!rideable) return [];
    const seats = Array.isArray(rideable.seats)
      ? rideable.seats.map(record).filter(
          (item): item is Record<string, unknown> => item !== undefined,
        )
      : [];
    const controllingSeats = seats
      .map((seat, index) => seat.controlling_seat === true ? index : -1)
      .filter((index) => index >= 0);
    const families = Array.isArray(rideable.family_types)
      ? rideable.family_types.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
    return [{
      ...(entity.identifier === undefined ? {} : { entityIdentifier: entity.identifier }),
      stateId: state.id,
      ...(typeof rideable.seat_count === "number" ? { seatCount: rideable.seat_count } : {}),
      declaredSeats: seats.length,
      controllingSeats,
      ...(typeof rideable.dismount_mode === "string" ? { dismountMode: rideable.dismount_mode } : {}),
      riderFamilies: families,
    }];
  });
}
