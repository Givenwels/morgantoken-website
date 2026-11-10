export const CHOICES=Object.freeze({left:'左边更好',right:'右边更好',both_good:'两个都好',both_bad:'两个都差'});

export function validateCatalog(catalog){
  if(catalog?.media_mode!=='remote-link'||!Array.isArray(catalog.pairs)||!catalog.pairs.length)throw Error('在线视频题库格式不正确。');
  const ids=new Set();
  for(const pair of catalog.pairs){
    if(!pair.id||ids.has(pair.id)||!pair.context_id)throw Error('题目编号或版本不正确。');
    ids.add(pair.id);
    if(pair.display_language!=='zh-CN'||typeof pair.prompt_zh!=='string'||!/[\u3400-\u9fff]/u.test(pair.prompt_zh))throw Error('存在未完成中文翻译的题目，暂不开放标注。');
    for(const side of ['left','right']){
      const asset=pair[side];
      if(!asset?.id||new URL(asset.url).protocol!=='https:')throw Error('视频必须使用 HTTPS 在线链接。');
    }
    if(pair.left.id===pair.right.id)throw Error('左右不能是同一个视频。');
  }
  return catalog;
}

export function selectCatalogBatch(catalog,id=catalog.default_batch){
  if(!catalog.batches?.length)return catalog;
  const batch=catalog.batches.find(b=>b.id===id);
  if(!batch)throw Error('该题库批次不存在。');
  const lookup=new Map(catalog.pairs.map(p=>[p.id,p]));
  const pairs=batch.pair_ids.map(pairId=>lookup.get(pairId));
  if(!pairs.length||pairs.some(p=>!p)||new Set(batch.pair_ids).size!==pairs.length)throw Error('该批次的题目索引不完整。');
  return {...catalog,pairs,batch_id:batch.id,batch_name:batch.name,batch_note:batch.note};
}

export function referenceImageURL(pair){
  const ref=pair.reference;
  if(ref?.kind!=='source-image'||!ref.id?.startsWith(`${ref.repository}@${ref.revision}/`))throw Error('参考图来源信息不完整。');
  const image=new URL(ref.url),path=ref.id.slice(`${ref.repository}@${ref.revision}/`.length);
  if(image.protocol!=='https:'||image.hostname!=='huggingface.co'||image.pathname!==`/datasets/${ref.repository}/resolve/${ref.revision}/${path}`||image.search||image.hash||!path.endsWith('/'+pair.case_id+'.png'))throw Error('参考图的实例或来源版本不匹配，暂不开放本题评分。');
  return image.href;
}

export function parseSaved(raw){
  const value=JSON.parse(raw||'{}');
  if(!value||Array.isArray(value)||typeof value!=='object')throw Error('本机标注记录格式不正确。');
  return value;
}

export function currentLabels(catalog,saved){
  return catalog.pairs.flatMap(pair=>{
    const vote=saved[pair.context_id];
    return vote?.context_id===pair.context_id&&vote.pair_id===pair.id&&Object.hasOwn(CHOICES,vote.choice)?[vote]:[];
  });
}

export function makeLabel(pair,choice,note,exposure={},now=new Date().toISOString()){
  if(!Object.hasOwn(CHOICES,choice))throw Error('请选择四档 GSB 中的一档。');
  return {pair_id:pair.id,context_id:pair.context_id,choice,note:String(note||'').trim().slice(0,2000),annotated_at:now,ai_reference_seen:Boolean(exposure.ai),model_identity_seen:Boolean(exposure.models)};
}

export function exportLabels(catalog,saved,now=new Date().toISOString()){
  return {schema:'morgan-video-gsb-labels-v2',catalog_id:catalog.catalog_id,batch_id:catalog.batch_id,batch_name:catalog.batch_name,rule_hash:catalog.rule_hash,exported_at:now,media_included:false,
    labels:currentLabels(catalog,saved).map(vote=>{
      const pair=catalog.pairs.find(p=>p.context_id===vote.context_id);
      return {...vote,choice_zh:CHOICES[vote.choice],batch_id:pair.batch_id,prompt_zh:pair.prompt_zh,prompt_original:pair.prompt_original,prompt_provenance:pair.prompt_provenance,reference:pair.reference,task_category:pair.task_category,display_language:pair.display_language,
        translation:pair.translation,source:pair.source,left:{id:pair.left.id,url:pair.left.url,model:pair.left.model,model_version:pair.left.model_version,model_name:catalog.model_names?.[pair.left.model]||pair.left.model},right:{id:pair.right.id,url:pair.right.url,model:pair.right.model,model_version:pair.right.model_version,model_name:catalog.model_names?.[pair.right.model]||pair.right.model}};
    })};
}

export function nextUnratedIndex(catalog,saved,index){
  const completed=new Set(currentLabels(catalog,saved).map(v=>v.context_id));
  for(let step=1;step<=catalog.pairs.length;step++){
    const candidate=(index+step+catalog.pairs.length)%catalog.pairs.length;
    if(!completed.has(catalog.pairs[candidate].context_id))return candidate;
  }
  return null;
}

export function resumeIndex(catalog,saved){
  const records=currentLabels(catalog,saved).sort((a,b)=>String(b.stored_at||b.annotated_at||'').localeCompare(String(a.stored_at||a.annotated_at||'')));
  if(!records.length)return 0;
  const last=catalog.pairs.findIndex(p=>p.context_id===records[0].context_id);
  return nextUnratedIndex(catalog,saved,last)??last;
}

export async function persistLabelAndPlanNext({catalog,index,choice,note,exposure={},persist,now}){
  const pair=catalog.pairs[index];
  const record=makeLabel(pair,choice,note,exposure,now);
  const state=await persist(record);
  const confirmed=state?.labels?.[pair.context_id];
  if(confirmed?.pair_id!==pair.id||confirmed?.choice!==choice||confirmed?.context_id!==pair.context_id)throw Error('保存服务没有确认本次标注，请重试。');
  const nextIndex=nextUnratedIndex(catalog,state.labels,index);
  return {state,record:confirmed,nextIndex,complete:nextIndex===null};
}
