import { readFileSync } from "node:fs";
const path=process.argv[2];
if(!path) throw new Error("Usage: node score-benchmark.mjs <result.json>");
const d=JSON.parse(readFileSync(path,"utf8"));
const m=d.metrics??{};
for(const k of ["tp","fp","fn","unknown"]){
 if(!Number.isInteger(m[k])||m[k]<0) throw new Error("metrics."+k+" must be non-negative integer");
}
const precision=(m.tp+m.fp)===0?null:m.tp/(m.tp+m.fp);
const recall=(m.tp+m.fn)===0?null:m.tp/(m.tp+m.fn);
const out={...d,metrics:{...m,precision,recall}};
process.stdout.write(JSON.stringify(out,null,2)+"\n");
