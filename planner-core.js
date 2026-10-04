/* Pure planning calculations, shared by the app and regression tests. */
(function(root){
  'use strict';
  const coordinates=p=>p && p.lat!==null && p.lon!==null && p.lat!=='' && p.lon!=='' && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)) && Math.abs(Number(p.lat))<=90 && Math.abs(Number(p.lon))<=180;
  function km(a,b){if(!coordinates(a)||!coordinates(b))return null;const r=Math.PI/180,h=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));}
  const minutes=s=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s||'')?Number(s.slice(0,2))*60+Number(s.slice(3)):null;
  const clock=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  const duration=p=>Math.max(15,Number(p.duration)||(['food','cafe'].includes(p.category)?60:90));
  const main=(x,date)=>x.places.filter(p=>p.date===date&&p.listId!=='extra').sort((a,b)=>(a.order||0)-(b.order||0));
  function transfer(a,b,mode='walking'){const d=km(a,b);return d===null?20:Math.max(10,Math.ceil(d*1.3/(mode==='walking'?4:mode==='transit'?16:23)*60)+(mode==='walking'?0:10));}
  function audit(x,date,mode='walking'){
    const list=main(x,date),warnings=[];let visit=0,travel=0,unknown=0,previous=x.hotel;
    list.forEach((p,i)=>{visit+=duration(p);if(!coordinates(p))unknown++;if(previous)travel+=transfer(previous,p,mode);const next=list[i+1],start=minutes(p.time),end=next&&minutes(next.time);if(next&&start!==null&&end!==null&&start+duration(p)+transfer(p,next,mode)>end)warnings.push({type:'overlap',name:p.name,next:next.name});previous=p;});
    if(visit+travel>540||list.length>7)warnings.push({type:'busy'});
    if(unknown)warnings.push({type:'coordinates',count:unknown});
    return {list,visit,travel,unknown,warnings,visited:list.filter(p=>p.visited).length};
  }
  function schedule(list,{start='10:00',buffer=15,mode='walking',keep=true}={}){
    let cursor=minutes(start);if(cursor===null)throw Error('Invalid start time');let out=[];
    list.forEach((p,i)=>{const fixed=keep?minutes(p.time):null,time=fixed===null?cursor:fixed;if(time>1439||time+duration(p)>1440)throw Error('DAY_OVERFLOW');out.push({id:p.id,time:clock(time)});cursor=time+duration(p)+(list[i+1]?transfer(p,list[i+1],mode)+Math.max(0,Number(buffer)||0):0);});return out;
  }
  function nearest(list,hotel){let left=list.slice(),ordered=[],from=coordinates(hotel)?hotel:left[0];while(left.length){let index=left.reduce((best,p,i)=>(km(from,p)??Infinity)<(km(from,left[best])??Infinity)?i:best,0);from=left.splice(index,1)[0];ordered.push(from);}return ordered;}
  function normalize(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ı/g,'i');}
  function filter(list,{query='',category='',date='',status=''}={}){const q=normalize(query);return list.filter(p=>(!q||normalize([p.name,p.address,p.note].join(' ')).includes(q))&&(!category||p.category===category)&&(!date||(date==='undated'?!p.date:p.date===date))&&(!status||(status==='visited'?p.visited:status==='pending'?!p.visited:status==='extra'?p.listId==='extra':p.listId!=='extra')));}
  const api={coordinates,km,minutes,clock,duration,main,transfer,audit,schedule,nearest,filter};if(typeof module!=='undefined')module.exports=api;else root.PlannerCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
