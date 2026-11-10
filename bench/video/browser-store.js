import {CHOICES} from './label-data.js';

export function createBrowserLabelClient({catalog,storage=globalThis.localStorage,key='morgan-video-gsb-web-store-v1'}){
  const read=()=>{
    const raw=storage.getItem(key),state=raw?JSON.parse(raw):{schema:'morgan-gsb-browser-store-v1',labels:{},deleted_contexts:{},revision:0};
    if(state.schema!=='morgan-gsb-browser-store-v1'||!state.labels||Array.isArray(state.labels))throw Error('浏览器标注存储格式异常，请先导出已有记录。');
    return {...state,deleted_contexts:state.deleted_contexts||{},storage_mode:'browser-local'};
  };
  const canonical=record=>{
    const pair=catalog.pairs.find(p=>p.context_id===record?.context_id&&p.id===record.pair_id);
    if(!pair||!Object.hasOwn(CHOICES,record.choice)||typeof(record.note??'')!=='string'||String(record.note||'').length>2000)throw Error('评分版本或内容不正确，未保存。');
    return {pair_id:pair.id,context_id:pair.context_id,choice:record.choice,note:(record.note||'').trim(),annotated_at:Number.isFinite(Date.parse(record.annotated_at))?record.annotated_at:new Date().toISOString(),stored_at:new Date().toISOString(),ai_reference_seen:record.ai_reference_seen===true,model_identity_seen:record.model_identity_seen===true,reviewer:'browser-human'};
  };
  const write=state=>{
    const serialized=JSON.stringify({...state,revision:(state.revision||0)+1});
    try{storage.setItem(key,serialized);if(storage.getItem(key)!==serialized)throw Error('未读回本次记录');}
    catch{throw Error('浏览器保存失败；当前选择已保留，请导出备份并检查浏览器存储。');}
    return read();
  };
  return {async request(route,method='GET',body){
    const state=read();
    if(route==='/api/labels'&&method==='GET')return state;
    if(route==='/api/labels'&&method==='POST'){const record=canonical(body?.record);state.labels[record.context_id]=record;delete state.deleted_contexts[record.context_id];return write(state);}
    if(route==='/api/labels/import'&&method==='POST'){
      let imported=0,conflicts=0,invalid_count=0;
      if(!body?.labels||Array.isArray(body.labels)||typeof body.labels!=='object')throw Error('导入记录格式不正确。');
      for(const input of Object.values(body.labels)){
        let record;try{record=canonical(input);}catch{invalid_count++;continue;}
        const existing=state.labels[record.context_id];
        if(existing){if(existing.choice!==record.choice||existing.note!==record.note)conflicts++;continue;}
        if(state.deleted_contexts[record.context_id]){conflicts++;continue;}
        state.labels[record.context_id]=record;imported++;
      }
      return {...(imported?write(state):state),imported,conflicts,invalid_count};
    }
    if(route.startsWith('/api/labels/')&&method==='DELETE'){
      const context=decodeURIComponent(route.slice('/api/labels/'.length));
      if(!catalog.pairs.some(p=>p.context_id===context))throw Error('本题版本不存在。');
      delete state.labels[context];state.deleted_contexts[context]=new Date().toISOString();return write(state);
    }
    throw Error('网页端暂不支持此操作。');
  }};
}
