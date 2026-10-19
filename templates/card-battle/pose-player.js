/* 可替換逐幀播放器：不移動卡牌／碰撞根節點；沒有正式幀時明確 BLOCKED。 */
(function(root, factory) {
  const api = factory(); if (root) root.CardPosePlayer=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const registry=new Map();
  function plan(asset, action) {
    const groups=asset?.[action];
    const phases=action==='attack'?['anticipation','impact','recovery']:['frames'];
    if(!groups || phases.some(p=>!Array.isArray(groups[p]) || groups[p].length===0))return {status:'BLOCKED',reason:'missing_pose_frames',frames:[]};
    const frames=phases.flatMap(phase=>groups[phase].map((f,i)=>({...f,phase,hit:phase==='impact'&&i===0})));
    if(frames.length>120 || frames.some(f=>typeof f.src!=='string' || !f.src.startsWith('../../assets/animations/') || !Number.isFinite(f.ms) || f.ms<16 || f.ms>1000))return {status:'BLOCKED',reason:'invalid_pose_contract',frames:[]};
    if(action==='walk' && new Set(frames.map(f=>f.src)).size<2)return {status:'BLOCKED',reason:'locomotion_requires_distinct_poses',frames:[]};
    return {status:'PREPARED',frames};
  }
  async function play(asset,action,renderFrame,onImpact) {
    const p=plan(asset,action);if(p.status==='BLOCKED')return p;
    for(const f of p.frames){renderFrame(f.src);if(f.hit && onImpact)onImpact();await new Promise(r=>setTimeout(r,f.ms));}
    return {status:'EXECUTED',frames:p.frames.length};
  }
  return {plan,play,register:(id,asset)=>registry.set(id,asset),get:id=>registry.get(id)};
});
