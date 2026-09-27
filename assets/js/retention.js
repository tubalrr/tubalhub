const KEY="tubalhub_saved_content_v1218";
const MAX=150;

function read(){
  try{
    const v=JSON.parse(localStorage.getItem(KEY)||"[]");
    return Array.isArray(v)?v:[];
  }catch(_){return []}
}
function write(rows){
  try{localStorage.setItem(KEY,JSON.stringify(rows.slice(0,MAX)));return true}catch(_){return false}
}
export function getSavedItems(){return read()}
export function isSaved(id){return !!id&&read().some(x=>x.id===id)}
export function saveItem(item){
  if(!item?.id)return false;
  const rows=read().filter(x=>x.id!==item.id);
  rows.unshift({...item,savedAt:Date.now()});
  write(rows);
  return true;
}
export function removeSaved(id){
  if(!id)return false;
  write(read().filter(x=>x.id!==id));
  return true;
}
export function toggleSavedItem(item){
  if(!item?.id)return false;
  if(isSaved(item.id)){removeSaved(item.id);return false}
  saveItem(item);return true;
}
export function sharedUrl(id){
  const u=new URL(location.href);
  u.search="";
  u.hash="";
  u.searchParams.set("id",id);
  return u.href;
}
export function openSavedProfile(){
  location.href=new URL("profiles.html#saved",location.href).href;
}
