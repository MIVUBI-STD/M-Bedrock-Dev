import {
  describe,
  expect,
  it,
} from "vitest";
import {
  createInMemoryDiagnosisResultCache,
  diagnosisExecutionCacheKey,
} from "../src/index.js";

describe("diagnosis result cache", () => {
  it("fingerprints structurally equivalent payloads identically", () => {
    const first =
      diagnosisExecutionCacheKey({
        capabilityId:
          "diagnosis.source-index",
        executorId:
          "diagnosis.source-index",
        capabilityRevision: "1",
        context: "LOCAL_ARTIFACT",
        payload: {
          z: 2,
          a: {
            second: true,
            first: "x",
          },
        },
      });

    const second =
      diagnosisExecutionCacheKey({
        capabilityId:
          "diagnosis.source-index",
        executorId:
          "diagnosis.source-index",
        capabilityRevision: "1",
        context: "LOCAL_ARTIFACT",
        payload: {
          a: {
            first: "x",
            second: true,
          },
          z: 2,
        },
      });

    expect(first).toBe(second);
  });

  it("rejects ambiguous non-finite numeric cache inputs", () => {
    expect(() =>
      diagnosisExecutionCacheKey({
        capabilityId:
          "diagnosis.source-index",
        executorId:
          "diagnosis.source-index",
        capabilityRevision: "1",
        context: "LOCAL_ARTIFACT",
        payload: {
          value: Number.NaN,
        },
      })
    ).toThrow(/non-finite/);

    expect(() =>
      diagnosisExecutionCacheKey({
        capabilityId:
          "diagnosis.source-index",
        executorId:
          "diagnosis.source-index",
        capabilityRevision: "1",
        context: "LOCAL_ARTIFACT",
        payload: {
          value:
            Number.POSITIVE_INFINITY,
        },
      })
    ).toThrow(/non-finite/);
  });

  it("distinguishes negative zero from zero", () => {
    const zero =
      diagnosisExecutionCacheKey({
        capabilityId:
          "diagnosis.source-index",
        executorId:
          "diagnosis.source-index",
        capabilityRevision: "1",
        context: "LOCAL_ARTIFACT",
        payload: { value: 0 },
      });
    const negativeZero =
      diagnosisExecutionCacheKey({
        capabilityId:
          "diagnosis.source-index",
        executorId:
          "diagnosis.source-index",
        capabilityRevision: "1",
        context: "LOCAL_ARTIFACT",
        payload: { value: -0 },
      });

    expect(negativeZero)
      .not.toBe(zero);
  });

  it("changes the key when capability revision or payload changes", () => {
    const base = {
      capabilityId:
        "diagnosis.source-index",
      executorId:
        "diagnosis.source-index",
      context:
        "LOCAL_ARTIFACT" as const,
    };

    const first =
      diagnosisExecutionCacheKey({
        ...base,
        capabilityRevision: "1",
        payload: { artifact: "a" },
      });
    const changedPayload =
      diagnosisExecutionCacheKey({
        ...base,
        capabilityRevision: "1",
        payload: { artifact: "b" },
      });
    const changedRevision =
      diagnosisExecutionCacheKey({
        ...base,
        capabilityRevision: "2",
        payload: { artifact: "a" },
      });

    expect(changedPayload)
      .not.toBe(first);
    expect(changedRevision)
      .not.toBe(first);
  });

  it("preserves executor output identity so class prototypes are not destroyed", async () => {
    const cache =
      createInMemoryDiagnosisResultCache();
    class Output {
      value() {
        return "ok";
      }
    }
    const output = new Output();

    await cache.put({
      schemaVersion: 1,
      cacheKey: "k",
      capabilityId:
        "diagnosis.source-index",
      executorId:
        "diagnosis.source-index",
      capabilityRevision: "1",
      context: "LOCAL_ARTIFACT",
      evidence: [{
        level: "static",
        quality: "usable",
        traits: ["structural-proof"],
        evidenceIds: ["e1"],
      }],
      output,
      reasons: [],
    });

    const cached =
      await cache.get("k");

    expect(cached?.output)
      .toBe(output);
    expect(
      (cached?.output as Output)
        .value(),
    ).toBe("ok");
  });
});
