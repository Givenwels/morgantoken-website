import {buildEvaluationReport,buildSummaryBrief,reportMarkdown} from './report-data.js?v=20261110-report3';

export function createReportView({root,onReview,download,notify}){
  const $=id=>root.querySelector('#'+id);
  const node=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
  const percent=n=>n===null?'—':n.toFixed(1)+'%';
  let report;
  $('download-report').addEventListener('click',()=>{if(report?.coverage.judged_pairs)download(reportMarkdown(report),'Morgan-视频GSB评测报告.md','text/markdown;charset=utf-8');});
  $('download-brief').addEventListener('click',()=>{if(report?.coverage.judged_pairs){download(JSON.stringify(buildSummaryBrief(report),null,2),'Morgan-AI总结资料包.json','application/json;charset=utf-8');notify('已导出固定统计、人工备注和引用编号。尚未调用模型 API。');}});
  return {render(catalog,saved){
    report=buildEvaluationReport(catalog,saved);
    const c=report.coverage;
    $('report-progress').textContent=`已评 ${c.judged_pairs}/${c.available_pairs} 组 · ${c.judged_cases}/${c.available_cases} 道任务 · ${c.notes} 条备注`;
    $('report-scope').textContent=c.judged_pairs?'这是当前个人样本的参考排序。请同时看已评数量、对手与任务覆盖；备注结论需要原视频支持。':'还没有本批次的评分。打完第一组后，这里会自动更新统计和备注。';
    $('report-method').textContent=report.method.metric;
    $('report-snapshot').textContent=`批次：${report.batch_name} · 快照：${report.snapshot_key} · 评分规则：${String(report.rule_hash||'').slice(0,12)}`;
    for(const id of ['download-report','download-brief'])$(id).disabled=!c.judged_pairs;
    const tbody=$('model-results');tbody.replaceChildren();
    for(const m of report.models){const row=document.createElement('tr');for(const value of [m.rank??'—',m.name,`${m.judged}/${m.available}`,m.wins,m.losses,m.both_good,m.both_bad,percent(m.decisive_win_rate)])row.append(node('td',String(value)));tbody.append(row);}
    const tasks=$('task-results');tasks.replaceChildren();
    for(const task of report.tasks.filter(t=>t.judged)){
      const card=document.createElement('article');card.className='task-result';
      card.append(node('h3',task.title),node('p',`已评 ${task.judged}/${task.available} 组 · ${task.evidence_ids.join('、')}`));
      for(const m of task.models.filter(m=>m.judged))card.append(node('p',`${m.name}：胜 ${m.wins} / 负 ${m.losses} / 同好 ${m.both_good} / 同差 ${m.both_bad}；有效胜率 ${percent(m.decisive_win_rate)}`));
      tasks.append(card);
    }
    if(!tasks.childNodes.length)tasks.append(node('p','评过的任务会出现在这里，便于比较模型在哪类任务表现更好。'));
    const notes=$('report-notes');notes.replaceChildren();
    for(const e of report.evidence.filter(e=>e.note.trim())){
      const card=document.createElement('article');card.className='note-evidence';
      const button=node('button',`回看 ${e.evidence_id}`);button.addEventListener('click',()=>onReview(e.context_id));
      card.append(node('h3',e.title),node('p',`A：${e.left.name} · B：${e.right.name} · 你的判断：${e.choice_zh}`),node('blockquote',e.note),button);notes.append(card);
    }
    if(!notes.childNodes.length)notes.append(node('p','尚未填写备注。建议记录现象和时间点，例如“2–3秒脚部穿模”，总结时就有可引用的依据。'));
  }};
}
