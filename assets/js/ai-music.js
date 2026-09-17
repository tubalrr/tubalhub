const $=id=>document.getElementById(id);
document.querySelectorAll('.quick button').forEach(b=>b.onclick=()=>$('#prompt').value=b.dataset.prompt);
$('#generate').onclick=async()=>{
  const ENDPOINT='';
  if(!ENDPOINT){$('#status').textContent='The generator interface is ready. A secure AI backend/API connection is required for real generation.';$('#state').textContent='BACKEND';return;}
  const btn=$('#generate');btn.disabled=true;$('#state').textContent='GENERATING';
  try{
    const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:$('#prompt').value,mood:$('#mood').value,duration:Number($('#duration').value),vocals:$('#vocals').value})});
    if(!r.ok)throw Error('Generation request failed.');
    const d=await r.json();if(!d.audioUrl)throw Error('No audio URL returned.');
    $('#player').src=d.audioUrl;$('#player').hidden=false;$('#download').href=d.audioUrl;$('#download').hidden=false;$('#state').textContent='READY';$('#status').textContent='Music generated successfully.';
  }catch(e){$('#state').textContent='ERROR';$('#status').textContent=e.message;}finally{btn.disabled=false;}
};
