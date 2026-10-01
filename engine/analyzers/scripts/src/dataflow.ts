import ts from "typescript";
import type {
  DataFlowEdge,
  DataFlowGraph,
  DataFlowNode,
} from "../../../packages/dataflow/src/index.js";
import type { SourceRef } from "../../../packages/project-model/src/index.js";
import {
  deriveCrossFileCallEdges,
  type ScriptModuleSourceInput,
} from "./cross-file-call.js";

interface FunctionInfo {
  modulePath: string;
  name: string;
  regionId: string;
  parameters: readonly string[];
  returnNodeId: string;
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".ts")) return ts.ScriptKind.TS;
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function sourceRef(
  file: ts.SourceFile,
  node: ts.Node,
  source: SourceRef,
): SourceRef {
  const start=file.getLineAndCharacterOfPosition(node.getStart(file));
  const end=file.getLineAndCharacterOfPosition(node.getEnd());
  return {
    ...source,
    range:{
      lineStart:start.line+1,
      lineEnd:end.line+1,
      columnStart:start.character+1,
      columnEnd:end.character+1,
    },
  };
}

function regionId(node: ts.Node): string {
  let current: ts.Node | undefined=node;
  while(current){
    if(ts.isFunctionDeclaration(current) && current.name){
      return "function:"+current.name.text;
    }
    if(ts.isMethodDeclaration(current)){
      const name=current.name;
      if(ts.isIdentifier(name)||ts.isStringLiteralLike(name)){
        return "function:"+name.text;
      }
    }
    if(ts.isArrowFunction(current)||ts.isFunctionExpression(current)){
      const parent=current.parent;
      if(ts.isVariableDeclaration(parent)&&ts.isIdentifier(parent.name)){
        return "function:"+parent.name.text;
      }
    }
    current=current.parent;
  }
  return "module";
}

function posId(file: ts.SourceFile,node: ts.Node): string {
  const p=file.getLineAndCharacterOfPosition(node.getStart(file));
  return (p.line+1)+":"+(p.character+1);
}

function propertyLabel(expr: ts.PropertyAccessExpression): string {
  return expr.getText(expr.getSourceFile());
}

function expressionNode(
  modulePath:string,
  file:ts.SourceFile,
  expr:ts.Expression,
  source:SourceRef,
): DataFlowNode {
  const region=regionId(expr);
  const common={
    modulePath,
    regionId:region,
    source:sourceRef(file,expr,{...source,relativePath:modulePath}),
  };

  if(ts.isIdentifier(expr)){
    return {
      id:modulePath+"#"+region+"#binding#"+expr.text,
      kind:"binding",
      symbol:expr.text,
      label:expr.text,
      ...common,
    };
  }
  if(ts.isPropertyAccessExpression(expr)){
    const label=propertyLabel(expr);
    return {
      id:modulePath+"#"+region+"#property#"+label,
      kind:"property",
      symbol:label,
      label,
      ...common,
    };
  }
  if(ts.isStringLiteralLike(expr)||ts.isNumericLiteral(expr)||
     expr.kind===ts.SyntaxKind.TrueKeyword||expr.kind===ts.SyntaxKind.FalseKeyword||
     expr.kind===ts.SyntaxKind.NullKeyword){
    return {
      id:modulePath+"#"+region+"#literal#"+posId(file,expr),
      kind:"literal",
      label:expr.getText(file),
      ...common,
    };
  }
  if(ts.isCallExpression(expr)){
    return {
      id:modulePath+"#"+region+"#call-result#"+posId(file,expr),
      kind:"call-result",
      label:expr.expression.getText(file),
      ...common,
    };
  }
  return {
    id:modulePath+"#"+region+"#unknown#"+posId(file,expr),
    kind:"unknown",
    label:expr.getText(file),
    ...common,
  };
}

function pushNode(map:Map<string,DataFlowNode>,node:DataFlowNode): string {
  if(!map.has(node.id)) map.set(node.id,node);
  return node.id;
}

function edgeId(kind:string,from:string,to:string,ordinal:number): string {
  return kind+":"+from+"->"+to+":"+ordinal;
}

export function deriveScriptDataFlowGraph(
  modules: readonly ScriptModuleSourceInput[],
): DataFlowGraph {
  const nodes=new Map<string,DataFlowNode>();
  const edges:DataFlowEdge[]=[];
  const unresolved:DataFlowGraph["unresolved"][number][]=[];
  const files=new Map<string,ts.SourceFile>();
  const functions=new Map<string,FunctionInfo>();

  for(const module of modules){
    const file=ts.createSourceFile(module.path,module.text,ts.ScriptTarget.Latest,true,scriptKind(module.path));
    files.set(module.path,file);

    const collect=(node:ts.Node):void=>{
      if(ts.isFunctionDeclaration(node)&&node.name){
        const region="function:"+node.name.text;
        const parameters=node.parameters
          .map((p)=>ts.isIdentifier(p.name)?p.name.text:undefined)
          .filter((x):x is string=>x!==undefined);
        const retId=module.path+"#"+region+"#return";
        pushNode(nodes,{id:retId,kind:"return",modulePath:module.path,regionId:region,symbol:node.name.text,label:"return",source:sourceRef(file,node,module.source)});
        functions.set(module.path+"#"+node.name.text,{modulePath:module.path,name:node.name.text,regionId:region,parameters,returnNodeId:retId});
        for(const p of node.parameters){
          if(!ts.isIdentifier(p.name)) continue;
          pushNode(nodes,{id:module.path+"#"+region+"#parameter#"+p.name.text,kind:"parameter",modulePath:module.path,regionId:region,symbol:p.name.text,label:p.name.text,source:sourceRef(file,p,module.source)});
        }
      }
      if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer){
        if(ts.isArrowFunction(node.initializer)||ts.isFunctionExpression(node.initializer)){
          const region="function:"+node.name.text;
          const parameters=node.initializer.parameters
            .map((p)=>ts.isIdentifier(p.name)?p.name.text:undefined)
            .filter((x):x is string=>x!==undefined);
          const retId=module.path+"#"+region+"#return";
          pushNode(nodes,{id:retId,kind:"return",modulePath:module.path,regionId:region,symbol:node.name.text,label:"return",source:sourceRef(file,node,module.source)});
          functions.set(module.path+"#"+node.name.text,{modulePath:module.path,name:node.name.text,regionId:region,parameters,returnNodeId:retId});
          for(const p of node.initializer.parameters){
            if(!ts.isIdentifier(p.name)) continue;
            pushNode(nodes,{id:module.path+"#"+region+"#parameter#"+p.name.text,kind:"parameter",modulePath:module.path,regionId:region,symbol:p.name.text,label:p.name.text,source:sourceRef(file,p,module.source)});
          }
        }
      }
      ts.forEachChild(node,collect);
    };
    collect(file);
  }

  const cross=deriveCrossFileCallEdges(modules);
  const callResolution=new Map<string,typeof cross[number]>();
  for(const item of cross){
    const range=item.source.range;
    if(!range) continue;
    callResolution.set(item.callerModule+"#"+range.lineStart+":"+range.columnStart,item);
  }

  let ordinal=0;
  for(const module of modules){
    const file=files.get(module.path)!;
    const visit=(node:ts.Node):void=>{
      const src=(n:ts.Node)=>sourceRef(file,n,{...module.source,relativePath:module.path});

      if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer&&
        !ts.isArrowFunction(node.initializer)&&!ts.isFunctionExpression(node.initializer)){
        const from=pushNode(nodes,expressionNode(module.path,file,node.initializer,module.source));
        const region=regionId(node);
        const to=pushNode(nodes,{id:module.path+"#"+region+"#binding#"+node.name.text,kind:"binding",modulePath:module.path,regionId:region,symbol:node.name.text,label:node.name.text,source:src(node.name)});
        edges.push({id:edgeId("assignment",from,to,ordinal++),from,to,kind:"assignment",confidence:"exact",source:src(node)});
      }

      if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&
         ts.isIdentifier(node.left)){
        const from=pushNode(nodes,expressionNode(module.path,file,node.right,module.source));
        const region=regionId(node);
        const to=pushNode(nodes,{id:module.path+"#"+region+"#binding#"+node.left.text,kind:"binding",modulePath:module.path,regionId:region,symbol:node.left.text,label:node.left.text,source:src(node.left)});
        edges.push({id:edgeId("assignment",from,to,ordinal++),from,to,kind:"assignment",confidence:"exact",source:src(node)});
      }

      if(ts.isReturnStatement(node)&&node.expression){
        const fnRegion=regionId(node);
        const from=pushNode(nodes,expressionNode(module.path,file,node.expression,module.source));
        const fnName=fnRegion.startsWith("function:")?fnRegion.slice("function:".length):undefined;
        const info=fnName?functions.get(module.path+"#"+fnName):undefined;
        if(info){
          edges.push({id:edgeId("return",from,info.returnNodeId,ordinal++),from,to:info.returnNodeId,kind:"return",confidence:"exact",source:src(node)});
        }
      }

      if(ts.isCallExpression(node)){
        const region=regionId(node);
        const callNode=pushNode(nodes,{
          id:module.path+"#"+region+"#call#"+posId(file,node),
          kind:"call",
          modulePath:module.path,
          regionId:region,
          symbol:node.expression.getText(file),
          label:node.expression.getText(file),
          source:src(node),
        });
        const callResult=pushNode(nodes,expressionNode(module.path,file,node,module.source));

        node.arguments.forEach((arg)=>{
          const from=pushNode(nodes,expressionNode(module.path,file,arg,module.source));
          edges.push({
            id:edgeId("argument",from,callNode,ordinal++),
            from,
            to:callNode,
            kind:"argument",
            confidence:"exact",
            source:src(arg),
          });
        });
        edges.push({
          id:edgeId("invocation-result",callNode,callResult,ordinal++),
          from:callNode,
          to:callResult,
          kind:"invocation-result",
          confidence:"exact",
          source:src(node),
        });

        let targetModule=module.path;
        let targetName:string|undefined;

        if(ts.isIdentifier(node.expression)){
          targetName=node.expression.text;
        }

        const range=src(node).range;
        const resolved=range?callResolution.get(module.path+"#"+range.lineStart+":"+range.columnStart):undefined;
        if(resolved?.status==="resolved"&&resolved.targetModule){
          targetModule=resolved.targetModule;
          targetName=resolved.targetExport;
        }

        const info=targetName?functions.get(targetModule+"#"+targetName):undefined;
        if(info){
          node.arguments.forEach((arg,index)=>{
            const param=info.parameters[index];
            if(!param) return;
            const from=pushNode(nodes,expressionNode(module.path,file,arg,module.source));
            const to=pushNode(nodes,{id:targetModule+"#"+info.regionId+"#parameter#"+param,kind:"parameter",modulePath:targetModule,regionId:info.regionId,symbol:param,label:param});
            edges.push({id:edgeId("argument",from,to,ordinal++),from,to,kind:"argument",confidence:resolved?"exact":"bounded",source:src(arg)});
          });
          edges.push({id:edgeId("call-result",info.returnNodeId,callResult,ordinal++),from:info.returnNodeId,to:callResult,kind:"call-result",confidence:resolved?"exact":"bounded",source:src(node)});
        }else if(targetName){
          unresolved.push({id:module.path+"#call#"+posId(file,node),reason:"Call target parameters/return flow are unresolved: "+targetName,source:src(node)});
        }
      }

      ts.forEachChild(node,visit);
    };
    visit(file);
  }

  return {
    schemaVersion:1,
    nodes:[...nodes.values()].sort((a,b)=>a.id.localeCompare(b.id)),
    edges:edges.sort((a,b)=>a.id.localeCompare(b.id)),
    unresolved:unresolved.sort((a,b)=>a.id.localeCompare(b.id)),
  };
}
