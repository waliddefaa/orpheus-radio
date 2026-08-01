const stations=[
 {id:'groove',name:'Groove Salad',genre:'Ambient',freq:88.4,desc:'A nicely chilled plate of ambient beats and grooves.',url:'https://ice1.somafm.com/groovesalad-128-mp3',color:'#7b2528',accent:'#d6541b'},
 {id:'drone',name:'Drone Zone',genre:'Ambient',freq:90.1,desc:'Atmospheric textures with minimal beats and maximum space.',url:'https://ice1.somafm.com/dronezone-128-mp3',color:'#201b18',accent:'#a94324'},
 {id:'indie',name:'Indie Pop Rocks!',genre:'Indie',freq:91.7,desc:'New and classic indie pop from artists outside the mainstream.',url:'https://ice1.somafm.com/indiepop-128-mp3',color:'#c34d1d',accent:'#2b1714'},
 {id:'agent',name:'Secret Agent',genre:'Lounge',freq:93.5,desc:'The soundtrack for stylish spies and elegant late nights.',url:'https://ice1.somafm.com/secretagent-128-mp3',color:'#31352d',accent:'#d29a43'},
 {id:'fluid',name:'Fluid',genre:'Hip-Hop',freq:95.2,desc:'Instrumental hip-hop, liquid trap and future soul.',url:'https://ice1.somafm.com/fluid-128-mp3',color:'#8c321d',accent:'#171714'},
 {id:'space',name:'Deep Space One',genre:'Space',freq:96.9,desc:'Deep ambient electronics for drifting beyond the atmosphere.',url:'https://ice1.somafm.com/deepspaceone-128-mp3',color:'#171714',accent:'#b64d1c'},
 {id:'hitradio',name:'Hit Radio Morocco',genre:'Moroccan',freq:98.4,desc:'Moroccan pop, chart hits and youth culture live from Rabat.',url:'https://hitradio-maroc.ice.infomaniak.ch/hitradio-maroc-128.mp3',color:'#a82126',accent:'#f1a126'},
 {id:'mgharba',name:'100% Mgharba',genre:'Moroccan',freq:100.1,desc:'A dedicated stream for contemporary Moroccan artists and songs.',url:'https://mgharba.ice.infomaniak.ch/mgharba-128.mp3',color:'#185844',accent:'#d9a33c'},
 {id:'medina',name:'Medina FM',genre:'Moroccan',freq:101.8,desc:'Moroccan music, conversation and culture from Meknes.',url:'https://medinafm.ice.infomaniak.ch/medinafm-128.mp3',color:'#8a3b20',accent:'#e5bd68'},
 {id:'fipjazz',name:'FIP Jazz',genre:'Jazz',freq:103.2,desc:'A refined mix spanning jazz classics, modern players and new discoveries.',url:'https://icecast.radiofrance.fr/fipjazz-midfi.mp3',color:'#26384a',accent:'#d49b43'},
 {id:'blueswave',name:'BluesWave Radio',genre:'Blues',freq:104.7,desc:'Blues and blues-rock selections broadcasting live from Athens.',url:'https://blueswave.radio:8000/blueswave',color:'#243f46',accent:'#c96536'},
 {id:'fiphop',name:'FIP Hip-Hop',genre:'Hip-Hop',freq:106.1,desc:'Old-school foundations, fresh rap and beats from across the map.',url:'https://icecast.radiofrance.fr/fiphiphop-midfi.mp3',color:'#3b253d',accent:'#e16635'},
 {id:'hot108',name:'Hot 108 Jamz',genre:'Hip-Hop',freq:107.8,desc:'Current hip-hop and R&B hits broadcasting live from New York.',url:'https://live.powerhitz.com/hot108',color:'#16191e',accent:'#d94c29'}
];

const $=s=>document.querySelector(s);
const audio=$('#audio'),grid=$('#stationGrid'),consoleEl=$('.console'),visualizer=$('#visualizer');
const savedStation=localStorage.getItem('orpheus-station');
let current=stations.find(s=>s.id===savedStation)||stations[0],playing=false,genre='All',visualizerTimer;
let favorites=new Set(JSON.parse(localStorage.getItem('orpheus-favorites')||'[]'));

function bars(){
 for(let i=0;i<64;i++){
  const b=document.createElement('b');
  b.style.setProperty('--h',`${10+Math.random()*58}px`);
  visualizer.append(b);
 }
}
bars();

function animateBars(){
 clearInterval(visualizerTimer);
 if(!playing)return;
 visualizerTimer=setInterval(()=>{
  visualizer.querySelectorAll('b').forEach((bar,index)=>{
   const wave=(Math.sin(Date.now()/230+index*.55)+1)*18;
   bar.style.setProperty('--h',`${10+wave+Math.random()*24}px`);
  });
 },170);
}

function tunePosition(freq){return Math.max(0,Math.min(100,((freq-88)/20)*100))}

function updateTuner(animate=true){
 consoleEl.style.setProperty('--tuner-position',`${tunePosition(current.freq)}%`);
 consoleEl.style.setProperty('--station-color',current.color);
 consoleEl.style.setProperty('--station-accent',current.accent);
 $('#frequencyReadout').textContent=current.freq.toFixed(1);
 $('#albumArt').style.setProperty('--art-color',current.color);
 $('#albumArt').style.setProperty('--art-accent',current.accent);
 if(animate){
  consoleEl.classList.remove('tuning');
  void consoleEl.offsetWidth;
  consoleEl.classList.add('tuning');
  setTimeout(()=>consoleEl.classList.remove('tuning'),650);
 }
}

function saveFavs(){localStorage.setItem('orpheus-favorites',JSON.stringify([...favorites]))}
function toggleFav(id){favorites.has(id)?favorites.delete(id):favorites.add(id);saveFavs();render();updateMain(false)}

function render(){
 const q=$('#search').value.toLowerCase();
 const visible=stations.filter(s=>(genre==='All'||s.genre===genre)&&(s.name+' '+s.genre+' '+s.desc+' '+s.freq).toLowerCase().includes(q));
 grid.innerHTML=visible.map(s=>`<article class="station-card ${s.id===current.id?'selected':''}" data-id="${s.id}" style="--station-accent:${s.accent}"><div class="cover" style="--card:${s.color};--accent:${s.accent}"><span class="card-frequency">${s.freq.toFixed(1)}</span></div><div class="card-body"><h3>${s.name}</h3><span class="genre">${s.genre}</span><div class="card-controls"><small>${s.id===current.id&&playing?'Playing live':s.id===current.id?'Selected frequency':'Listen live'}</small><button class="card-play ${s.id===current.id&&playing?'playing':''}" aria-label="${s.id===current.id&&playing?'Pause':'Play'} ${s.name}">${s.id===current.id&&playing?'Ⅱ':'▶'}</button></div></div><button class="fav ${favorites.has(s.id)?'active':''}" aria-label="${favorites.has(s.id)?'Remove from':'Add to'} favorites">${favorites.has(s.id)?'♥':'♡'}</button></article>`).join('');
 $('#empty').hidden=visible.length>0;
 grid.querySelectorAll('.station-card').forEach(card=>{
  const id=card.dataset.id;
  card.onclick=e=>{if(!e.target.closest('button'))selectStation(id,false)};
  card.querySelector('.card-play').onclick=()=>selectStation(id,true);
  card.querySelector('.fav').onclick=()=>toggleFav(id);
 });
}

function updateMain(animateTuner=false){
 $('#now-title').innerHTML=current.name.replace(' ','<br>');
 $('#stationDescription').textContent=current.desc;
 $('#miniTitle').textContent=`${current.name} · ${current.freq.toFixed(1)}`;
 const fav=favorites.has(current.id);
 $('#heartMain').textContent=fav?'♥':'♡';
 $('#heartMain').setAttribute('aria-pressed',fav);
 const icon=playing?'Ⅱ':'▶';
 $('#playMain span').textContent=icon;
 $('#playMain').setAttribute('aria-label',`${playing?'Pause':'Play'} ${current.name}`);
 $('#miniPlay').textContent=icon;
 $('#playLabel').textContent=playing?'Pause live':`Play ${current.freq.toFixed(1)}`;
 consoleEl.classList.toggle('playing',playing);
 $('#miniPlayer').hidden=!playing;
 document.title=`${playing?'▶ ':''}${current.name} — Orpheus Radio`;
 updateTuner(animateTuner);
 animateBars();
}

async function play(){
 if(audio.src!==current.url)audio.src=current.url;
 $('#status').textContent=`Tuning ${current.freq.toFixed(1)}…`;
 consoleEl.classList.add('connecting');
 try{
  await audio.play();
  playing=true;
  $('#status').textContent=`Signal locked · ${current.freq.toFixed(1)} FM`;
 }catch(e){
  playing=false;
  $('#status').textContent='Playback was blocked. Press play again.';
 }
 consoleEl.classList.remove('connecting');
 updateMain();render();
}

function pause(){audio.pause();playing=false;$('#status').textContent=`Paused on ${current.freq.toFixed(1)}`;updateMain();render()}
function toggle(){playing?pause():play()}

function selectStation(id,auto=false){
 const next=stations.find(s=>s.id===id);
 if(!next)return;
 const changed=next.id!==current.id;
 if(!changed&&auto){toggle();return}
 current=next;
 localStorage.setItem('orpheus-station',current.id);
 if(changed){audio.pause();audio.removeAttribute('src');playing=false;$('#status').textContent=`Tuned to ${current.freq.toFixed(1)} FM`;}
 updateMain(changed);render();
 if(auto)play();
}

function stepStation(direction){
 const index=stations.findIndex(s=>s.id===current.id);
 const next=stations[(index+direction+stations.length)%stations.length];
 selectStation(next.id,playing);
}

const genres=['All',...new Set(stations.map(s=>s.genre))];
$('#filters').innerHTML=genres.map(g=>`<button class="filter ${g==='All'?'active':''}" data-genre="${g}">${g}</button>`).join('');
$('#filters').onclick=e=>{if(!e.target.matches('.filter'))return;genre=e.target.dataset.genre;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b===e.target));render()};
$('#search').oninput=render;
$('#playMain').onclick=toggle;
$('#miniPlay').onclick=toggle;
$('#heartMain').onclick=()=>toggleFav(current.id);
$('#prevStation').onclick=()=>stepStation(-1);
$('#nextStation').onclick=()=>stepStation(1);

function setVolume(v){
 const value=Number(v);
 audio.volume=value/100;
 $('#volume').value=value;
 $('#miniVolume').value=value;
 $('#volumeOutput').value=value;
 $('#volumeKnob').style.setProperty('--knob-angle',`${-135+(value*2.7)}deg`);
 localStorage.setItem('orpheus-volume',value);
}
$('#volume').oninput=e=>setVolume(e.target.value);
$('#miniVolume').oninput=e=>setVolume(e.target.value);
setVolume(localStorage.getItem('orpheus-volume')||70);

audio.addEventListener('playing',()=>{playing=true;consoleEl.classList.remove('connecting');$('#status').textContent=`Signal locked · ${current.freq.toFixed(1)} FM`;updateMain();render()});
audio.addEventListener('waiting',()=>{if(playing){consoleEl.classList.add('connecting');$('#status').textContent='Strengthening signal…'}});
audio.addEventListener('error',()=>{playing=false;consoleEl.classList.remove('connecting');$('#status').textContent='This station is temporarily unavailable. Try another.';updateMain();render()});

document.addEventListener('keydown',e=>{
 if(['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName))return;
 if(e.code==='Space'){e.preventDefault();toggle()}
 if(e.code==='ArrowLeft'){e.preventDefault();stepStation(-1)}
 if(e.code==='ArrowRight'){e.preventDefault();stepStation(1)}
 if(e.key.toLowerCase()==='m'){setVolume(audio.volume>0?0:(localStorage.getItem('orpheus-volume-before-mute')||70))}
});

$('#volume').addEventListener('pointerdown',()=>localStorage.setItem('orpheus-volume-before-mute',$('#volume').value||70));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateMain()});
$('#year').textContent=new Date().getFullYear();
render();updateMain();
