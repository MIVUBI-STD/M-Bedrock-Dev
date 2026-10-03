import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const ROOT=process.cwd();

function contentFingerprint(text){
  let h=0x811c9dc5;
  for(let i=0;i<text.length;i++){
    h ^= text.charCodeAt(i);
    h = Math.imul(h,0x01000193)>>>0;
  }
  return h.toString(16).padStart(8,"0");
}

function registryFingerprint(paths){
  return contentFingerprint(paths.map((path)=>readFileSync(path,"utf8")).join("\n--registry--\n"));
}

function filesUnder(root){
  if(!existsSync(root)) return [];
  return readdirSync(root,{withFileTypes:true}).flatMap((entry)=>{
    const p=join(root,entry.name);
    return entry.isDirectory()?filesUnder(p):[p.replaceAll("\\","/")];
  });
}

function arrayStrings(node){
  if(!node || !ts.isArrayLiteralExpression(node)) return [];
  return node.elements.filter(ts.isStringLiteralLike).map((item)=>item.text);
}

function property(object,name){
  return object.properties.find((item)=>
    ts.isPropertyAssignment(item) &&
    ((ts.isIdentifier(item.name)&&item.name.text===name) ||
     (ts.isStringLiteralLike(item.name)&&item.name.text===name))
  );
}

function valueText(prop){
  if(!prop || !ts.isPropertyAssignment(prop)) return undefined;
  const v=prop.initializer;
  if(ts.isStringLiteralLike(v)) return v.text;
  if(v.kind===ts.SyntaxKind.TrueKeyword) return true;
  if(v.kind===ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

function extractCapabilities(path){
  const text=readFileSync(path,"utf8");
  const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const out=[];
  function visit(node){
    if(ts.isObjectLiteralExpression(node)){
      const id=valueText(property(node,"id"));
      if(typeof id==="string"){
        const owner=valueText(property(node,"owner"));
        const evidenceLevel=valueText(property(node,"evidenceLevel"));
        const cost=valueText(property(node,"cost"));
        const deterministic=valueText(property(node,"deterministic"));
        const pathProp=property(node,"pathPrefixes");
        const tagsProp=property(node,"tags");
        const contextsProp=property(node,"contexts");
        const contexts=contextsProp && ts.isPropertyAssignment(contextsProp)
          ? ts.isIdentifier(contextsProp.initializer) && contextsProp.initializer.text==="ALL_STATIC_CONTEXTS"
            ? ["REMOTE_GITHUB","LOCAL_ARTIFACT","LOCAL_MINECRAFT","LIVE_MINECRAFT"]
            : arrayStrings(contextsProp.initializer)
          : [];
        out.push({
          id,
          ...(typeof owner==="string"?{owner}:{}),
          ...(typeof evidenceLevel==="string"?{evidenceLevel}:{}),
          ...(typeof cost==="string"?{cost}:{}),
          ...(typeof deterministic==="boolean"?{deterministic}:{}),
          pathPrefixes:pathProp&&ts.isPropertyAssignment(pathProp)?arrayStrings(pathProp.initializer):[],
          tags:tagsProp&&ts.isPropertyAssignment(tagsProp)?arrayStrings(tagsProp.initializer):[],
          contexts
        });
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(file);
  return out;
}

function ownerStats(owner){
  const root="engine/"+owner;
  const files=filesUnder(root);
  const src=files.filter((p)=>p.startsWith(root+"/src/"));
  const tests=files.filter((p)=>p.startsWith(root+"/test/"));
  return {
    root,
    sourceFiles:src.length,
    testFiles:tests.length,
    hasReadme:existsSync(root+"/README.md"),
    proofPaths:tests.slice(0,5)
  };
}

const taskRegistry="engine/packages/task-graph/src/builtin-capabilities.ts";
const proofRegistryPath="engine/reliability/catalogs/capability-proof-bindings.json";
const proofRegistry=JSON.parse(readFileSync(proofRegistryPath,"utf8"));
const proofByCapability=new Map(
  (proofRegistry.bindings ?? []).map((item)=>[item.capabilityId,item])
);
const analysisRegistries=[
  "engine/packages/analysis-planner/src/domain-capabilities.ts",
  "engine/packages/analysis-planner/src/arena-capabilities.ts"
];
const task=extractCapabilities(taskRegistry).filter((x)=>x.owner);
const analysis=analysisRegistries.flatMap(extractCapabilities).filter((x)=>x.evidenceLevel);

const proofInventoryFingerprint=contentFingerprint(
  [...new Set(task.map((item)=>item.owner).filter(Boolean))]
    .flatMap((owner)=>filesUnder("engine/"+owner)
      .filter((path)=>
        path.includes("/src/") ||
        path.includes("/test/") ||
        path.endsWith("/README.md")
      ))
    .sort()
    .join("\n")
);

const taskCapabilities=task.map((item)=>{
  const stats=ownerStats(item.owner);
  const status=stats.sourceFiles===0
    ?"declared-only"
    :stats.testFiles>0
      ?"owner-has-tests"
      :"implementation-present";
  const runtimeOnly=item.contexts.length>0 &&
    item.contexts.every((x)=>x==="LOCAL_MINECRAFT"||x==="LIVE_MINECRAFT");
  const proofBinding=proofByCapability.get(item.id);
  return {
    id:item.id,
    owner:item.owner,
    status,
    deterministic:item.deterministic??false,
    cost:item.cost??"unknown",
    contexts:item.contexts,
    runtimeOnly,
    sourceFiles:stats.sourceFiles,
    testFiles:stats.testFiles,
    hasReadme:stats.hasReadme,
    proofPaths:stats.proofPaths,
    proofBinding: proofBinding
      ? {
          state:"bound",
          kind:proofBinding.kind,
          executionContext:proofBinding.executionContext,
          paths:[...(proofBinding.paths ?? [])].sort(),
          ...(proofBinding.note?{note:proofBinding.note}:{})
        }
      : {state:"unbound"},
    proofSemantics: proofBinding
      ? "Capability-specific proof binding exists. This means proof paths are registered, not that the capability executed or passed in the current session."
      : "Owner module may contain tests, but no capability-specific proof binding exists and no current-session execution is implied."
  };
}).sort((a,b)=>a.id.localeCompare(b.id));

const generatorPath="tooling/repository/generate-capability-truth.mjs";
const output={
  schemaVersion:1,
  generatedFrom:{
    generatorPath,
    generatorFingerprint: contentFingerprint(readFileSync(generatorPath,"utf8")),
    taskRegistry,
    analysisRegistries,
    registryFingerprint: registryFingerprint([taskRegistry,...analysisRegistries]),
    proofRegistry: proofRegistryPath,
    proofRegistryFingerprint: contentFingerprint(readFileSync(proofRegistryPath,"utf8")),
    proofInventoryFingerprint
  },
  summary:{
    taskCapabilities:taskCapabilities.length,
    ownerHasTests:taskCapabilities.filter((x)=>x.status==="owner-has-tests").length,
    implementationPresent:taskCapabilities.filter((x)=>x.status==="implementation-present").length,
    declaredOnly:taskCapabilities.filter((x)=>x.status==="declared-only").length,
    runtimeOnly:taskCapabilities.filter((x)=>x.runtimeOnly).length,
    proofBound:taskCapabilities.filter((x)=>x.proofBinding.state==="bound").length,
    proofUnbound:taskCapabilities.filter((x)=>x.proofBinding.state==="unbound").length,
    analysisCapabilities:analysis.length
  },
  taskCapabilities,
  analysisCapabilities:analysis.map((x)=>({
    id:x.id,
    evidenceLevel:x.evidenceLevel,
    cost:x.cost??"unknown",
    deterministic:x.deterministic??false,
    contexts:x.contexts,
    tags:x.tags
  })).sort((a,b)=>a.id.localeCompare(b.id))
};

const outPath=process.argv[2]??"engine/reliability/catalogs/capability-truth/current.json";
writeFileSync(outPath,JSON.stringify(output,null,2)+"\n");
console.log("Capability Truth Index written: "+outPath);
