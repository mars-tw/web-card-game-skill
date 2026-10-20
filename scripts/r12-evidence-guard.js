// Keep all legacy assertions and actual screenshot bytes, isolate only their writes.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
function dest(p){if(typeof p!=='string')return p;const rel=path.relative(root,path.resolve(p)).replaceAll('\\','/');if(!rel.startsWith('docs/')||rel.startsWith('docs/content/r12/')||rel.includes('content-r12-'))return p;const target=path.join(root,'.audit-tmp/r12/legacy',rel);fs.mkdirSync(path.dirname(target),{recursive:true});return target;}
const a=fs.writeFileSync.bind(fs),b=fs.writeFile.bind(fs),c=fs.promises.writeFile.bind(fs.promises);fs.writeFileSync=(p,...args)=>a(dest(p),...args);fs.writeFile=(p,...args)=>b(dest(p),...args);fs.promises.writeFile=(p,...args)=>c(dest(p),...args);
