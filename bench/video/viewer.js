import {CHOICES,validateCatalog,parseSaved,currentLabels,exportLabels,resumeIndex,persistLabelAndPlanNext,selectCatalogBatch,referenceImageURL} from './label-data.js?v=20261110-system1';
import {createBrowserLabelClient} from './browser-store.js?v=20261110-system1';
import {createReportView} from './report-view.js?v=20261110-system1';
import {createWorkspaceView} from './workspace-view.js?v=20261110-system1';

const $=id=>document.getElementById(id);
const videos=[$('left-video'),$('right-video')];
const browserMode=document.body.dataset.storage==='browser';
const storageKey=browserMode?'morgan-video-gsb-web-cache-v1':'morgan-video-gsb-link-labels-v2';
const storageTarget=browserMode?'当前浏览器':'本机文件';
let browserClient,activePage='workspace';
const exposureKey=storageKey+'-exposure';
const draftKey=storageKey+'-drafts';
const backupKey=storageKey+'-before-file-storage';
const migrationKey=storageKey+'-file-storage-migrated';
let catalog,allCatalog,rules,index=0,selected=null,changed=false,failed=false,playToken=0,referenceToken=0,referenceReady=true;
let saved={},browserSaved={},exposure={},drafts={},legacyBackup={},storageReady=false,busy=false,lastSavedContext=null,dismissedComplete=false;
let rawBrowserCache=null,cacheCanReplace=true;
const reportView=createReportView({root:$('report'),onReview:context=>{const next=catalog.pairs.findIndex(p=>p.context_id===context);if(next>=0&&go(next))navigate('review');},download:(value,name,type)=>downloadRaw(value,name,type),notify:value=>confirmation(value)});
const workspaceView=createWorkspaceView({root:$('workspace')});
$('storage-note').textContent=browserMode?'网页评分保存在当前浏览器，刷新后可续评；不同设备或浏览器不自动同步。请定期导出评分 JSON 备份，也可导入本地工作台的评分查看统计。本页不向 GitHub 自动提交评分，不下载视频。':'评分写入本机文件，刷新后可续评；可导出 JSON 后在个站导入继续查看统计。视频直接从来源网站缓冲，不另存项目文件。';
function readCache(key){try{return localStorage.getItem(key);}catch{return null;}}
function writeCache(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function parseCache(key){try{return parseSaved(readCache(key));}catch{return {};}}
rawBrowserCache=readCache(storageKey);
try{browserSaved=parseSaved(rawBrowserCache);}catch{browserSaved={};}
exposure=parseCache(exposureKey);drafts=parseCache(draftKey);
// Keep an untouched copy before migrating any browser records into the file store.
if(rawBrowserCache){
  try{if(!localStorage.getItem(backupKey))localStorage.setItem(backupKey,rawBrowserCache);legacyBackup=parseSaved(localStorage.getItem(backupKey));}
  catch{cacheCanReplace=false;}
}

const pair=()=>catalog.pairs[index];
const text=(tag,value,css)=>{const node=document.createElement(tag);node.textContent=value;if(css)node.className=css;return node;};
function message(value,error=false){$('message').textContent=value;$('message').classList.toggle('error',error);}
function confirmation(value,error=false){$('save-confirmation').textContent=value;$('save-confirmation').classList.toggle('error',error);}
function pauseMedia(){videos.forEach(v=>v.pause());}
function showPage(){
  const requested=location.hash.slice(1),next=['workspace','review','report'].includes(requested)?requested:'workspace';
  if(next!=='review'){playToken++;pauseMedia();}
  activePage=next;document.body.dataset.page=next;
  document.querySelectorAll('main > section[data-page]').forEach(el=>el.hidden=el.dataset.page!==next);
  document.querySelectorAll('[data-route]').forEach(el=>{if(el.dataset.route===next)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  window.scrollTo({top:0,behavior:'instant'});
}
function navigate(page){if(location.hash==='#'+page)showPage();else location.hash=page;}
window.addEventListener('hashchange',showPage);showPage();
function hasCurrentVote(){return currentLabels(catalog,saved).some(v=>v.context_id===pair().context_id);}
function canSave(){return storageReady&&!busy&&!failed&&referenceReady&&Boolean(selected)&&(hasCurrentVote()||videos.every(v=>v.readyState>=2));}
function refreshButtons(){
  if(!catalog)return;
  for(const id of ['play','pause','restart'])$(id).disabled=busy;
  $('save').disabled=!canSave();
  const allOtherDone=catalog.pairs.every(p=>p.context_id===pair().context_id||currentLabels(catalog,saved).some(v=>v.context_id===p.context_id));
  $('save').textContent=busy?'正在保存…':allOtherDone?'保存并查看统计':'保存并下一组';
  $('undo').disabled=busy||!storageReady||!hasCurrentVote();
  $('previous').disabled=busy||index===0;$('next').disabled=busy||index===catalog.pairs.length-1;
  $('pair-select').disabled=busy;
  $('batch-select').disabled=busy;
  $('reason').disabled=busy;
  $('import-labels').disabled=busy||!storageReady;
  $('backup-all').disabled=busy||changed||!storageReady;
  $('workspace-resume').disabled=busy||!storageReady;
  $('export').disabled=busy||changed||!storageReady;
  for(const id of ['download-report','download-brief'])$(id).disabled=busy||changed||!storageReady||!currentLabels(catalog,saved).length;
  $('review-last').disabled=busy||!lastSavedContext;
  document.querySelectorAll('[data-choice]').forEach(b=>b.disabled=busy);
}
function select(choice){selected=choice;document.querySelectorAll('[data-choice]').forEach(b=>{const active=b.dataset.choice===choice;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});refreshButtons();}
function summary(){
  const votes=currentLabels(catalog,saved);
  const counts=Object.entries(CHOICES).map(([value,label])=>`${label} ${votes.filter(v=>v.choice===value).length}`);
  const models=new Set(catalog.pairs.flatMap(p=>[p.left.model,p.right.model]));
  $('catalog-stats').textContent=`${catalog.pairs.length} 组 · ${catalog.pairs.length*2} 段视频 · ${models.size} 种模型`;
  $('summary').textContent=`人工已保存 ${votes.length} / ${catalog.pairs.length} 组`+(votes.length?' · '+counts.join(' · '):'');
  $('save-progress').textContent=storageReady?`已保存至${storageTarget} ${votes.length} / ${catalog.pairs.length} 组`:'保存服务未连接';
  $('completion').hidden=changed||dismissedComplete||votes.length!==catalog.pairs.length;
  $('completion-stats').textContent=`${votes.length} 组标注均已保存至${storageTarget}。${counts.join(' · ')}。`;
  for(const option of $('batch-select').options){
    const batch=allCatalog.batches?.find(b=>b.id===option.value);
    if(batch){const view=selectCatalogBatch(allCatalog,batch.id);option.textContent=`${batch.name} · 已评 ${currentLabels(view,saved).length}/${view.pairs.length}`;}
  }
  reportView.render(catalog,saved);
  workspaceView.render(catalog,saved,{storageReady,browserMode,busy,changed});
  $('report-draft-warning').hidden=!changed;
  $('app-storage-status').textContent=storageReady?(browserMode?'浏览器保存 · 已就绪':'文件保存 · 已连接'):'保存尚未就绪';
  $('app-storage-status').classList.toggle('is-error',!storageReady);
  if(changed||busy||!storageReady)for(const id of ['download-report','download-brief'])$(id).disabled=true;
}
function sourceLink(url,label){const link=text('a',label);link.href=url;link.target='_blank';link.rel='noopener noreferrer';return link;}
function adopt(state){
  saved=parseSaved(JSON.stringify(state.labels));storageReady=true;
  if(cacheCanReplace)writeCache(storageKey,saved);
  $('storage-path').textContent=browserMode?'当前浏览器本地存储 · 请导出评分备份':'data/video-gsb-labels.json';$('storage-path').title=state.file_path||'';
  const latest=currentLabels(catalog,saved).sort((a,b)=>String(b.stored_at||b.annotated_at||'').localeCompare(String(a.stored_at||a.annotated_at||'')))[0];
  lastSavedContext=latest?.context_id||null;
}
function rememberDraft(){
  if(!catalog||busy)return;
  changed=true;drafts[pair().context_id]={choice:selected,note:$('reason').value,updated_at:new Date().toISOString()};writeCache(draftKey,drafts);
  summary();message('当前选择或备注尚未提交，点击保存按钮确认并继续。');
}
function dropDraft(context){delete drafts[context];writeCache(draftKey,drafts);}

async function loadReference(){
  const token=++referenceToken,p=pair(),ref=p.reference;
  $('reference-panel').hidden=!ref;referenceReady=!ref;
  const image=$('reference-image');image.onload=null;image.onerror=null;image.hidden=true;image.removeAttribute('src');$('reference-link').removeAttribute('href');
  $('reference-retry').hidden=true;
  if(!ref){refreshButtons();return;}
  $('reference-status').textContent='正在从来源读取参考图，加载后可保存评分…';
  let timer;
  try{
    const url=referenceImageURL(p);
    if(token!==referenceToken)return;
    await new Promise((resolve,reject)=>{
      image.onload=resolve;image.onerror=()=>reject(Error('参考图未能加载'));
      timer=setTimeout(()=>reject(Error('参考图加载超时')),30000);
      image.src=url;
    });
    if(token!==referenceToken)return;
    image.hidden=false;$('reference-link').href=url;referenceReady=true;
    $('reference-status').textContent='同一实例、固定来源版本；点击图片可放大查看。';
  }catch(error){
    if(token!==referenceToken)return;
    referenceReady=false;$('reference-status').textContent='参考图未就绪，先重试再评分。'+(error.name==='AbortError'?'来源响应超时。':error.message);
    $('reference-retry').hidden=false;
  }finally{clearTimeout(timer);if(token===referenceToken)refreshButtons();}
}
$('reference-retry').addEventListener('click',()=>void loadReference());

function setBatch(id){
  catalog=selectCatalogBatch(allCatalog,id);$('batch-select').value=catalog.batch_id||'';$('batch-note').textContent=catalog.batch_note||'';
  $('pair-select').replaceChildren(...catalog.pairs.map((p,i)=>{const option=text('option',`${p.id} · ${p.title}`);option.value=String(i);return option;}));
  const latestDraft=Object.entries(drafts).filter(([context])=>catalog.pairs.some(p=>p.context_id===context)).sort((a,b)=>String(b[1].updated_at||'').localeCompare(String(a[1].updated_at||'')))[0];
  index=latestDraft?catalog.pairs.findIndex(p=>p.context_id===latestDraft[0]):resumeIndex(catalog,saved);
  lastSavedContext=currentLabels(catalog,saved).sort((a,b)=>String(b.stored_at||b.annotated_at||'').localeCompare(String(a.stored_at||a.annotated_at||'')))[0]?.context_id||null;
  dismissedComplete=false;render();
}
$('batch-select').addEventListener('change',()=>{
  if(busy)return;
  if(changed&&!window.confirm('本题还有未提交草稿，仍要切换题库吗？')){$('batch-select').value=catalog.batch_id;return;}
  const id=$('batch-select').value;writeCache(storageKey+'-active-batch',id);setBatch(id);
  confirmation(`已切换到${catalog.batch_name||'题库'}。本批次已保存 ${currentLabels(catalog,saved).length} 组。`);
});

async function api(route,method='GET',value){
  if(browserMode)return browserClient.request(route,method,value);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(route,{method,cache:'no-store',signal:controller.signal,headers:value===undefined?{}:{'content-type':'application/json'},body:value===undefined?undefined:JSON.stringify(value)});
    let data;try{data=await response.json();}catch{throw Error('当前服务不支持文件保存，请使用新的本地评测服务。');}
    if(!response.ok)throw Error(data.error||'本地保存失败，请重试。');
    return data;
  }catch(error){if(error.name==='AbortError')throw Error('本地保存服务未响应，请重试。');throw error;}
  finally{clearTimeout(timer);}
}

function render(){
  playToken++;pauseMedia();failed=false;changed=false;
  const p=pair();
  $('title').textContent=p.title;$('prompt').textContent=p.prompt_zh.split('\n\n')[0];$('full-chinese-prompt').textContent=p.prompt_zh;$('original-prompt').textContent=p.prompt_original;
  $('chinese-panel').open=false;$('chinese-panel').hidden=!p.prompt_zh.includes('\n\n');
  $('progress').textContent=`${index+1} / ${catalog.pairs.length}`;$('pair-select').value=String(index);
  $('dataset-source').href=p.source.url;$('dataset-source').textContent=`数据来源：Hugging Face · ${p.source.repository}`;
  $('prompt-provenance').textContent=p.prompt_provenance?'同一英文生成提示词、同一起始图 · 模型版本见播放器上方':'同一原始提示词的两个模型输出；具体模型修订版未提供。';
  $('translation-note').textContent=p.prompt_provenance?p.prompt_provenance.note_zh+' 用时、费用及平台均未提供。':'中文为展示译文。原视频使用英文提示词生成，画面要求显示的字面文字保持原样。来源未标明的模型修订版、生成平台、用时和费用不补写。';
  for(const [i,side] of ['left','right'].entries()){
    videos[i].preload='none';videos[i].removeAttribute('src');videos[i].load();$(side+'-info').textContent='待播放';
    $(side+'-model').textContent=catalog.model_names?.[p[side].model]||p[side].model;
  }
  exposure[p.context_id]={...exposure[p.context_id],models:true};writeCache(exposureKey,exposure);
  const vote=currentLabels(catalog,saved).find(v=>v.context_id===p.context_id);
  const draft=drafts[p.context_id];
  select(draft?.choice||vote?.choice||null);$('reason').value=draft?.note??vote?.note??'';changed=Boolean(draft);
  $('ai-panel').open=false;$('ai-panel').hidden=!p.ai_reference;$('source-panel').open=false;document.querySelector('.original').open=false;
  const ai=$('ai-result');ai.replaceChildren();
  if(p.ai_reference)ai.append(text('p',CHOICES[p.ai_reference.choice],'result-choice'),text('p',p.ai_reference.summary),text('p',p.ai_reference.origin,'result-note'));
  else ai.append(text('p','本组尚未进行 AI 评分。当前保存的是你的人工 GSB。'));
  const source=$('source');source.replaceChildren();
  for(const [side,label] of [['left','A · 左侧'],['right','B · 右侧']]){
    const name=catalog.model_names?.[p[side].model]||p[side].model;const row=document.createElement('p');
    row.append(text('strong',`${label}：${name}`),' · ',sourceLink(p[side].url,'打开原视频'));source.append(row);
  }
  source.append(text('p',`${p.source.row_index!=null?'来源 '+(p.source.split||'train')+' 行号 '+p.source.row_index+' · ':''}${p.source.task_id?'任务 '+p.source.task_id+' · ':''}视频按来源固定版本引用。本页不下载或转码视频。`));
  if(p.source.prompt_url)source.append(sourceLink(p.source.prompt_url,'来源英文生成提示词文件'),' · ',sourceLink(p.source.project_url,'原作者项目说明'));
  if(p.source.terms_url)source.append(sourceLink(p.source.terms_url,'来源使用范围：非商业学术研究，重新发布需原作者许可'));
  message(draft?'本题有未提交草稿，确认后点“保存并下一组”。':vote?'已恢复本题标注，可回放复核或修改。':'观看左右视频，选择一档 GSB，然后保存并进入下一组。');
  void loadReference();summary();refreshButtons();
}

async function play(restart=false){
  if(!catalog||busy)return;
  const token=++playToken;const p=pair();failed=false;pauseMedia();
  for(const [i,side] of ['left','right'].entries())if(!videos[i].getAttribute('src')||videos[i].error){videos[i].preload='auto';videos[i].src=p[side].url;videos[i].load();}
  message('正在从来源网站加载左右视频，双方就绪后一起播放…');
  let timer;const cleanups=[];
  const ready=video=>new Promise((resolve,reject)=>{
    const success=()=>{if(!video.seeking&&video.readyState>=3)resolve();};const failure=()=>reject(Error('素材不可用'));
    if(video.error){failure();return;}if(!video.seeking&&video.readyState>=3){resolve();return;}
    video.addEventListener('canplay',success);video.addEventListener('seeked',success);video.addEventListener('error',failure,{once:true});
    cleanups.push(()=>{video.removeEventListener('canplay',success);video.removeEventListener('seeked',success);video.removeEventListener('error',failure);});
  });
  try{
    const prepare=async()=>{
      await Promise.all(videos.map(ready));if(token!==playToken)return;
      const common=restart||videos.some(v=>v.ended)?0:Math.min(...videos.map(v=>v.currentTime));
      videos.forEach(v=>{if(v.ended||Math.abs(v.currentTime-common)>.01)v.currentTime=common;});await Promise.all(videos.map(ready));
    };
    await Promise.race([prepare(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('加载超时')),30000);})]);
    if(token!==playToken)return;await Promise.all(videos.map(v=>v.play()));if(token!==playToken)return;
    message('左右已开始播放。选择 GSB 后点击“保存并下一组”。');
  }catch{
    if(token!==playToken)return;pauseMedia();failed=true;
    message('视频未能同时播放，请重试或核对原视频链接。加载失败不记为“两个都差”。',true);
  }finally{clearTimeout(timer);cleanups.forEach(cleanup=>cleanup());if(token===playToken)refreshButtons();}
}

async function saveAndContinue(){
  if(!canSave())return;
  const savingPair=pair(),savingIndex=index;rememberDraft();busy=true;pauseMedia();refreshButtons();
  confirmation(`正在保存 ${savingPair.id}…`);
  try{
    const result=await persistLabelAndPlanNext({catalog,index:savingIndex,choice:selected,note:$('reason').value,exposure:exposure[savingPair.context_id],persist:record=>api('/api/labels','POST',{record})});
    adopt(result.state);dropDraft(savingPair.context_id);changed=false;busy=false;
    lastSavedContext=savingPair.context_id;dismissedComplete=false;
    if(result.complete){
      summary();refreshButtons();confirmation(`已保存 ${savingPair.id}：${CHOICES[result.record.choice]}。本轮已全部保存。`);
      message('本轮已完成，可查看统计、导出报告或回看修改。');navigate('report');
    }else{
      index=result.nextIndex;render();confirmation(`已保存 ${savingPair.id}：${CHOICES[result.record.choice]} · 已进入下一组 ${pair().id}`);
      if(activePage==='review')void play();
    }
  }catch(error){
    busy=false;changed=true;refreshButtons();confirmation('本次保存未完成，仍停留在当前组。',true);
    message(error.message+' 当前选择已保留，请重试。',true);
  }
}

$('play').addEventListener('click',()=>play());$('restart').addEventListener('click',()=>play(true));
$('pause').addEventListener('click',()=>{playToken++;pauseMedia();message('已同时暂停。');});
function go(nextIndex){
  if(!catalog||busy||nextIndex<0||nextIndex>=catalog.pairs.length)return false;
  if(changed&&nextIndex!==index&&!window.confirm('本题还有未提交草稿，仍要切换吗？')){$('pair-select').value=String(index);return false;}
  index=nextIndex;render();return true;
}
$('workspace-resume').addEventListener('click',()=>{
  if(!catalog||busy)return;
  const next=drafts[pair().context_id]?index:resumeIndex(catalog,saved);
  if(next===index||go(next))navigate('review');
});
$('previous').addEventListener('click',()=>go(index-1));$('next').addEventListener('click',()=>go(index+1));
$('pair-select').addEventListener('change',()=>{const next=Number($('pair-select').value);if(Number.isInteger(next))go(next);});
document.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>{select(b.dataset.choice);rememberDraft();}));
$('reason').addEventListener('input',rememberDraft);$('save').addEventListener('click',saveAndContinue);
$('review-last').addEventListener('click',()=>{const next=catalog.pairs.findIndex(p=>p.context_id===lastSavedContext);if(next>=0)go(next);});
$('undo').addEventListener('click',async()=>{
  if(busy||!hasCurrentVote())return;busy=true;refreshButtons();
  const p=pair();
  try{adopt(await api('/api/labels/'+encodeURIComponent(p.context_id),'DELETE'));dropDraft(p.context_id);busy=false;dismissedComplete=false;render();confirmation(`已从${storageTarget}撤销 ${p.id} 的标注，可以重新判断。`);}
  catch(error){busy=false;refreshButtons();message(error.message,true);}
});

function downloadRaw(value,filename,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([value],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function download(value,filename){downloadRaw(JSON.stringify(value,null,2),filename,'application/json;charset=utf-8');}
async function exportCurrent(){
  if(changed){message('本题还有未提交草稿，请先保存，再导出完整标注。',true);return;}
  try{adopt(await api('/api/labels'));summary();refreshButtons();download(exportLabels(catalog,saved),'Morgan-视频GSB标注.json');confirmation(`已导出 ${currentLabels(catalog,saved).length} 条已保存标注，未包含视频。`);}
  catch(error){message(error.message,true);}
}
$('export').addEventListener('click',exportCurrent);$('export-complete').addEventListener('click',exportCurrent);
$('backup-all').addEventListener('click',async()=>{
  if(!catalog||busy||changed||!storageReady)return;
  try{
    adopt(await api('/api/labels'));summary();refreshButtons();
    const backup=exportLabels({...allCatalog,batch_id:'all',batch_name:'全部评测批次'},saved);
    download(backup,'Morgan-全部批次评分备份.json');
    confirmation(`已导出全部批次的 ${backup.labels.length} 条已保存评分及备注，未包含视频。`);
  }catch(error){confirmation('备份未完成：'+error.message,true);}
});
$('import-labels').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  if(changed||busy){confirmation('请先保存本题草稿，再导入评分。',true);event.target.value='';return;}
  busy=true;refreshButtons();
  try{
    if(file.size>2*1024*1024)throw Error('评分文件不能超过 2MB。');
    const data=JSON.parse(await file.text());
    if(data.schema!=='morgan-video-gsb-labels-v2'||!Array.isArray(data.labels))throw Error('请选择本系统导出的评分 JSON，不能导入题库或 AI 参考票。');
    const labels={};for(const record of data.labels){if(!record?.context_id||labels[record.context_id])throw Error('评分编号缺失或重复，未导入。');labels[record.context_id]=record;}
    const state=await api('/api/labels/import','POST',{labels});adopt(state);busy=false;setBatch(catalog.batch_id);
    confirmation(`已导入 ${state.imported||0} 条；已有不同记录 ${state.conflicts||0} 条、版本不匹配 ${state.invalid_count||0} 条，原记录未覆盖。`);
  }catch(error){busy=false;refreshButtons();confirmation('未完成导入：'+error.message,true);}
  finally{event.target.value='';}
});
$('export-legacy').addEventListener('click',()=>download({schema:'morgan-browser-annotation-backup-v1',labels:legacyBackup},'Morgan-浏览器旧标注备份.json'));
$('continue-review').addEventListener('click',()=>{dismissedComplete=true;summary();message('可通过题目选择框回看并修改，保存后会更新统计。');});
$('ai-panel').addEventListener('toggle',()=>{if(catalog&&$('ai-panel').open){exposure[pair().context_id]={...exposure[pair().context_id],ai:true};writeCache(exposureKey,exposure);}});

let lastSync=0;
function sync(now){
  if(now-lastSync>250){lastSync=now;const [a,b]=videos;
    if(!a.paused&&!b.paused&&!a.ended&&!b.ended&&a.readyState>=3&&b.readyState>=3&&Math.abs(a.currentTime-b.currentTime)>.18)b.currentTime=Math.min(a.currentTime,b.duration||a.currentTime);
  }
  requestAnimationFrame(sync);
}
requestAnimationFrame(sync);
for(const [i,side] of ['left','right'].entries()){
  const video=videos[i];
  video.addEventListener('loadedmetadata',()=>{$(side+'-info').textContent=Number.isFinite(video.duration)?`${video.duration.toFixed(2)} 秒 · 在线视频`:'在线视频';});
  video.addEventListener('loadeddata',refreshButtons);
  video.addEventListener('error',()=>{if(!video.getAttribute('src'))return;failed=true;pauseMedia();$(side+'-info').textContent='链接加载失败';message('素材链接暂不可用。请重试或检查来源链接，本题不计质量判断。',true);refreshButtons();});
}
window.addEventListener('beforeunload',event=>{if(changed||busy){event.preventDefault();event.returnValue='';}});
document.addEventListener('keydown',event=>{
  if(!catalog||activePage!=='review'||busy||event.ctrlKey||event.metaKey||event.altKey)return;
  const editable=event.target.closest('input,textarea,select');
  if(!editable&&['1','2','3','4'].includes(event.key)){event.preventDefault();select(Object.keys(CHOICES)[Number(event.key)-1]);rememberDraft();}
  if(event.key==='Enter'&&(event.target===$('reason')||event.target.closest('.choices')||event.target===document.body)){event.preventDefault();void saveAndContinue();}
});

try{
  const responses=await Promise.all(['catalog.links.json','rules.json'].map(url=>fetch(url,{cache:'no-store'})));
  if(responses.some(r=>!r.ok))throw Error('题库或规则读取失败。');
  allCatalog=validateCatalog(await responses[0].json());rules=await responses[1].json();
  if(browserMode)browserClient=createBrowserLabelClient({catalog:allCatalog});
  let preferred;try{preferred=JSON.parse(readCache(storageKey+'-active-batch'));}catch{}
  const batchId=allCatalog.batches?.some(b=>b.id===preferred)?preferred:allCatalog.default_batch;
  catalog=selectCatalogBatch(allCatalog,batchId);
  $('batch-select').replaceChildren(...(allCatalog.batches||[{id:'',name:'当前题库'}]).map(b=>{const option=text('option',b.name);option.value=b.id;return option;}));
  for(const d of rules.dimensions){const row=document.createElement('div');row.append(text('h3',d.name==='Prompt 遵循'?'提示词遵循':d.name),text('p',d.checks),text('p','常见问题：'+d.common_issues));$('rules').append(row);}
  let migration;
  try{
    let state=await api('/api/labels');
    if(!readCache(migrationKey)&&Object.keys(browserSaved).length){state=await api('/api/labels/import','POST',{labels:browserSaved});migration=state;}
    adopt(state);
    writeCache(migrationKey,true);
    for(const [context,draft] of Object.entries(drafts)){const vote=saved[context];if(vote&&vote.choice===draft.choice&&vote.note===(draft.note||'').trim())dropDraft(context);}
    setBatch(batchId);
    if(migration?.conflicts||migration?.invalid_count){$('export-legacy').hidden=false;confirmation(`已连接本机文件；旧缓存有 ${migration.conflicts||0} 条不同记录、${migration.invalid_count||0} 条旧版本记录，原缓存已保留备份，可导出核对。`,true);}
    else confirmation(migration?.imported?`已迁移 ${migration.imported} 条标注，可继续评测。`:`已从${storageTarget}恢复 ${currentLabels(catalog,saved).length} 条标注。`);
  }catch(error){
    saved=browserSaved;setBatch(batchId);storageReady=false;summary();refreshButtons();
    $('storage-path').textContent=browserMode?'浏览器存储不可用':'保存服务未连接';confirmation(browserMode?'当前浏览器未能读取评分，请检查存储权限；已有缓存保留。':'需要启动本地文件保存服务，当前记录尚未迁移。',true);message(error.message,true);
  }
}catch(error){
  message(error.message,true);confirmation('评测工作台未能初始化：'+error.message,true);
  $('app-storage-status').textContent='工作台未就绪';$('app-storage-status').classList.add('is-error');
  $('workspace-batch').textContent='评测数据未能读取';$('workspace-data-status').textContent='请刷新页面后重试';
  ['play','pause','restart','save','export','backup-all','workspace-resume','import-labels','batch-select','download-report','download-brief'].forEach(id=>$(id).disabled=true);
}
