import { readFileSync } from "node:fs";
const path=process.argv[2];
if(!path) throw new Error("Usage: node validate-output.mjs <audit.json>");
const data=JSON.parse(readFileSync(path,"utf8"));
const dispositions=new Set(["defect","designed-behavior","ambiguous-intent","insufficient-evidence","runtime-proof-required","detection-gap"]);
const ceilings=new Set(["STATIC VERIFIED","PACKAGE VERIFIED","LOCAL GAME VERIFIED","LIVE GAME VERIFIED","UNKNOWN"]);
const errors=[];
if(data.schemaVersion!==1) errors.push("schemaVersion must be 1");
if(typeof data.artifactId!=="string"||!data.artifactId.trim()) errors.push("artifactId required");
if(!Array.isArray(data.candidates)) errors.push("candidates must be array");
for(const c of data.candidates??[]){
 if(!c.id) errors.push("candidate id required");
 if(!dispositions.has(c.disposition)) errors.push("invalid disposition: "+c.disposition);
 if(!ceilings.has(c.proofCeiling)) errors.push("invalid proof ceiling for "+c.id);
 if(c.disposition!=="defect" && c.severity!==undefined) errors.push("severity only allowed for defect: "+c.id);
 if(c.disposition==="defect" && !["Blocker","Major","Minor"].includes(c.severity)) errors.push("defect requires valid severity: "+c.id);
}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log("Map audit output contract passed.");
