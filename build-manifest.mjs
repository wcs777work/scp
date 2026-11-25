import fs from 'node:fs';import path from 'node:path';
const base='share';const out='files.json';let items=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(entry.isFile()){const rel=path.relative(base,full).split(path.sep).join('/');items.push({path:rel,name:entry.name,size:fs.statSync(full).size,url:`share/${rel}`})}}}
if(fs.existsSync(base))walk(base);items.sort((a,b)=>a.path.localeCompare(b.path));fs.writeFileSync(out,JSON.stringify(items,null,2));console.log(`Indexed ${items.length} files`);
