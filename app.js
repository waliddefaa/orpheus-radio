const stations=[
 {id:'groove',name:'Groove Salad',genre:'Ambient',desc:'A nicely chilled plate of ambient beats and grooves.',url:'https://ice1.somafm.com/groovesalad-128-mp3',color:'#7b2528',accent:'#d6541b'},
 {id:'drone',name:'Drone Zone',genre:'Ambient',desc:'Atmospheric textures with minimal beats and maximum space.',url:'https://ice1.somafm.com/dronezone-128-mp3',color:'#201b18',accent:'#a94324'},
 {id:'indie',name:'Indie Pop Rocks!',genre:'Indie',desc:'New and classic indie pop from artists outside the mainstream.',url:'https://ice1.somafm.com/indiepop-128-mp3',color:'#c34d1d',accent:'#2b1714'},
 {id:'agent',name:'Secret Agent',genre:'Lounge',desc:'The soundtrack for stylish spies and elegant late nights.',url:'https://ice1.somafm.com/secretagent-128-mp3',color:'#31352d',accent:'#d29a43'},
 {id:'fluid',name:'Fluid',genre:'Electronic',desc:'Instrumental hip-hop, liquid trap and future soul.',url:'https://ice1.somafm.com/fluid-128-mp3',color:'#8c321d',accent:'#171714'},
 {id:'space',name:'Deep Space One',genre:'Space',desc:'Deep ambient electronics for drifting beyond the atmosphere.',url:'https://ice1.somafm.com/deepspaceone-128-mp3',color:'#171714',accent:'#b64d1c'}
];
const $=s=>document.querySelector(s);const audio=$('#audio'),grid=$('#stationGrid'),consoleEl=$('.console');
let current=stations[0],playing=false,genre='All';let favorites=new Set(JSON.parse(localStorage.getItem('orpheus-favorites')||'[]'));
function bars(){const v=$('#visualizer');for(let i=0;i<64;i++){const b=document.createElement('b');b.style.setProperty('--h',`${12+Math.random()*61}px`);v.append(b)}}bars();
function saveFavs(){localStorage.setItem('orpheus-favorites',JSON.stringify([...favorites]))}
function toggleFav(id){favorites.has(id)?favorites.delete(id):favorites.add(id);saveFavs();render();updateMain()}
function render(){const q=$('#search').value.toLowerCase();const visible=stations.filter(s=>(genre==='All'||s.genre===genre)&&(s.name+' '+s.genre+' '+s.desc).toLowerCase().includes(q));grid.innerHTML=visible.map(s=>`<article class="station-card" data-id="${s.id}"><div class="cover" style="--card:${s.color};--accent:${s.accent}"></div><div class="card-body"><h3>${s.name}</h3><span class="genre">${s.genre}</span><div class="card-controls"><small>${s.id===current.id&&playing?'Playing live':'Listen live'}</small><button class="card-play ${s.id===current.id&&playing?'playing':''}" aria-label="${s.id===current.id&&playing?'Pause':'Play'} ${s.name}">${s.id===current.id&&playing?'Ⅱ':'▶'}</button></div></div><button class="fav ${favorites.has(s.id)?'active':''}" aria-label="${favorites.has(s.id)?'Remove from':'Add to'} favorites">${favorites.has(s.id)?'♥':'♡'}</button></article>`).join('');
 $('#empty').hidden=visible.length>0;
 grid.querySelectorAll('.station-card').forEach(card=>{const id=card.dataset.id;card.querySelector('.card-play').onclick=()=>selectStation(id,true);card.querySelector('.fav').onclick=()=>toggleFav(id)});
}
function updateMain(){
 $('#now-title').innerHTML=current.name.replace(' ','<br>');$('#stationDescription').textContent=current.desc;$('#miniTitle').textContent=current.name;
 const fav=favorites.has(current.id);$('#heartMain').textContent=fav?'♥':'♡';$('#heartMain').setAttribute('aria-pressed',fav);
 const icon=playing?'Ⅱ':'▶';$('#playMain span').textContent=icon;$('#miniPlay').textContent=icon;$('#playLabel').textContent=playing?'Pause live':'Play live';
 consoleEl.classList.toggle('playing',playing);$('#miniPlayer').hidden=!playing;document.title=`${playing?'▶ ':''}${current.name} — Orpheus Radio`;
}
async function play(){if(audio.src!==current.url)audio.src=current.url;$('#status').textContent='Connecting to live stream…';try{await audio.play();playing=true;$('#status').textContent='Live now';}catch(e){playing=false;$('#status').textContent='Playback was blocked. Press play again.';}updateMain();render()}
function pause(){audio.pause();playing=false;$('#status').textContent='Paused';updateMain();render()}
function toggle(){playing?pause():play()}
function selectStation(id,auto=false){const next=stations.find(s=>s.id===id);if(!next)return;const changed=next.id!==current.id;current=next;if(changed){audio.pause();audio.removeAttribute('src');playing=false;}updateMain();render();if(auto)play()}
const genres=['All',...new Set(stations.map(s=>s.genre))];$('#filters').innerHTML=genres.map(g=>`<button class="filter ${g==='All'?'active':''}" data-genre="${g}">${g}</button>`).join('');
$('#filters').onclick=e=>{if(!e.target.matches('.filter'))return;genre=e.target.dataset.genre;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b===e.target));render()};
$('#search').oninput=render;$('#playMain').onclick=toggle;$('#miniPlay').onclick=toggle;$('#heartMain').onclick=()=>toggleFav(current.id);
function setVolume(v){audio.volume=v/100;$('#volume').value=v;$('#miniVolume').value=v;$('#volumeOutput').value=v;localStorage.setItem('orpheus-volume',v)}
$('#volume').oninput=e=>setVolume(e.target.value);$('#miniVolume').oninput=e=>setVolume(e.target.value);setVolume(localStorage.getItem('orpheus-volume')||70);
audio.addEventListener('playing',()=>{playing=true;$('#status').textContent='Live now';updateMain();render()});audio.addEventListener('error',()=>{playing=false;$('#status').textContent='This station is temporarily unavailable. Try another.';updateMain();render()});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();toggle()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateMain()});$('#year').textContent=new Date().getFullYear();render();updateMain();
