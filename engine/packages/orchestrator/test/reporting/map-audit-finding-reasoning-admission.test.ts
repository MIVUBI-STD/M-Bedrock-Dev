import { describe, expect, it } from "vitest";
import { admitMapAuditFindingReasoning } from "../../src/reporting/map-audit-finding-reasoning-admission.js";
const finding:any={causalLinkId:"link:1",status:"NEED_VALIDATION",issueType:"BUG",evidenceIds:["e:1"]};
describe("map audit reasoning admission",()=>{
 it("admits only evidence-linked causal reasoning",()=>{
  const result=admitMapAuditFindingReasoning([finding],[{
   causalLinkId:"link:1",
   projection:{reportClassification:"LIKELY BUG",diagnosticDisposition:"confirmed-defect",proofConfidence:"high",reasons:[]},
   assessment:{hypothesisId:"h",disposition:"supported",supportingEvidenceIds:["e:1"],eliminatingEvidenceIds:[],missingRequiredPredicates:["runtime"],reasons:[],domains:["static"],corroborationCount:1,confidence:"high",nextPredicate:"runtime"},
  }]);
  expect(result.rejected).toEqual([]);
  expect(result.admitted["link:1"]?.reportClassification).toBe("LIKELY BUG");
 });
 it("rejects detached reasoning evidence",()=>{
  const result=admitMapAuditFindingReasoning([finding],[{
   causalLinkId:"link:1",
   projection:{reportClassification:"UNKNOWN",diagnosticDisposition:"insufficient-evidence",proofConfidence:"low",reasons:[]},
   assessment:{hypothesisId:"h",disposition:"open",supportingEvidenceIds:["other"],eliminatingEvidenceIds:[],missingRequiredPredicates:["runtime"],reasons:[],domains:["static"],corroborationCount:1,confidence:"low",nextPredicate:"runtime"},
  }]);
  expect(result.admitted).toEqual({});
  expect(result.rejected[0]?.reasons).toContain("Reasoning evidence does not intersect the owning audit finding.");
 });

 it("rejects PROVEN BUG reasoning for a NEED_VALIDATION finding",()=>{
  const result=admitMapAuditFindingReasoning([finding],[{
   causalLinkId:"link:1",
   projection:{reportClassification:"PROVEN BUG",diagnosticDisposition:"confirmed-defect",proofConfidence:"proven",reasons:[]},
   assessment:{hypothesisId:"h",disposition:"supported",supportingEvidenceIds:["e:1"],eliminatingEvidenceIds:[],missingRequiredPredicates:[],reasons:[],domains:["static"],corroborationCount:1,confidence:"high"},
  }]);
  expect(result.admitted).toEqual({});
  expect(result.rejected[0]?.reasons).toContain(
   "A NEED_VALIDATION audit finding cannot attach PROVEN BUG reasoning.",
  );
 });

 it("rejects proven confidence while the audit finding still needs validation",()=>{
  const result=admitMapAuditFindingReasoning([finding],[{
   causalLinkId:"link:1",
   projection:{reportClassification:"LIKELY BUG",diagnosticDisposition:"confirmed-defect",proofConfidence:"high",reasons:[]},
   assessment:{hypothesisId:"h",disposition:"supported",supportingEvidenceIds:["e:1"],eliminatingEvidenceIds:[],missingRequiredPredicates:[],reasons:[],domains:["static"],corroborationCount:1,confidence:"proven"},
  }]);
  expect(result.admitted).toEqual({});
  expect(result.rejected[0]?.reasons).toContain(
   "A NEED_VALIDATION audit finding cannot attach proven reasoning confidence.",
  );
 });
});