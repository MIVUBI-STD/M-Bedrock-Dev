import { describe, expect, it } from "vitest";
import {
  buildDecisionBasis,
} from "../src/decision-basis.js";

describe("decision basis", () => {
  it("fingerprints probe bindings independently of input ordering", () => {
    const a = {
      probeId: "a",
      predicate: "a",
      query: {
        kind: "entity-resolvable" as const,
        entityId: "e1",
      },
      outcomeByState: {
        present: "yes",
        absent: "no",
      },
    };
    const b = {
      probeId: "b",
      predicate: "b",
      query: {
        kind: "tag-present" as const,
        subjectKind: "entity" as const,
        subjectId: "e1",
        tag: "ready",
      },
      outcomeByState: {
        present: "yes",
        absent: "no",
      },
    };

    expect(buildDecisionBasis({
      probeBindings: [a, b],
    }).probeBindingRevision).toBe(
      buildDecisionBasis({
        probeBindings: [b, a],
      }).probeBindingRevision,
    );
  });

  it("changes target profile fingerprint when decision context changes", () => {
    const left = buildDecisionBasis({
      target: {
        edition: "bedrock",
        version: "1.26.40",
      },
    });
    const right = buildDecisionBasis({
      target: {
        edition: "education",
        version: "1.26.40",
      },
    });

    expect(left.targetProfileFingerprint)
      .not.toBe(right.targetProfileFingerprint);
  });
});
