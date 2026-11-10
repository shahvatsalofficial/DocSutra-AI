import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = path.resolve(here,'../../.agents/skills');
export const HOSTS={claude:'.claude/skills',cursor:'.cursor/skills',codex:'.agents/skills',gemini:'.gemini/skills',copilot:'.github/skills'};
async function rejectSymlinkSegments(target, root){
  let cur=path.resolve(root);
  const rel=path.relative(cur,path.resolve(target));
  if(rel.startsWith('..')||path.isAbsolute(rel))throw new Error('Target must be within the selected project root.');
  for(const part of rel.split(path.sep).filter(Boolean)){
    cur=path.join(cur,part);
    try{const st=await fs.lstat(cur);if(st.isSymbolicLink())throw new Error(`Refusing symlink destination: ${cur}`);}
    catch(e){if(e.code!=='ENOENT')throw e;}
  }
}
export async function installSkills(project,host,{force=false}={}){
 const root=await fs.realpath(project);
 const destinations=host==='all'?Object.entries(HOSTS):[[host,HOSTS[host]]];
 if(destinations.some(([,p])=>!p))throw new Error(`Unknown host '${host}'. Supported: ${Object.keys(HOSTS).join(', ')}, all`);
 const skills=(await fs.readdir(catalog,{withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>x.name);
 let installed=0,skipped=0;const targets=[];
 for(const [name,directory] of destinations){
  const base=path.join(root,directory);await rejectSymlinkSegments(base,root);
  await fs.mkdir(base,{recursive:true});
  for(const skill of skills){
    const dst=path.join(base,skill);await rejectSymlinkSegments(dst,root);
    try{await fs.lstat(dst);if(!force){skipped++;continue;}await fs.rm(dst,{recursive:true,force:true});}catch(e){if(e.code!=='ENOENT')throw e;}
    await fs.cp(path.join(catalog,skill),dst,{recursive:true,errorOnExist:true,force:false});installed++;targets.push(`${name}: ${path.relative(root,dst)}`);
  }
 }
 return {hosts:destinations.map(([host])=>host),installed,skipped,targets};
}
