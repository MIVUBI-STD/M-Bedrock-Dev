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

const knowledgeArchitectureAliasPatterns = [
  /(?:^|\/)(?:rag|knowledge|memory|context|docs|graph)-manager(?:[./_-]|$)/i,
  /(?:^|\/)semantic-search-manager(?:[./_-]|$)/i,
  /(?:^|\/)resource-directory(?:[./_-]|$)/i,
  /(?:^|\/)context-pack-manager(?:[./_-]|$)/i,
];

for(const path of tracked){
  if(knowledgeArchitectureAliasPatterns.some((pattern)=>pattern.test(path))){
    failures.push(
      "Knowledge architecture alias path is forbidden; use Catalog, Graph, Retrieval, or Context ownership: " +
        path,
    );
  }
}

const canonicalDocs=[
  "README.md",
  "CONTEXT.md",
  "engine/README.md",
  "engine/AGENTS.md",
  "docs/system/authority-model.md",
  "docs/system/implementation-map.md",
  "docs/system/canonical-naming.md"
];


const publicNamingFiles=[
  "docs/analysis/master-selected-map-audit-workflow.md",
  "docs/analysis/mandatory-audit-procedure.md",
  "workspace/README.md",
  "engine/packages/bug-report/PREVIEW.md",
  "engine/packages/bug-report/COPY.md"
];

const forbiddenPublicAliases=[
  {pattern:/\bpossible[_-]bug\b/i,canonical:"Audit Obligation / NEED_VALIDATION / PROVEN"},
  {pattern:/\bbug[_-]candidate\b/i,canonical:"Audit Obligation or internal candidate only"},
  {pattern:/\bunproven[_-]issue\b/i,canonical:"NEED_VALIDATION"},
  {pattern:/\bruntime[_-]checklist\b/i,canonical:"Runtime Verification / validationTest"},
  {pattern:/\banti[_-]proof\b/i,canonical:"Blocking Proof / Counter-Proof Search"},
  {pattern:/\bphysical[_-]loading[_-]bounds?\b/i,canonical:"Physical Collision Bounds or Loading Bounds"},
  {pattern:/\bsession[_-]physical[_-]bounds?\b/i,canonical:"Session Ownership Bounds or Physical Collision Bounds"}
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

const canonicalNaming = readFileSync(
  "docs/system/canonical-naming.md",
  "utf8",
);
for(const required of [
  "Catalog and Registry are deliberately different",
  "Router",
  "Retrieval",
  "Context",
  "DOMAIN",
  "CANONICAL",
  "REFERENCE",
  "HISTORICAL",
  "DERIVED",
]){
  if(!canonicalNaming.includes(required)){
    failures.push(
      "Canonical naming is missing knowledge architecture term/boundary: " +
        required,
    );
  }
}

if(failures.length){
  console.error("Canonical naming violations:");
  for(const failure of failures) console.error("- "+failure);
  process.exit(1);
}
console.log("Canonical naming verification passed.");