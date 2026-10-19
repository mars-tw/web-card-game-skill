// Legacy tests still render screenshots and run every assertion. Preserve historical
// PNGs and redirect text receipts; only R9 evidence is written to its requested paths.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/content/r9/legacy-receipts');
function destination(p){if(typeof p!=='string')return p;const abs=path.resolve(p),rel=path.relative(root,abs).replaceAll('\\','/');
 if(!rel.startsWith('docs/')||rel.startsWith('docs/content/r9/')||rel.includes('content-r9-'))return p;
 if(/\.(png|jpg|webp)$/.test(rel))return null;
 const dest=path.join(out,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});return dest;}
const sync=fs.writeFileSync.bind(fs),async=fs.writeFile.bind(fs),promise=fs.promises.writeFile.bind(fs.promises);
fs.writeFileSync=(p,...args)=>{const d=destination(p);if(d!==null)return sync(d,...args);};
fs.writeFile=(p,...args)=>{const d=destination(p);if(d!==null)return async(d,...args);const cb=args.at(-1);if(typeof cb==='function')queueMicrotask(()=>cb(null));};
fs.promises.writeFile=(p,...args)=>{const d=destination(p);return d===null?Promise.resolve():promise(d,...args);};
