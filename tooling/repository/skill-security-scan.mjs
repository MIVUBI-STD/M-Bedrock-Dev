import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { join, relative } from "node:path";

const root=".agents/skills";
const findings=[];

function walk(dir){
  return readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{
    const path=join(dir,entry.name);
    if(entry.isDirectory()) return walk(path);
    return [path];
  });
}

for(const path of walk(root)){
  const rel=relative(".",path).replaceAll("\\","/");
  const stat=lstatSync(path);
  if(stat.isSymbolicLink()){
    findings.push({severity:"high",path:rel,rule:"symlink",message:"Skill package contains symlink."});
    continue;
  }

  if(!/\.(md|json|mjs|js|ts|yaml|yml|txt)$/i.test(path)) continue;
  const text=readFileSync(path,"utf8");

  const rules=[
    ["critical","encoded-payload",/(?:atob\s*\(|Buffer\.from\([^\n]+base64|base64\s+-d)/i],
    ["high","process-exec",/(?:child_process|execSync\s*\(|spawnSync\s*\(|\bexec\s*\()/],
    ["high","package-install",/(?:npm\s+(?:install|i)\b|pnpm\s+(?:install|add)\b|yarn\s+add\b|pip\s+install\b)/i],
    ["high","secret-access",/(?:process\.env\.[A-Z0-9_]*(?:TOKEN|SECRET|KEY|PASSWORD)|\.ssh\/|credentials)/i],
    ["medium","network-fetch",/(?:fetch\s*\(|curl\s+https?:\/\/|wget\s+https?:\/\/)/i],
    ["medium","shell-destructive",/(?:rm\s+-rf|del\s+\/s|Remove-Item\s+.*-Recurse)/i],
    ["medium","instruction-override",/(?:ignore (?:all|previous) instructions|system prompt|developer message)/i]
  ];

  for(const [severity,rule,pattern] of rules){
    if(pattern.test(text)){
      const allowed=
        rel.endsWith("skill-security-scan.mjs") ||
        (rule==="process-exec" && rel.includes("/scripts/") && /deterministic/i.test(text));
      if(!allowed) findings.push({severity,path:rel,rule,message:"Potentially unsafe skill content requires review."});
    }
  }
}

const blocking=findings.filter((item)=>item.severity==="critical"||item.severity==="high");
if(findings.length){
  console.error(JSON.stringify({findings},null,2));
}
if(blocking.length){
  console.error("Skill security scan blocked by "+blocking.length+" high/critical finding(s).");
  process.exit(1);
}
console.log("Skill security scan passed with "+findings.length+" non-blocking finding(s).");
