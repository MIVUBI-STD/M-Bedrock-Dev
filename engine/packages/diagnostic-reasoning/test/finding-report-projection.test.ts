import { describe, expect, it } from "vitest";
import { projectFindingClassification } from "../src/finding-report-projection.js";
const supported={disposition:"supported" as const,missingRequiredPredicates:[] as string[]};
describe("finding report projection",()=>{
 it("requires proven confidence for PROVEN BUG",()=>{
  expect(projectFindingClassification("confirmed-defect",{...supported,confidence:"high"}).classification).toBe("LIKELY BUG");
  expect(projectFindingClassification("confirmed-defect",{...supported,confidence:"proven"})).toMatchObject({classification:"PROVEN BUG",repairEligibleByClassification:true});
 });
 it("keeps design and expected behavior distinct",()=>{
  expect(projectFindingClassification("design-review",{...supported,confidence:"medium"}).classification).toBe("DESIGN MISMATCH");
  expect(projectFindingClassification("designed-behavior",{...supported,confidence:"high"}).classification).toBe("EXPECTED");
 });
 it("keeps runtime-proof-required unknown",()=>{
  expect(projectFindingClassification("runtime-proof-required",{disposition:"open",confidence:"low",missingRequiredPredicates:["runtime"]}).classification).toBe("UNKNOWN");
 });
});