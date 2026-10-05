import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function filesUnder(root){
  if(!existsSync(root)) return [];
  return readdirSync(root,{withFileTypes:true}).flatMap((entry)=>{
    const path=join(root,entry.name);
    return entry.isDirectory()?filesUnder(path):[path.replaceAll("\\","/")];
  });
}

function contentFingerprint(text){
  let h=0x811c9dc5;
  for(let i=0;i<text.length;i++){
    h ^= text.charCodeAt(i);
    h = Math.imul(h,0x01000193)>>>0;
  }
  return h.toString(16).padStart(8,"0");
}

const path="engine/reliability/catalogs/capability-truth/current.json";
if(!existsSync(path)){
  console.error("Missing Capability Truth Index: "+path);
  process.exit(1);
}
const data=JSON.parse(readFileSync(path,"utf8"));
const errors=[];
const generatorPath=data.generatedFrom?.generatorPath;
if(typeof generatorPath!=="string" || !existsSync(generatorPath)){
  errors.push("generatedFrom generatorPath is missing or invalid");
}else{
  const generatorFingerprint=
    contentFingerprint(readFileSync(generatorPath,"utf8"));
  if(
    generatorFingerprint !==
      data.generatedFrom?.generatorFingerprint
  ){
    errors.push(
      "Capability Truth Index is stale; regenerate after generator contract changes.",
    );
  }
}
const proofRegistryPath=data.generatedFrom?.proofRegistry;
if(typeof proofRegistryPath!=="string" || !existsSync(proofRegistryPath)){
  errors.push("generatedFrom proofRegistry path is missing or invalid");
}else{
  const proofText=readFileSync(proofRegistryPath,"utf8");
  const proofFingerprint=contentFingerprint(proofText);
  if(proofFingerprint!==data.generatedFrom?.proofRegistryFingerprint){
    errors.push("Capability Truth Index is stale; regenerate after proof binding registry changes.");
  }
  const proofRegistry=JSON.parse(proofText);
  const seenProofCapabilities=new Set();
  const taskIds=new Set((data.taskCapabilities??[]).map((item)=>item.id));
  for(const binding of proofRegistry.bindings ?? []){
    if(seenProofCapabilities.has(binding.capabilityId)) errors.push("duplicate capability proof binding: "+binding.capabilityId);
    seenProofCapabilities.add(binding.capabilityId);
    if(!taskIds.has(binding.capabilityId)) errors.push("proof binding references unknown capability: "+binding.capabilityId);
    if(!Array.isArray(binding.paths)||binding.paths.length===0) errors.push("proof binding requires paths: "+binding.capabilityId);
    for(const path of binding.paths ?? []){
      if(!existsSync(path)) errors.push("proof binding path missing: "+binding.capabilityId+" -> "+path);
    }
  }
}

const registryPaths=[
  data.generatedFrom?.taskRegistry,
  ...(data.generatedFrom?.analysisRegistries ?? [])
].filter((value)=>typeof value==="string");
if(registryPaths.length<2 || registryPaths.some((p)=>!existsSync(p))){
  errors.push("generatedFrom registry paths are missing or invalid");
}else{
  const currentFingerprint=contentFingerprint(
    registryPaths.map((p)=>readFileSync(p,"utf8")).join("\n--registry--\n")
  );
  if(currentFingerprint!==data.generatedFrom?.registryFingerprint){
    errors.push("Capability Truth Index is stale; regenerate after registry changes.");
  }

  const owners=[...new Set((data.taskCapabilities??[]).map((item)=>item.owner).filter(Boolean))];
  const proofPaths=owners
    .flatMap((owner)=>filesUnder("engine/"+owner)
      .filter((path)=>
        path.includes("/src/") ||
        path.includes("/test/") ||
        path.endsWith("/README.md")
      ))
    .sort();
  const proofInventoryFingerprint=contentFingerprint(proofPaths.join("\n"));
  if(proofInventoryFingerprint!==data.generatedFrom?.proofInventoryFingerprint){
    errors.push("Capability Truth Index is stale; regenerate after owner source/test inventory changes.");
  }
}
const backlogPath="engine/reliability/catalogs/capability-truth/proof-binding-backlog.md";
if(!existsSync(backlogPath)){
  errors.push("Capability proof-binding backlog is missing.");
}else{
  const backlog=readFileSync(backlogPath,"utf8");
  const unbound=(data.taskCapabilities??[])
    .filter((item)=>item.proofBinding?.state!=="bound")
    .map((item)=>item.id)
    .sort();
  const headings=[...backlog.matchAll(/^##\s+(.+)$/gm)]
    .map((match)=>match[1].trim())
    .sort();
  if(unbound.length===0){
    if(!/No unbound capabilities\./.test(backlog) || headings.length>0){
      errors.push("Capability proof-binding backlog is stale; current Capability Truth has no unbound capabilities.");
    }
  }else{
    if(
      headings.length!==unbound.length ||
      headings.some((id,index)=>id!==unbound[index])
    ){
      errors.push("Capability proof-binding backlog is stale; regenerate from current Capability Truth.");
    }
  }
}

if(data.schemaVersion!==1) errors.push("schemaVersion must be 1");
if(!Array.isArray(data.taskCapabilities)||data.taskCapabilities.length===0) errors.push("taskCapabilities must be non-empty");
if(!Array.isArray(data.analysisCapabilities)||data.analysisCapabilities.length===0) errors.push("analysisCapabilities must be non-empty");
const ids=new Set();
for(const item of data.taskCapabilities??[]){
  if(ids.has(item.id)) errors.push("duplicate task capability id: "+item.id);
  ids.add(item.id);
  if(!["declared-only","implementation-present","owner-has-tests"].includes(item.status)) errors.push("invalid capability status: "+item.id);
  if(typeof item.owner!=="string"||!item.owner.trim()) errors.push("missing owner: "+item.id);
  if(!item.proofBinding || !["bound","unbound"].includes(item.proofBinding.state)) errors.push("invalid proofBinding state: "+item.id);
  if(item.proofBinding?.state!=="bound") errors.push("production task capability lacks capability-specific proof binding: "+item.id);
  if(item.proofBinding?.state==="bound"){
    if(!Array.isArray(item.proofBinding.paths)||item.proofBinding.paths.length===0) errors.push("bound capability requires proof paths: "+item.id);
  }
}
if(errors.length){
  console.error("Capability Truth Index violations:");
  for(const error of errors) console.error("- "+error);
  process.exit(1);
}
console.log("Capability Truth Index verification passed.");
