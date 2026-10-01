import { existsSync, readFileSync } from "node:fs";

const registry=JSON.parse(readFileSync(".agents/skill-registry.json","utf8"));
const routing=JSON.parse(readFileSync(".agents/evals/skill-routing.json","utf8"));
const procedure=JSON.parse(readFileSync(".agents/evals/skill-procedure.json","utf8"));
const errors=[];

const lanes=new Set(Object.keys(registry.workLanes ?? {}));
const allSkills=new Set([
  ...lanes,
  ...Object.keys(registry.domainSpecialists ?? {}),
  ...Object.keys(registry.routingOnly ?? {}),
]);

for(const c of routing.cases ?? []){
  if(!c.id || !c.prompt) errors.push("Routing eval requires id/prompt");
  if(c.expectedLane!==null && c.expectedLane!==undefined && !lanes.has(c.expectedLane)){
    errors.push(c.id+": expectedLane not in registry: "+c.expectedLane);
  }
  for(const f of c.forbidden ?? []){
    if(!allSkills.has(f)) errors.push(c.id+": forbidden skill not in registry: "+f);
    if(f===c.expectedLane) errors.push(c.id+": expectedLane cannot also be forbidden");
  }
}

for(const c of procedure.cases ?? []){
  if(!lanes.has(c.lane)) errors.push((c.id??"<missing>")+": procedure lane not in registry");
  if(!Array.isArray(c.assertions)||c.assertions.length===0) errors.push((c.id??"<missing>")+": procedure assertions required");
}

for(const lane of lanes){
  const skill=".agents/skills/"+lane+"/SKILL.md";
  if(!existsSync(skill)) errors.push("Missing lane skill: "+skill);
}

if(errors.length){
  console.error("Skill eval corpus violations:");
  for(const e of errors) console.error("- "+e);
  process.exit(1);
}

console.log(
  "Skill eval corpus passed ("+
  (routing.cases?.length??0)+" routing cases, "+
  (procedure.cases?.length??0)+" procedure cases)."
);
