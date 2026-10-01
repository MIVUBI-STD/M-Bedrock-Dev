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

if((routing.cases?.length??0)<20) errors.push("Routing eval corpus must contain at least 20 diverse cases.");

const languages=new Set();
for(const c of routing.cases ?? []){
  if(/[\u00C0-\u024F]|\b(tolong|cek|bug|jangan|buat|rapikan|kenapa|apakah)\b/i.test(c.prompt)) languages.add("id-mixed");
  if(/\b(audit|improve|run|apply|add|explain)\b/i.test(c.prompt)) languages.add("en");

  if(!c.id || !c.prompt) errors.push("Routing eval requires id/prompt");
  if(c.expectedLane!==null && c.expectedLane!==undefined && !lanes.has(c.expectedLane)){
    errors.push(c.id+": expectedLane not in registry: "+c.expectedLane);
  }
  if(c.expectedSkill!==undefined && !allSkills.has(c.expectedSkill)){
    errors.push(c.id+": expectedSkill not in registry: "+c.expectedSkill);
  }
  for(const f of c.forbidden ?? []){
    if(!allSkills.has(f)) errors.push(c.id+": forbidden skill not in registry: "+f);
    if(f===c.expectedLane) errors.push(c.id+": expectedLane cannot also be forbidden");
  }
}

if(languages.size<2) errors.push("Routing eval corpus should include Indonesian/mixed and English prompts.");

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
