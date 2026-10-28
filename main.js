(function(){
var dbg=[], q='', mode='home', player=null, apiReady=false, apiFailed=false, cands=[], ci=0, readyTimer=null, barTimer=null;
var $=function(id){return document.getElementById(id);};
function status(t){$('status').innerHTML=t||'';}
function render(){ $('q').textContent=q; }

// Turkish Q mapping from physical keys (US layout keyCodes)
var MAP={186:'ş',222:'i',219:'ğ',221:'ü',188:'ö',190:'ç',191:'.',220:',',187:'-',189:'*'};
var TR='çğıöşüÇĞİÖŞÜ', LOW={'Ç':'ç','Ğ':'ğ','I':'ı','İ':'i','Ö':'ö','Ş':'ş','Ü':'ü'};
function charFor(e){
  var k=e.key||'';
  if(k.length===1 && TR.indexOf(k)>=0) return LOW[k]||k;
  var c=e.keyCode;
  if(MAP[c]) return MAP[c];
  if(c===73) return 'ı';
  if(c>=65&&c<=90) return String.fromCharCode(c+32);
  if(c>=48&&c<=57&&!e.shiftKey) return String.fromCharCode(c);
  if(c>=96&&c<=105) return String.fromCharCode(c-48);
  if(c===32) return ' ';
  return '';
}

// YouTube IFrame API
window.onYouTubeIframeAPIReady=function(){apiReady=true;};
var s=document.createElement('script'); s.src='https://www.youtube.com/iframe_api';
s.onerror=function(){apiFailed=true;}; document.body.appendChild(s);

function search(){
  var text=q.replace(/\s+/g,' ').trim(); if(!text) return;
  if(text.replace(/ı/g,'i')==='maxgiris'||text==='maxhesap'){ status('Giriş sayfası açılıyor…'); location.href=LOGIN; return; }
  if(!API_KEY||API_KEY.indexOf('BURAYA')===0){status('API anahtarı girilmemiş.');return;}
  status('Aranıyor…'); mode='busy';
  var url='https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=6'
    +'&safeSearch=strict&videoEmbeddable=true&regionCode=TR&relevanceLanguage=tr'
    +'&q='+encodeURIComponent(text+' karaoke')+'&key='+API_KEY;
  var x=new XMLHttpRequest(); x.open('GET',url); x.timeout=10000;
  x.onload=function(){
    mode='home';
    try{var d=JSON.parse(x.responseText);}catch(e){status('Arama hatası.');return;}
    if(d.error){status('Arama hatası: '+(d.error.message||d.error.code));return;}
    cands=(d.items||[]).map(function(i){return {id:i.id.videoId,t:i.snippet.title};});
    if(!cands.length){status('Şarkı bulunamadı, başka şekilde yazmayı dene.');return;}
    ci=0; play();
  };
  x.onerror=x.ontimeout=function(){mode='home';status('İnternet bağlantısı yok, tekrar dene.');};
  x.send();
}

function noCC(p){try{p.unloadModule('captions');p.unloadModule('cc');}catch(e){}}
// keep keyboard focus on our page even after clicking inside the player (e.g. Skip Ad)
setInterval(function(){var a=document.activeElement;if(a&&a.tagName==='IFRAME'){a.blur();window.focus();}},500);
function decode(t){var a=document.createElement('textarea');a.innerHTML=t;return a.value;}
function showBar(){var b=$('bar');b.style.opacity=1;clearTimeout(barTimer);barTimer=setTimeout(function(){b.style.opacity=0;},5000);}

function play(){
  var c=cands[ci]; if(!c){home();status('Bu şarkı açılamadı, başka şekilde yazmayı dene.');return;}
  if(apiFailed){status('Oynatıcı yüklenemedi, sayfa yenileniyor…');setTimeout(function(){location.reload();},3000);return;}
  if(!apiReady){status('Oynatıcı hazırlanıyor…');setTimeout(play,1000);return;}
  status(''); mode='play';
  $('home').style.display='none'; $('playerWrap').style.display='block';
  $('nowt').textContent='♪ '+decode(c.t); showBar();
  if(player){ try{player.destroy();}catch(e){} player=null; }
  if(!$('player')){var d=document.createElement('div');d.id='player';$('playerWrap').insertBefore(d,$('shield'));}
  clearTimeout(readyTimer);
  dbg=[];
  player=new YT.Player('player',{width:'100%',height:'100%',videoId:c.id,
    playerVars:{cc_load_policy:0,autoplay:1,controls:0,rel:0,modestbranding:1,iv_load_policy:3,fs:0,disablekb:1,playsinline:1},
    events:{
      onReady:function(e){dbg.push('ready');noCC(e.target);applyVol();e.target.playVideo();},
      onStateChange:function(e){
        dbg.push('st'+e.data); if(e.data===1){clearTimeout(readyTimer);noCC(e.target);}
        if(e.data===0) home();
      },
      onError:function(e){
        dbg.push('err'+e.data); clearTimeout(readyTimer);
        ci++; play();
      }}});
}


function home(){
  clearTimeout(readyTimer);
  if(player){try{player.destroy();}catch(e){} player=null;}
  if(!$('player')){var d=document.createElement('div');d.id='player';$('playerWrap').insertBefore(d,$('shield'));}
  $('playerWrap').style.display='none'; $('home').style.display='block';
  q=''; render(); status(''); mode='home';
}

var vol=80, muted=false, volTimer=null;
try{ var sv=parseInt(localStorage.getItem('vol'),10); if(sv>=0&&sv<=100) vol=sv; }catch(e){}
function applyVol(){ if(player&&player.setVolume){ try{ player.setVolume(vol); muted?player.mute():player.unMute(); }catch(e){} } }
function showVol(){
  var v=$('vol'); v.innerHTML=(muted||vol===0?'🔇 Sessiz':'🔊 '+vol); v.style.opacity=1;
  clearTimeout(volTimer); volTimer=setTimeout(function(){v.style.opacity=0;},1500);
}
function volKey(e){
  var k=e.key||'', c=e.keyCode;
  if(c===175||k==='AudioVolumeUp'||k==='VolumeUp'){ muted=false; vol=Math.min(100,vol+10); }
  else if(c===174||k==='AudioVolumeDown'||k==='VolumeDown'){ muted=false; vol=Math.max(0,vol-10); }
  else if(c===173||k==='AudioVolumeMute'||k==='VolumeMute'){ muted=!muted; }
  else return false;
  try{ localStorage.setItem('vol',vol); }catch(err){}
  applyVol(); showVol(); return true;
}
var LOGIN='https://accounts.google.com/ServiceLogin?service=youtube&hl=tr&continue='+encodeURIComponent('https://www.youtube.com/signin?action_handle_signin=true&app=desktop&next=%2F');
document.addEventListener('keydown',function(e){
  var c=e.keyCode;
  if(e.ctrlKey&&e.altKey&&c===71){ e.preventDefault(); location.href=LOGIN; return; }
  if(volKey(e)){ e.preventDefault(); return; }
  if(mode==='play'){
    showBar();
    if(c===27||c===10009||c===8){home();}
    else if(c===32||c===13){ if(player&&player.getPlayerState){ player.getPlayerState()===1?player.pauseVideo():player.playVideo(); } }
    else if(c===37&&player){player.seekTo(Math.max(0,player.getCurrentTime()-10),true);}
    else if(c===39&&player){player.seekTo(player.getCurrentTime()+10,true);}
    e.preventDefault(); return;
  }
  if(mode!=='home'){e.preventDefault();return;}
  if(c===8){q=q.slice(0,-1);}
  else if(c===27||c===46){q='';}
  else if(c===13){search();}
  else { var ch=charFor(e); if(ch && q.length<60) q+=ch; }
  render(); if(c!==13) status(''); e.preventDefault();
},true);
document.addEventListener('mousemove',function(){ if(mode==='play') showBar(); });
render();
})();
