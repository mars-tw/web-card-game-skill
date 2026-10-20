"""Legacy tests retain every assertion; redirect their artifact IO before it occurs."""
import builtins,io,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
original_builtin=builtins.open
original_io=io.open
def destination(file,mode):
 if not isinstance(file,(str,bytes,os.PathLike)):return file
 p=Path(file).resolve()
 try:rel=p.relative_to(ROOT)
 except ValueError:return file
 if not any(c in mode for c in 'wax+') and rel.parts and rel.parts[0]=='docs' and p.suffix.lower() in ['.png','.webp','.jpg','.jpeg','.mp4','.webm','.gif']:
  trace=ROOT/'.audit-tmp/r13/media-reads';trace.mkdir(parents=True,exist_ok=True)
  with original_builtin(trace/(str(os.getpid())+'.jsonl'),'a',encoding='utf-8')as f:f.write(__import__('json').dumps(rel.as_posix())+'\n')
 if not rel.parts or rel.parts[0]!='docs' or rel.as_posix().startswith('docs/content/r13/'):return file
 target=ROOT/'.audit-tmp/r13/legacy'/rel
 if any(c in mode for c in 'wax+'):
  target.parent.mkdir(parents=True,exist_ok=True)
  return target
 return target if target.exists() else file
def guarded_builtin(file,mode='r',*args,**kwargs):return original_builtin(destination(file,mode),mode,*args,**kwargs)
def guarded_io(file,mode='r',*args,**kwargs):return original_io(destination(file,mode),mode,*args,**kwargs)
builtins.open=guarded_builtin
io.open=guarded_io
