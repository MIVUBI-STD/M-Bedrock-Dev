import { existsSync, readFileSync, readdirSync } from "node:fs";

const failures=[];
const dosPath = "docs/system/development-discipline.md";
const dosText = readFileSync(dosPath, "utf8");
for (const phrase of ["## Development Operating Standard", "**Development preflight:**", "**Development completion review:**"]) {
  if (!dosText.includes(phrase)) failures.push("Missing mandatory development standard clause: " + phrase);
}
for (const path of ["AGENTS.md", ".agents/skills/m-bedrock-product-development/SKILL.md", ".agents/skills/m-bedrock-detection-development/SKILL.md"]) {
  const source = readFileSync(path, "utf8");
  if (!source.includes("development-operating-standard")) {
    failures.push(path + ": must route to canonical Development Operating Standard before development work");
  }
}

const requiredLaneSkills={
  "m-bedrock-map-bug-audit": "OPERATIONAL / MAP USE",
  "m-bedrock-detection-development": "DEVELOPMENT / BUG-DETECTION IMPROVEMENT",
  "m-bedrock-detection-benchmark": "EVALUATION / DETECTION REGRESSION",
  "m-bedrock-target-repair": "OPERATIONAL / TARGET REPAIR"
};

for(const [name, marker] of Object.entries(requiredLaneSkills)){
  const path=".agents/skills/"+name+"/SKILL.md";
  if(!existsSync(path)){
    failures.push("Missing required work-lane skill: "+path);
    continue;
  }
  const text=readFileSync(path,"utf8");
  if(!text.toLowerCase().includes(marker.toLowerCase())){
    failures.push(path+": missing explicit lane marker "+marker);
  }
  if(!/STOP/i.test(text)){
    failures.push(path+": lane requires an explicit STOP boundary");
  }
}

if(existsSync(".agents/skills/m-bedrock-development-brief/SKILL.md")){
  failures.push("Legacy ambiguous skill m-bedrock-development-brief is forbidden; use m-bedrock-cross-owner-routing.");
}

const routing=readFileSync("docs/system/skill-routing.md","utf8");
for(const phrase of [
  "Operational Map Audit",
  "Detection Development",
  "Detection Benchmark",
  "Domain specialists",
  "detection-gap"
]){
  if(!routing.includes(phrase)) failures.push("Skill routing is missing canonical concept: "+phrase);
}

for (const name of [
  "m-bedrock-map-bug-audit",
  "m-bedrock-detection-development",
  "m-bedrock-detection-benchmark",
  "m-bedrock-target-repair"
]) {
  const path=".agents/skills/"+name+"/SKILL.md";
  const lane=readFileSync(path,"utf8");
  for (const heading of [
    "## Purpose",
    "## Entry criteria",
    "## Allowed actions",
    "## Forbidden actions",
    "## Output contract",
    "## Handoff",
    "## STOP"
  ]) {
    if(!lane.includes(heading)) failures.push(path+": missing required lane section "+heading);
  }
}

for(const legacy of [
  "m-bedrock-capability-development",
  "m-bedrock-capability-benchmark",
  "m-bedrock-repair-engineering"
]) {
  if(existsSync(".agents/skills/"+legacy+"/SKILL.md")){
    failures.push("Legacy work-lane skill is forbidden: "+legacy);
  }
}

const contentAnalysis=readFileSync(".agents/skills/m-bedrock-content-analysis/SKILL.md","utf8");
if(!contentAnalysis.includes("DOMAIN SPECIALIST")){
  failures.push("Content Analysis must remain a domain specialist, not a work lane.");
}
if(!contentAnalysis.includes("detection-gap")){
  failures.push("Content Analysis must hand unsupported operational evidence back as detection-gap.");
}

function parseFrontmatter(text){
  if(!text.startsWith("---\n")) return undefined;
  const end=text.indexOf("\n---\n",4);
  if(end<0) return undefined;
  const block=text.slice(4,end);
  const name=block.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const descLines=[];
  const lines=block.split(/\r?\n/);
  let inDescription=false;
  for(const line of lines){
    if(/^description:\s*>?\s*$/.test(line)){ inDescription=true; continue; }
    if(inDescription){
      if(/^\S/.test(line)) break;
      descLines.push(line.trim());
    }
  }
  return {name,description:descLines.join(" ").trim()};
}

const registryPath=".agents/skill-registry.json";
if(!existsSync(registryPath)){
  failures.push("Missing machine-readable skill registry: "+registryPath);
}else{
  const registry=JSON.parse(readFileSync(registryPath,"utf8"));
  if(registry.schemaVersion!==2) failures.push("Skill registry schemaVersion must be 2.");

  const classified=new Map();
  for(const [kind,group] of [
    ["work-lane",registry.workLanes ?? {}],
    ["domain-specialist",registry.domainSpecialists ?? {}],
    ["routing-only",registry.routingOnly ?? {}]
  ]){
    for(const name of Object.keys(group)){
      const previous=classified.get(name);
      if(previous) failures.push("Skill appears in multiple registry classes: "+name+" ("+previous+", "+kind+")");
      classified.set(name,kind);
    }
  }

  const physical=readdirSync(".agents/skills",{withFileTypes:true})
    .filter((entry)=>entry.isDirectory() && existsSync(".agents/skills/"+entry.name+"/SKILL.md"))
    .map((entry)=>entry.name)
    .sort();

  for(const name of physical){
    const path=".agents/skills/"+name+"/SKILL.md";
    const fm=parseFrontmatter(readFileSync(path,"utf8"));
    if(!fm) failures.push(path+": missing YAML frontmatter");
    else{
      if(fm.name!==name) failures.push(path+": frontmatter name must equal folder name");
      if(!fm.description || fm.description.length<40) failures.push(path+": description is too weak for reliable routing");
      if(fm.description && fm.description.length>320) failures.push(path+": description is too long; keep discovery metadata concise");
    }
  }
  const registered=[...classified.keys()].sort();

  for(const name of physical){
    if(!classified.has(name)) failures.push("Unclassified skill folder: "+name);
  }
  for(const name of registered){
    if(!physical.includes(name)) failures.push("Skill registry references missing folder: "+name);
  }

  if(!Number.isInteger(registry.registryRevision) || registry.registryRevision<1){
    failures.push("Skill registry requires positive registryRevision.");
  }

  for(const [name,lane] of Object.entries(registry.workLanes ?? {})){
    if(typeof lane.selection!=="string" || !lane.selection.trim()) failures.push("Work lane lacks selection rule: "+name);
    if(!Array.isArray(lane.outputs) || lane.outputs.length===0) failures.push("Work lane lacks output contract index: "+name);
    if(typeof lane.mutatesEngine!=="boolean" || typeof lane.mutatesTarget!=="boolean") failures.push("Work lane lacks mutation boundary: "+name);
    if(!Number.isInteger(lane.revision) || lane.revision<1) failures.push("Work lane lacks positive revision: "+name);
    // General Product Development reuses existing repository proof owners; it does not persist a lane-specific result.
    if(name!=="m-bedrock-product-development"){
      if(typeof lane.outputSchema!=="string" || !existsSync(lane.outputSchema)) failures.push("Work lane outputSchema missing/not found: "+name);
      if(typeof lane.deterministicEntrypoint!=="string" || !existsSync(lane.deterministicEntrypoint)) failures.push("Work lane deterministicEntrypoint missing/not found: "+name);
      if(!Array.isArray(lane.evidenceTiers) || lane.evidenceTiers.length===0) failures.push("Work lane lacks evidence tiers: "+name);
    }
    for(const field of ["spec","sources","eval"]){
      if(typeof lane[field]!=="string" || !existsSync(lane[field])) failures.push("Work lane "+field+" missing/not found: "+name);
    }
  }

  for(const field of ["permissionProfiles","pathAccess","permissionEvaluator","permissionEvalCorpus","securityPolicy","securityScanner","evalManifest"]){
    if(typeof registry[field]!=="string" || !existsSync(registry[field])) failures.push("Skill registry "+field+" missing/not found.");
  }

  const evalManifest =
    typeof registry.evalManifest === "string" &&
    existsSync(registry.evalManifest)
      ? JSON.parse(readFileSync(registry.evalManifest,"utf8"))
      : undefined;
  for(const field of ["agentRunSchema","agentEvalScorer"]){
    if(typeof evalManifest?.[field]!=="string" || !existsSync(evalManifest[field])){
      failures.push("Skill eval manifest "+field+" missing/not found.");
    }
  }

  const benchmark=registry.workLanes?.["m-bedrock-detection-benchmark"];
  if(!Array.isArray(benchmark?.benchmarkTools) || benchmark.benchmarkTools.length<3){
    failures.push("Detection Benchmark requires score, blind-compare, and aggregate-run tools.");
  }else{
    for(const path of benchmark.benchmarkTools){
      if(!existsSync(path)) failures.push("Detection Benchmark tool missing: "+path);
    }
  }

  const audit=registry.workLanes?.["m-bedrock-map-bug-audit"];
  if(typeof audit?.runtimeInstrumentation!=="string" || !existsSync(audit.runtimeInstrumentation)){
    failures.push("Map Bug Audit requires runtime instrumentation lifecycle reference.");
  }
}


if(failures.length){
  console.error("Skill-lane verification violations:");
  for(const failure of failures) console.error("- "+failure);
  process.exit(1);
}
console.log("Skill-lane verification passed.");