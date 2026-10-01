import { existsSync, readFileSync, readdirSync } from "node:fs";

const failures=[];
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

const routing=readFileSync("docs/06-system/skill-routing.md","utf8");
for(const phrase of [
  "Operational Map Audit",
  "Detection Development",
  "Detection Benchmark",
  "Domain specialists",
  "capability-gap"
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
if(!contentAnalysis.includes("capability-gap")){
  failures.push("Content Analysis must hand unsupported operational evidence back as capability-gap.");
}

if(failures.length){
  console.error("Skill-lane verification violations:");
  for(const failure of failures) console.error("- "+failure);
  process.exit(1);
}
console.log("Skill-lane verification passed.");


const registryPath=".agents/skill-registry.json";
if(!existsSync(registryPath)){
  failures.push("Missing machine-readable skill registry: "+registryPath);
}else{
  const registry=JSON.parse(readFileSync(registryPath,"utf8"));
  if(registry.schemaVersion!==1) failures.push("Skill registry schemaVersion must be 1.");

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
  const registered=[...classified.keys()].sort();

  for(const name of physical){
    if(!classified.has(name)) failures.push("Unclassified skill folder: "+name);
  }
  for(const name of registered){
    if(!physical.includes(name)) failures.push("Skill registry references missing folder: "+name);
  }

  for(const [name,lane] of Object.entries(registry.workLanes ?? {})){
    if(typeof lane.selection!=="string" || !lane.selection.trim()) failures.push("Work lane lacks selection rule: "+name);
    if(!Array.isArray(lane.outputs) || lane.outputs.length===0) failures.push("Work lane lacks output contract index: "+name);
    if(typeof lane.mutatesEngine!=="boolean" || typeof lane.mutatesTarget!=="boolean") failures.push("Work lane lacks mutation boundary: "+name);
  }
}
