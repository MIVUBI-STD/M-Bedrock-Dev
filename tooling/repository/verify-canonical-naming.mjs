import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const failures=[];
const tracked=execFileSync("git",["ls-files"],{encoding:"utf8"})
  .split(/\r?\n/)
  .filter(Boolean);

const forbiddenPathPatterns=[
  /engine\/game-design\//,
  /engine\/packages\/game-design\//,
  /engine\/contracts\/engineering\/catalogs\/.*-policy\.json$/,
  /engine\/packages\/orchestrator\/(?:src|test)\/.*-policy/i,
  /engine\/packages\/behavior-model\/(?:src|test)\/.*-policy/i,
  /engine\/knowledge\/(?:world-runtime|player-experience|entity-systems|arena-gameplay)\//
];

for(const path of tracked){
  if(forbiddenPathPatterns.some((pattern)=>pattern.test(path))){
    failures.push("Legacy/ambiguous canonical path: "+path);
  }
}

const canonicalDocs=[
  "README.md",
  "CONTEXT.md",
  "engine/README.md",
  "engine/AGENTS.md",
  "docs/06-system/authority-model.md",
  "docs/06-system/implementation-map.md",
  "docs/06-system/canonical-naming.md"
];


const publicNamingFiles=[
  "docs/03-analysis/map-audit-naming-contract.md",
  "docs/03-analysis/master-selected-map-audit-workflow.md",
  "docs/03-analysis/mandatory-audit-procedure.md",
  "workspace/reports/README.md",
  "engine/packages/bug-report/PREVIEW.md",
  "engine/packages/bug-report/COPY.md"
];

const forbiddenPublicAliases=[
  {pattern:/\bpossible[_ -]?bug\b/i,canonical:"Audit Obligation / NEED_VALIDATION / PROVEN"},
  {pattern:/\bbug[_ -]?candidate\b/i,canonical:"Audit Obligation or internal candidate only"},
  {pattern:/\bunproven[_ -]?issue\b/i,canonical:"NEED_VALIDATION"},
  {pattern:/\bruntime[_ -]?checklist\b/i,canonical:"Runtime Verification / validationTest"},
  {pattern:/\banti[_ -]?proof\b/i,canonical:"Blocking Proof / Counter-Proof Search"},
  {pattern:/\bphysical[_ -]?loading[_ -]?bounds?\b/i,canonical:"Physical Collision Bounds or Loading Bounds"},
  {pattern:/\bsession[_ -]?physical[_ -]?bounds?\b/i,canonical:"Session Ownership Bounds or Physical Collision Bounds"}
];

for(const path of publicNamingFiles){
  const text=readFileSync(path,"utf8");
  for(const alias of forbiddenPublicAliases){
    if(alias.pattern.test(text)){
      failures.push(path+": ambiguous public naming; use "+alias.canonical);
    }
  }
}

for(const path of canonicalDocs){
  const text=readFileSync(path,"utf8");
  if(/machine-readable Bedrock\/Education facts and policy/.test(text)){
    failures.push(path+": legacy mixed knowledge/policy wording");
  }
  if(/compatibility\/version policy/.test(text)){
    failures.push(path+": use compatibility/version rules instead of policy");
  }
}

if(failures.length){
  console.error("Canonical naming violations:");
  for(const failure of failures) console.error("- "+failure);
  process.exit(1);
}
console.log("Canonical naming verification passed.");
