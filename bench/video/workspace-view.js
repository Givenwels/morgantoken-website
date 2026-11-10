import {buildWorkspaceStatus} from './workflow-data.js?v=20261110-system2';

export function createWorkspaceView({root}){
  const $=id=>root.querySelector('#'+id);
  const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
  return {render(catalog,saved,{storageReady,browserMode,busy,changed}){
    const status=buildWorkspaceStatus(catalog,saved);
    $('workspace-batch').textContent=catalog.batch_name||'当前评测批次';
    $('workspace-progress').textContent=`${status.saved_pairs} / ${status.total_pairs}`;
    $('workspace-task-count').textContent=String(status.total_cases);
    $('workspace-model-count').textContent=String(status.model_count);
    $('workspace-note-count').textContent=String(status.notes);
    $('workspace-progress-bar').value=status.saved_pairs;$('workspace-progress-bar').max=status.total_pairs;
    $('workspace-percent').textContent=`${status.percent}% 已保存 · 剩余 ${status.remaining_pairs} 组`;
    $('workspace-resume').textContent=status.complete?'回看已评作品':status.saved_pairs?'继续本批评审':'开始本批评审';
    $('workspace-resume').disabled=busy||!storageReady;
    $('workspace-report-link').textContent=status.report_ready?'查看当前报告 →':'先完成第一组评分 →';
    $('workspace-report-link').href=status.report_ready?'#report':'#review';
    $('workspace-last').textContent=status.latest_pair_id?`最近保存：${status.latest_pair_id} · ${new Date(status.latest_saved_at).toLocaleString('zh-CN')}`:'每次保存确认成功后，自动进入下一组；刷新后可续评。';
    $('workspace-data-status').textContent=storageReady?(browserMode?'当前浏览器保存已就绪':'本机文件保存已就绪'):'保存服务未就绪';
    $('workspace-data-description').textContent=browserMode?'评分留在当前浏览器，可刷新续评。导出 JSON 后可在其他设备导入恢复；当前未启用跨设备同步或公共票池。':'评分写入本机 data/video-gsb-labels.json。导出 JSON 后可到个站导入查看，网站不会自动读取本机数据。';
    $('workspace-material-status').textContent=`已建批次 · ${status.total_cases} 道题 / ${status.total_pairs} 组配对`;
    $('workspace-review-status').textContent=status.complete?'已完成本批人工 GSB':status.saved_pairs?`进行中 · ${status.saved_pairs} 组已保存`:'待开始 · 选择四档 GSB 并记录备注';
    $('workspace-report-status').textContent=status.report_ready?'阶段统计与结论草稿已生成':'第一组保存后自动生成';
    $('workspace-draft-status').hidden=!changed;
    const models=$('workspace-models');models.replaceChildren();
    for(const id of new Set(catalog.pairs.flatMap(p=>[p.left.model,p.right.model])))models.append(text('span',catalog.model_names?.[id]||id));
    const sources=$('workspace-sources');sources.replaceChildren();
    const distinct=new Map(catalog.pairs.filter(p=>p.source?.url).map(p=>[p.source.url,p.source.repository||'查看来源']));
    for(const [url,name] of distinct){const link=text('a',name);link.href=url;link.target='_blank';link.rel='noopener noreferrer';sources.append(link);}
  }};
}
