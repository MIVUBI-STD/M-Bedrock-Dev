import { existsSync, readFileSync } from "node:fs";

const path="engine/reliability/catalogs/capability-truth/current.json";
if(!existsSync(path)){
  console.error("Missing Capability Truth Index: "+path);
  process.exit(1);
}
const data=JSON.parse(readFileSync(path,"utf8"));
const errors=[];
if(data.schemaVersion!==1) errors.push("schemaVersion must be 1");
if(!Array.isArray(data.taskCapabilities)||data.taskCapabilities.length===0) errors.push("taskCapabilities must be non-empty");
if(!Array.isArray(data.analysisCapabilities)||data.analysisCapabilities.length===0) errors.push("analysisCapabilities must be non-empty");
const ids=new Set();
for(const item of data.taskCapabilities??[]){
  if(ids.has(item.id)) errors.push("duplicate task capability id: "+item.id);
  ids.add(item.id);
  if(!["declared-only","implemented-unverified","source-verified"].includes(item.status)) errors.push("invalid capability status: "+item.id);
  if(typeof item.owner!=="string"||!item.owner.trim()) errors.push("missing owner: "+item.id);
}
if(errors.length){
  console.error("Capability Truth Index violations:");
  for(const error of errors) console.error("- "+error);
  process.exit(1);
}
console.log("Capability Truth Index verification passed.");
