import {currentLabels,resumeIndex} from './label-data.js';

export function buildWorkspaceStatus(catalog,saved){
  const votes=currentLabels(catalog,saved);
  const latest=[...votes].sort((a,b)=>String(b.stored_at||b.annotated_at||'').localeCompare(String(a.stored_at||a.annotated_at||'')))[0];
  return {total_pairs:catalog.pairs.length,total_cases:new Set(catalog.pairs.map(p=>p.case_id||p.id)).size,model_count:new Set(catalog.pairs.flatMap(p=>[p.left.model,p.right.model])).size,saved_pairs:votes.length,remaining_pairs:catalog.pairs.length-votes.length,notes:votes.filter(v=>v.note?.trim()).length,percent:catalog.pairs.length?Math.round(votes.length/catalog.pairs.length*100):0,complete:votes.length===catalog.pairs.length,report_ready:votes.length>0,next_index:resumeIndex(catalog,saved),latest_pair_id:latest?.pair_id||null,latest_saved_at:latest?.stored_at||latest?.annotated_at||null};
}

export function buildConclusionDraft(report){
  const c=report.coverage;
  if(!c.judged_pairs)return {status:'empty',generated_by:'deterministic-template',api_used:false,summary:'还没有已保存的人工评分。完成第一组 GSB 后，系统会自动汇总阶段统计和备注，生成结论草稿。',leaders:[],observations:[]};
  const decisive=report.models.filter(m=>m.decisive_win_rate!==null);
  const best=decisive.length?Math.max(...decisive.map(m=>m.decisive_win_rate)):null;
  const leaders=decisive.filter(m=>m.decisive_win_rate===best).map(m=>({id:m.id,name:m.name,rate:m.decisive_win_rate,wins:m.wins,losses:m.losses,evidence_ids:report.evidence.filter(e=>(e.left.model===m.id||e.right.model===m.id)&&['left','right'].includes(e.choice)).map(e=>e.evidence_id)}));
  const phase=c.judged_pairs===c.available_pairs?'本批已评完':'当前为阶段结果';
  const lead=leaders.length?`在已分出胜负的比较中，${leaders.map(m=>`${m.name}的有效胜率为${m.rate.toFixed(1)}%（${m.wins}胜${m.losses}负）`).join('；')}，为当前样本中的${leaders.length>1?'并列最高':'最高'}值，仅作参考。`:'目前未分出有效胜负，不提供胜率领先者。';
  return {status:c.judged_pairs===c.available_pairs?'complete':'partial',generated_by:'deterministic-template',api_used:false,summary:`${phase}：已保存${c.judged_pairs}/${c.available_pairs}组，覆盖${c.judged_cases}/${c.available_cases}道任务；双好 ${report.counts.both_good}组，双差 ${report.counts.both_bad}组。${lead}共${c.notes}条人工备注可用于核对现象。各模型的任务和对手覆盖可能不同，这不是模型总体排名。`,leaders,observations:report.evidence.filter(e=>e.note.trim()).map(e=>({evidence_id:e.evidence_id,context_id:e.context_id,title:e.title,choice_zh:e.choice_zh,note:e.note,left_model:e.left.name,right_model:e.right.name}))};
}
