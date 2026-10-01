import { existsSync, readFileSync } from "node:fs";

const failures=[];
const requiredLaneSkills={
  "m-bedrock-map-bug-audit": "OPERATIONAL / MAP USE",
  "m-bedrock-capability-development": "DEVELOPMENT / ENGINE IMPROVEMENT",
  "m-bedrock-capability-benchmark": "EVALUATION / REGRESSION",
  "m-bedrock-repair-engineering": "operational map/source repair"
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
  "Capability Development",
  "Capability Benchmark",
  "Domain specialists",
  "capability-gap"
]){
  if(!routing.includes(phrase)) failures.push("Skill routing is missing canonical concept: "+phrase);
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
