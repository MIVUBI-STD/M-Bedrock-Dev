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
