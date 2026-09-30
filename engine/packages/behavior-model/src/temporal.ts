import {
  evaluateBehaviorPredicate,
} from "./condition.js";
import type {
  BehaviorTrace,
  PropertyEvaluation,
  TemporalProperty,
} from "./types.js";

function orderedStates(trace: BehaviorTrace) {
  return [...trace.states].sort(
    (left, right) => left.tick - right.tick,
  );
}

function deadlineReached(
  currentTick: number,
  startTick: number,
  withinTicks: number | undefined,
): boolean {
  return withinTicks !== undefined &&
    currentTick - startTick >= withinTicks;
}

export function evaluateTemporalProperty(
  trace: BehaviorTrace,
  property: TemporalProperty,
): PropertyEvaluation {
  const states = orderedStates(trace);

  if (states.length === 0) {
    return {
      propertyId: property.id,
      disposition: "unknown",
      witnessTicks: [],
      reason: "No states were observed.",
    };
  }

  if (property.kind === "always") {
    const violation = states.find(
      (state) =>
        !evaluateBehaviorPredicate(
          state,
          property.predicate,
        ),
    );

    if (violation) {
      return {
        propertyId: property.id,
        disposition: "violated",
        witnessTicks: [violation.tick],
        reason:
          "The ALWAYS predicate is false at an observed state.",
      };
    }

    return {
      propertyId: property.id,
      disposition: trace.complete
        ? "satisfied"
        : "unknown",
      witnessTicks: states.map((state) => state.tick),
      reason: trace.complete
        ? "The ALWAYS predicate held for the complete trace."
        : "The observed prefix satisfies ALWAYS so far, but the trace is incomplete.",
    };
  }

  if (property.kind === "eventually") {
    const startTick = states[0]!.tick;
    const witness = states.find(
      (state) =>
        evaluateBehaviorPredicate(
          state,
          property.predicate,
        ),
    );

    if (witness) {
      if (
        property.withinTicks !== undefined &&
        witness.tick - startTick >
          property.withinTicks
      ) {
        return {
          propertyId: property.id,
          disposition: "violated",
          witnessTicks: [witness.tick],
          reason:
            "The EVENTUALLY predicate became true only after its deadline.",
        };
      }
      return {
        propertyId: property.id,
        disposition: "satisfied",
        witnessTicks: [witness.tick],
        reason:
          "The EVENTUALLY predicate was observed.",
      };
    }

    const lastTick = states.at(-1)!.tick;
    const expired = deadlineReached(
      lastTick,
      startTick,
      property.withinTicks,
    );

    return {
      propertyId: property.id,
      disposition:
        expired || trace.complete
          ? "violated"
          : "unknown",
      witnessTicks: [lastTick],
      reason:
        expired || trace.complete
          ? "The EVENTUALLY predicate was not reached."
          : "The trace ended before EVENTUALLY could be decided.",
    };
  }

  if (property.kind === "leads-to") {
    const unresolved: number[] = [];

    for (let index = 0; index < states.length; index += 1) {
      const triggerState = states[index]!;
      if (
        !evaluateBehaviorPredicate(
          triggerState,
          property.trigger,
        )
      ) {
        continue;
      }

      const consequence = states
        .slice(index)
        .find((candidate) =>
          evaluateBehaviorPredicate(
            candidate,
            property.consequence,
          )
        );

      if (consequence) {
        if (
          property.withinTicks !== undefined &&
          consequence.tick - triggerState.tick >
            property.withinTicks
        ) {
          return {
            propertyId: property.id,
            disposition: "violated",
            witnessTicks: [
              triggerState.tick,
              consequence.tick,
            ],
            reason:
              "A LEADS-TO consequence missed its deadline.",
          };
        }
        continue;
      }

      const lastTick = states.at(-1)!.tick;
      if (
        deadlineReached(
          lastTick,
          triggerState.tick,
          property.withinTicks,
        ) ||
        trace.complete
      ) {
        return {
          propertyId: property.id,
          disposition: "violated",
          witnessTicks: [
            triggerState.tick,
            lastTick,
          ],
          reason:
            "A LEADS-TO trigger has no matching consequence.",
        };
      }
      unresolved.push(triggerState.tick);
    }

    if (unresolved.length > 0) {
      return {
        propertyId: property.id,
        disposition: "unknown",
        witnessTicks: unresolved,
        reason:
          "One or more LEADS-TO obligations remain open in an incomplete trace.",
      };
    }

    return {
      propertyId: property.id,
      disposition: trace.complete
        ? "satisfied"
        : "unknown",
      witnessTicks: [],
      reason: trace.complete
        ? "Every LEADS-TO trigger was discharged."
        : "No unresolved LEADS-TO obligation is observed, but the trace is incomplete.",
    };
  }

  let startTick: number | undefined;
  for (const state of states) {
    if (
      evaluateBehaviorPredicate(
        state,
        property.until,
      )
    ) {
      return {
        propertyId: property.id,
        disposition: "satisfied",
        witnessTicks:
          startTick === undefined
            ? [state.tick]
            : [startTick, state.tick],
        reason:
          "The UNTIL terminal predicate was reached while the hold predicate remained valid.",
      };
    }

    startTick ??= state.tick;

    if (
      !evaluateBehaviorPredicate(
        state,
        property.hold,
      )
    ) {
      return {
        propertyId: property.id,
        disposition: "violated",
        witnessTicks: [state.tick],
        reason:
          "The UNTIL hold predicate failed before the terminal predicate.",
      };
    }

    if (
      deadlineReached(
        state.tick,
        startTick,
        property.withinTicks,
      )
    ) {
      return {
        propertyId: property.id,
        disposition: "violated",
        witnessTicks: [startTick, state.tick],
        reason:
          "The UNTIL terminal predicate missed its deadline.",
      };
    }
  }

  return {
    propertyId: property.id,
    disposition: trace.complete
      ? "violated"
      : "unknown",
    witnessTicks: [
      startTick!,
      states.at(-1)!.tick,
    ],
    reason: trace.complete
      ? "The UNTIL terminal predicate was never reached."
      : "The UNTIL obligation remains open in an incomplete trace.",
  };
}

export function evaluateTemporalProperties(
  trace: BehaviorTrace,
  properties: readonly TemporalProperty[],
): PropertyEvaluation[] {
  return properties.map((property) =>
    evaluateTemporalProperty(trace, property)
  );
}
