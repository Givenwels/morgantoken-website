import {buildEvaluationReport,buildSummaryBrief,reportMarkdown} from './report-data.js?v=20261115-dims3';
import {buildConclusionDraft} from './workflow-data.js?v=20261115-dims3';
import {DIMENSIONS} from './label-data.js?v=20261115-dims3';

export function createReportView({root,onReview,download,notify}){
  const $=id=>root.querySelector('#'+id);
  const node=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
  const percent=n=>n===null?'—':n.toFixed(1)+'%';
  let report,currentDim='all';
  $('download-report').addEventListener('click',()=>{if(report?.coverage.judged_pairs)download(reportMarkdown(report),'Morgan-视频GSB评测报告.md','text/markdown;charset=utf-8');});
  $('download-brief').addEventListener('click',()=>{if(report?.coverage.judged_pairs){download(JSON.stringify(buildSummaryBrief(report),null,2),'Morgan-AI总结资料包.json','application/json;charset=utf-8');notify('已导出固定统计、人工备注和引用编号。尚未调用模型 API。');}});
  const tabs=$('dimension-tabs');
  tabs.append(tabButton('all','全部维度汇总'));
  for(const [key,label] of Object.entries(DIMENSIONS))tabs.append(tabButton(key,label));
  function tabButton(key,label){
    const button=node('button',label);button.className='dim-tab';button.dataset.dim=key;button.type='button';
    button.addEventListener('click',()=>{currentDim=key;for(const b of tabs.children)b.classList.toggle('active',b.dataset.dim===currentDim);renderTable();});
    return button;
  }
  function renderTable(){
    const rows=currentDim==='all'?report.models:report.dimensions[currentDim].models;
    const head=currentDim==='all'?'已评维度':'已评组';
    const table=$('model-results').closest('table');
    table.querySelector('thead tr').replaceChildren(...['参考序','模型',head,'胜','负','同好','同差','有效胜率'].map(value=>{const th=document.createElement('th');th.textContent=value;return th;}));
    const tbody=$('model-results');tbody.replaceChildren();
    for(const m of rows){const row=document.createElement('tr');for(const value of [m.rank??'—',m.name,`${m.judged}/${m.available}`,m.wins,m.losses,m.both_good,m.both_bad,percent(m.decisive_win_rate)])row.append(node('td',String(value)));tbody.append(row);}
    if(!rows.length){const row=document.createElement('tr');const td=node('td','暂无已保存判断。');td.colSpan=8;row.append(td);tbody.append(row);}
  }
  return {render(catalog,saved){
    report=buildEvaluationReport(catalog,saved);
    const c=report.coverage;
    const draft=buildConclusionDraft(report);
    $('conclusion-summary').textContent=draft.summary;
    $('conclusion-status').textContent={empty:'等待首票',partial:'阶段草稿',complete:'本批草稿'}[draft.status];
    const observations=$('conclusion-observations');observations.replaceChildren();
    for(const e of draft.observations.slice(0,3)){
      const row=document.createElement('p');row.className='conclusion-observation';
      row.append(node('strong',`${e.evidence_id} · ${e.title}：`),document.createTextNode(e.note.length>180?e.note.slice(0,180)+'…':e.note));observations.append(row);
    }
    if(draft.observations.length>3)observations.append(node('p',`共 ${draft.observations.length} 条维度备注，完整原文见下方“备注与证据”或导出报告。`));
    $('report-progress').textContent=`已评 ${c.judged_pairs}/${c.available_pairs} 组 · ${c.judged_votes}/${c.available_votes} 条维度判断 · ${c.judged_cases}/${c.available_cases} 道任务 · ${c.notes} 条备注`;
    $('report-scope').textContent=c.judged_pairs?'这是当前个人样本的参考排序。请同时看已评数量、对手与任务覆盖；备注结论需要原视频支持。':'还没有本批次的评分。打完第一组后，这里会自动更新统计和备注。';
    $('report-method').textContent=report.method.metric;
    $('report-snapshot').textContent=`批次：${report.batch_name} · 快照：${report.snapshot_key} · 评分规则：${String(report.rule_hash||'').slice(0,12)}`;
    for(const id of ['download-report','download-brief'])$(id).disabled=!c.judged_pairs;
    renderTable();
    const tasks=$('task-results');tasks.replaceChildren();
    for(const task of report.tasks.filter(t=>t.judged)){
      const card=document.createElement('article');card.className='task-result';
      card.append(node('h3',task.title),node('p',`已评 ${task.judged}/${task.available} 条维度判断 · ${task.evidence_ids.join('、')}`));
      for(const m of task.models.filter(m=>m.judged))card.append(node('p',`${m.name}：胜 ${m.wins} / 负 ${m.losses} / 同好 ${m.both_good} / 同差 ${m.both_bad}；有效胜率 ${percent(m.decisive_win_rate)}`));
      tasks.append(card);
    }
    if(!tasks.childNodes.length)tasks.append(node('p','评过的任务会出现在这里，便于比较模型在哪类任务表现更好。'));
    const notes=$('report-notes');notes.replaceChildren();
    for(const e of report.evidence.filter(e=>e.note.trim())){
      const card=document.createElement('article');card.className='note-evidence';
      const button=node('button',`回看 ${e.evidence_id}`);button.addEventListener('click',()=>onReview(e.context_id));
      card.append(node('h3',e.title),node('p',`A：${e.left.name} · B：${e.right.name} · 六维判断：${e.dims_zh}`),node('blockquote',e.note),button);notes.append(card);
    }
    if(!notes.childNodes.length)notes.append(node('p','尚未填写备注。建议按维度记录现象和时间点，例如“【运动质量】2–3秒脚部穿模”，总结时就有可引用的依据。'));
  }};
}
