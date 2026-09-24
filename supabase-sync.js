(function(){
'use strict';
const SUPABASE_URL='https://cojwzycignqpowcdtyjb.supabase.co';
const SUPABASE_KEY=[window.__k1,window.__k2,window.__k3,window.__k4,window.__k5,window.__k6,window.__k7].join('');
const AUTH_REDIRECT='https://takahashinikkei.github.io/consulta-fipe/';
if((location.hostname==='localhost'||location.hostname==='127.0.0.1')&&location.hash.includes('access_token=')){location.replace(AUTH_REDIRECT+location.hash);return;}
let sb=null,user=null,syncing=false,ready=false;
const originalSet=localStorage.setItem.bind(localStorage),originalRemove=localStorage.removeItem.bind(localStorage);
const esc2=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const keyStatus=k=>k==='fipeFavorites'?'stock':k==='fipeNegotiations'?'progress':k==='fipeSold'?'sold':null;
function vehiclePayload(x,status){
 return {id:x.id||crypto.randomUUID(),status,type:x.type||'cars',title:x.title||'Veículo',brand:x.brand||null,model:x.model||null,
 year:x.year!=null?String(x.year):null,fuel:x.fuel||null,code:x.code||null,price:x.price||null,price_value:x.priceValue!=null?Number(x.priceValue)||null:null,
 reference_code:x.referenceCode||x.refCode||null,plate:x.plate||null,km:x.km!==''&&x.km!=null?Number(x.km)||0:null,color:x.color||null,pc:x.pc||null,
 purchase_date:x.purchaseDate||null,purchase_value:x.purchaseValue!==''&&x.purchaseValue!=null?Number(x.purchaseValue)||0:null,
 entry_value:x.entryValue!==''&&x.entryValue!=null?Number(x.entryValue)||0:null,sale_date:x.saleDate||null,
 sale_value:x.saleValue!==''&&x.saleValue!=null?Number(x.saleValue)||0:null,extra_cost:Number(x.extraCost)||0,
 documentation_cost:Number(x.documentationCost)||0,maintenance_cost:Number(x.maintenanceCost)||0,details_open:!!x.detailsOpen,
 retoque:x.retoque==null?null:!!x.retoque,retoque_observacao:x.retoqueObservacao||null,observacoes:x.observacoes||null,
 created_by:x.created_by||user?.id||null,updated_by:user?.id||null};
}
function vehicleFromRow(r){
 return {...r,id:r.id,type:r.type,title:r.title,brand:r.brand||'',model:r.model||'',year:r.year||'',fuel:r.fuel||'',code:r.code||'',price:r.price||'',
 priceValue:r.price_value,referenceCode:r.reference_code||'',plate:r.plate||'',km:r.km,color:r.color||'',pc:r.pc||'',purchaseDate:r.purchase_date||'',
 purchaseValue:r.purchase_value,entryValue:r.entry_value,saleDate:r.sale_date||'',saleValue:r.sale_value,extraCost:r.extra_cost||0,
 documentationCost:r.documentation_cost||0,maintenanceCost:r.maintenance_cost||0,detailsOpen:!!r.details_open,retoque:r.retoque,
 retoqueObservacao:r.retoque_observacao||'',observacoes:r.observacoes||''};
}
function replaceCache(k,items){syncing=true;try{originalSet(k,JSON.stringify(items));}finally{syncing=false;}}
async function loadVehicles(){
 if(!sb||!user)return;
 const {data,error}=await sb.from('vehicles').select('*').order('created_at',{ascending:false});
 if(error){console.warn('Supabase vehicles:',error.message);return;}
 replaceCache('fipeFavorites',data.filter(x=>x.status==='stock').map(vehicleFromRow));
 replaceCache('fipeNegotiations',data.filter(x=>x.status==='progress').map(vehicleFromRow));
 replaceCache('fipeSold',data.filter(x=>x.status==='sold').map(vehicleFromRow));
 if(typeof renderFavorites==='function')renderFavorites();
 if(typeof renderNegotiations==='function')renderNegotiations();
 if(typeof renderSold==='function')renderSold();
 if(typeof renderStock==='function'&&document.getElementById('stockPage')?.style.display!=='none')renderStock();
 if(typeof updateFavoriteButton==='function')updateFavoriteButton();
 return data;
}
async function syncVehicles(key,next,prev){
 if(!sb||!user||syncing)return;
 const status=keyStatus(key);if(!status)return;
 let old=[];try{old=JSON.parse(prev||'[]')}catch{}
 const rows=next.map(x=>vehiclePayload(x,status));
 const ids=new Set(rows.map(x=>x.id));
 for(const row of rows){const {error}=await sb.from('vehicles').upsert(row,{onConflict:'id'});if(error){console.warn('Supabase save vehicle:',error.message);return;}}
 const removed=old.map(x=>x.id).filter(Boolean).filter(id=>!ids.has(id));
 if(removed.length){const {error}=await sb.from('vehicles').delete().in('id',removed).eq('status',status);if(error)console.warn('Supabase delete vehicle:',error.message);}
}
async function migrateLegacy(){
 if(!sb||!user)return;
 const legacy=[['fipeFavorites','stock'],['fipeNegotiations','progress'],['fipeSold','sold']];
 const {data:existing}=await sb.from('vehicles').select('id').limit(1);
 if(!existing?.length){
  for(const [k,status] of legacy){let arr=[];try{arr=JSON.parse(localStorage.getItem(k)||'[]')}catch{}if(arr.length)await syncVehicles(k,arr,'[]');}
 }
 const {data:h}=await sb.from('consult_history').select('id').limit(1);
 if(!h?.length){let arr=[];try{arr=JSON.parse(localStorage.getItem('fipeConsults')||'[]')}catch{}for(const x of arr.slice(0,30).reverse())await syncConsultHistory(x);}
}
async function loadHistory(){
 if(!sb||!user)return;
 const {data,error}=await sb.from('consult_history').select('*').order('consulted_at',{ascending:false}).limit(30);
 if(error){console.warn('Supabase history:',error.message);return;}
 replaceCache('fipeConsults',data.map(x=>({...x,type:x.type,title:x.title,brand:x.brand||'',model:x.model||'',year:x.year||'',fuel:x.fuel||'',code:x.code||'',price:x.price||'',priceValue:x.price_value,referenceCode:x.reference_code,ref:x.reference_code,at:x.consulted_at})));
 if(typeof renderConsults==='function')renderConsults();
}
async function syncConsultHistory(item){
 if(!sb||!user||syncing||!item)return;
 const x=item;
 const {error}=await sb.from('consult_history').insert({user_id:user.id,type:x.type||'cars',title:x.title||'Veículo',brand:x.brand||null,model:x.model||null,
 year:x.year!=null?String(x.year):null,fuel:x.fuel||null,code:x.code||null,price:x.price||null,price_value:x.priceValue!=null?Number(x.priceValue)||null:null,
 reference_code:x.referenceCode||x.refCode||x.ref||null,consulted_at:x.at||new Date().toISOString()});
 if(error)console.warn('Supabase history save:',error.message);
}
function patchStorage(){
 localStorage.setItem=function(k,v){
  const prev=localStorage.getItem(k);originalSet(k,v);
  if(syncing||!ready)return;
  if(['fipeFavorites','fipeNegotiations','fipeSold'].includes(k)){
   let next=[];try{next=JSON.parse(v||'[]')}catch{return}
   next=next.map(x=>({...x,id:x.id||crypto.randomUUID()}));
   syncing=true;try{originalSet(k,JSON.stringify(next));}finally{syncing=false}
   syncVehicles(k,next,prev);
  }else if(k==='fipeConsults'){let h=[];try{h=JSON.parse(v||'[]')}catch{return}syncConsultHistory(h[0]);}
 };
 localStorage.removeItem=function(k){
  const prev=localStorage.getItem(k);originalRemove(k);
  if(syncing||!ready)return;
  if(['fipeFavorites','fipeNegotiations','fipeSold'].includes(k)){
   const ids=(()=>{try{return JSON.parse(prev||'[]').map(x=>x.id).filter(Boolean)}catch{return[]}})();
   if(ids.length)sb.from('vehicles').delete().in('id',ids).eq('status',keyStatus(k));
  }
  if(k==='fipeConsults')sb.from('consult_history').delete().eq('user_id',user.id);
 };
}
function showAuth(){
 if(document.getElementById('sbAuth'))return;
 const s=document.createElement('style');s.textContent='#sbAuth{position:fixed;inset:0;background:rgba(248,250,252,.98);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit}#sbAuth .box{width:min(430px,100%);background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:24px;box-shadow:0 15px 50px #0002}#sbAuth h2{margin:0 0 6px}#sbAuth p{margin:0 0 18px;color:#64748b}#sbAuth label{display:block;margin:10px 0 5px;font-weight:700;font-size:13px}#sbAuth input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:10px;font-size:16px}#sbAuth button{width:100%;margin-top:14px;padding:12px;border:0;border-radius:10px;font-weight:800;cursor:pointer;background:#111827;color:#fff}#sbAuth .secondary{background:#eef2f7;color:#111827}#sbAuth .msg{margin-top:12px;font-size:14px;color:#475569}#sbUser{position:fixed;right:14px;top:10px;z-index:99998;background:#fff;border:1px solid #d8dee8;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:700;box-shadow:0 3px 14px #0002;display:flex;align-items:center;gap:10px;color:#1f2937}#sbUser .sbUserName{white-space:nowrap}#sbUser button{border:0;border-radius:8px;background:#111827;color:#fff;padding:6px 10px;font-weight:800;cursor:pointer}';document.head.appendChild(s);
 const d=document.createElement('div');d.id='sbAuth';d.innerHTML='<div class="box"><h2>🔐 Acesso à Garagem 26</h2><p>Entre para acessar o estoque compartilhado.</p><label>E-mail</label><input id="sbEmail" type="email" autocomplete="username email" placeholder="seu@email.com"><label>Senha</label><input id="sbPassword" type="password" autocomplete="current-password" placeholder="Sua senha"><label id="sbUsernameLabel">Nome de usuário (somente no cadastro)</label><input id="sbUsername" type="text" autocomplete="username" placeholder="Seu nome"><button id="sbLogin">Entrar</button><button id="sbSignup" class="secondary">Cadastrar usuário</button><div class="msg" id="sbMsg"></div></div>';document.body.appendChild(d);
 const msg=t=>document.getElementById('sbMsg').textContent=t;
 document.getElementById('sbLogin').onclick=async()=>{
  const email=document.getElementById('sbEmail').value.trim(),password=document.getElementById('sbPassword').value;
  if(!email||!password)return msg('Informe e-mail e senha.');
  msg('Entrando...');
  const {error}=await sb.auth.signInWithPassword({email,password});
  msg(error?error.message:'');
 };
 document.getElementById('sbSignup').onclick=async()=>{
  const email=document.getElementById('sbEmail').value.trim(),password=document.getElementById('sbPassword').value,username=document.getElementById('sbUsername').value.trim();
  if(!email||!password||!username)return msg('Informe e-mail, senha e nome de usuário.');
  if(password.length<6)return msg('A senha deve ter pelo menos 6 caracteres.');
  msg('Criando cadastro...');
  const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:AUTH_REDIRECT,data:{username}}});
  if(error)return msg(error.message);
  if(data?.session)return msg('Cadastro criado. Entrando...');
  document.getElementById('sbUsernameLabel')?.remove();
  document.getElementById('sbUsername')?.remove();
  document.getElementById('sbSignup')?.remove();
  const loginBtn=document.getElementById('sbLogin');
  if(loginBtn)loginBtn.textContent='Entrar';
  document.getElementById('sbEmail')?.focus();
  msg('Cadastro criado. Agora entre com seu e-mail e senha.');
 };
}
function hideAuth(){document.getElementById('sbAuth')?.remove();}
function userBar(){if(!user)return;let b=document.getElementById('sbUser');if(!b){b=document.createElement('div');b.id='sbUser';document.body.appendChild(b)}b.innerHTML='<span class="sbUserName">👤 '+esc2(user.user_metadata?.username||user.email||'Usuário')+'</span>';}
async function init(){
 document.documentElement.classList.add('auth-pending');
 if(!window.supabase?.createClient){console.error('Supabase JS não carregado');document.documentElement.classList.remove('auth-pending');return;}
 sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 patchStorage();showAuth();
 sb.auth.onAuthStateChange(async(event,session)=>{
  user=session?.user||null;
  if(user){ready=false;hideAuth();userBar();await migrateLegacy();await loadVehicles();await loadHistory();ready=true;document.documentElement.classList.remove('auth-pending');
   sb.channel('vehicles-live').on('postgres_changes',{event:'*',schema:'public',table:'vehicles'},()=>{clearTimeout(window.__sbRefresh);window.__sbRefresh=setTimeout(loadVehicles,250)}).subscribe();
  }else{ready=false;document.getElementById('sbUser')?.remove();showAuth();document.documentElement.classList.remove('auth-pending');}
 });
 const {data}=await sb.auth.getSession();
 if(!data.session){
   showAuth();
   document.documentElement.classList.remove('auth-pending');
 }
}
window.addEventListener('load',init);
})();