const stations = [
  {id:'groove',name:'Groove Salad',genre:'Ambient',freq:88.4,desc:'A nicely chilled plate of ambient beats and grooves.',url:'https://ice1.somafm.com/groovesalad-128-mp3',color:'#7b2528',accent:'#d6541b',soma:'groovesalad'},
  {id:'drone',name:'Drone Zone',genre:'Ambient',freq:90.1,desc:'Atmospheric textures with minimal beats and maximum space.',url:'https://ice1.somafm.com/dronezone-128-mp3',color:'#201b18',accent:'#a94324',soma:'dronezone'},
  {id:'indie',name:'Indie Pop Rocks!',genre:'Indie',freq:91.7,desc:'New and classic indie pop from artists outside the mainstream.',url:'https://ice1.somafm.com/indiepop-128-mp3',color:'#c34d1d',accent:'#2b1714',soma:'indiepop'},
  {id:'agent',name:'Secret Agent',genre:'Lounge',freq:93.5,desc:'The soundtrack for stylish spies and elegant late nights.',url:'https://ice1.somafm.com/secretagent-128-mp3',color:'#31352d',accent:'#d29a43',soma:'secretagent'},
  {id:'fluid',name:'Fluid',genre:'Hip-Hop',freq:95.2,desc:'Instrumental hip-hop, liquid trap and future soul.',url:'https://ice1.somafm.com/fluid-128-mp3',color:'#8c321d',accent:'#171714',soma:'fluid'},
  {id:'space',name:'Deep Space One',genre:'Space',freq:96.9,desc:'Deep ambient electronics for drifting beyond the atmosphere.',url:'https://ice1.somafm.com/deepspaceone-128-mp3',color:'#171714',accent:'#b64d1c',soma:'deepspaceone'},
  {id:'hitradio',name:'Hit Radio Morocco',genre:'Moroccan',freq:98.4,desc:'Moroccan pop, chart hits and youth culture live from Rabat.',url:'https://hitradio-maroc.ice.infomaniak.ch/hitradio-maroc-128.mp3',color:'#a82126',accent:'#f1a126'},
  {id:'mgharba',name:'100% Mgharba',genre:'Moroccan',freq:100.1,desc:'A dedicated stream for contemporary Moroccan artists and songs.',url:'https://mgharba.ice.infomaniak.ch/mgharba-128.mp3',color:'#185844',accent:'#d9a33c'},
  {id:'medina',name:'Medina FM',genre:'Moroccan',freq:101.8,desc:'Moroccan music, conversation and culture from Meknes.',url:'https://medinafm.ice.infomaniak.ch/medinafm-128.mp3',color:'#8a3b20',accent:'#e5bd68'},
  {id:'fipjazz',name:'FIP Jazz',genre:'Jazz',freq:103.2,desc:'A refined mix spanning jazz classics, modern players and new discoveries.',url:'https://icecast.radiofrance.fr/fipjazz-midfi.mp3',color:'#26384a',accent:'#d49b43'},
  {id:'blueswave',name:'BluesWave Radio',genre:'Blues',freq:104.7,desc:'Blues and blues-rock selections broadcasting live from Athens.',url:'https://blueswave.radio:8000/blueswave',color:'#243f46',accent:'#c96536'},
  {id:'fiphop',name:'FIP Hip-Hop',genre:'Hip-Hop',freq:106.1,desc:'Old-school foundations, fresh rap and beats from across the map.',url:'https://icecast.radiofrance.fr/fiphiphop-midfi.mp3',color:'#3b253d',accent:'#e16635'},
  {id:'hot108',name:'Hot 108 Jamz',genre:'Hip-Hop',freq:107.8,desc:'Current hip-hop and R&B hits broadcasting live from New York.',url:'https://live.powerhitz.com/hot108',color:'#16191e',accent:'#d94c29'}
];

const $ = selector => document.querySelector(selector);
const audio = $('#audio');
const grid = $('#stationGrid');
const consoleEl = $('.console');
const visualizer = $('#visualizer');
const validStation = id => stations.find(station => station.id === id);
const safeList = key => {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
};

const urlStation = new URL(location.href).searchParams.get('station');
const savedStation = localStorage.getItem('orpheus-station');
let current = validStation(urlStation) || validStation(savedStation) || stations[0];
let playerState = 'idle';
let genreFilter = 'All';
let visualizerTimer = 0;
let connectionTimer = 0;
let metadataTimer = 0;
let metadataAbort = null;
let sleepInterval = 0;
let deferredInstall = null;
let hasStarted = false;
let lastAudibleVolume = Number(localStorage.getItem('orpheus-last-audible-volume')) || 70;
let favorites = new Set(safeList('orpheus-favorites').filter(id => validStation(id)));
let recent = safeList('orpheus-recent').filter(id => validStation(id)).slice(0, 5);
let currentTrack = {title:'Live broadcast', artist:current.name, live:false};

const stateCopy = {
  idle: ['Ready', 'Ready to play'],
  connecting: ['Tuning', 'Finding the live signal…'],
  playing: ['Live', 'Signal locked · Live broadcast'],
  buffering: ['Buffering', 'Strengthening the signal…'],
  paused: ['Paused', 'Playback paused'],
  unavailable: ['Offline', 'This station is temporarily unavailable']
};

function buildVisualizer() {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 64; i += 1) {
    const bar = document.createElement('b');
    bar.style.setProperty('--h', `${10 + Math.random() * 58}px`);
    fragment.append(bar);
  }
  visualizer.append(fragment);
}

function animateBars() {
  clearInterval(visualizerTimer);
  if (playerState !== 'playing') return;
  visualizerTimer = window.setInterval(() => {
    visualizer.querySelectorAll('b').forEach((bar, index) => {
      const wave = (Math.sin(Date.now() / 230 + index * .55) + 1) * 18;
      bar.style.setProperty('--h', `${10 + wave + Math.random() * 24}px`);
    });
  }, 170);
}

function tunePosition(freq) { return Math.max(0, Math.min(100, ((freq - 88) / 20) * 100)); }

function updateTuner(animate = true) {
  consoleEl.style.setProperty('--tuner-position', `${tunePosition(current.freq)}%`);
  consoleEl.style.setProperty('--station-color', current.color);
  consoleEl.style.setProperty('--station-accent', current.accent);
  $('#frequencyReadout').textContent = current.freq.toFixed(1);
  $('#albumArt').style.setProperty('--art-color', current.color);
  $('#albumArt').style.setProperty('--art-accent', current.accent);
  if (!animate) return;
  consoleEl.classList.remove('tuning');
  void consoleEl.offsetWidth;
  consoleEl.classList.add('tuning');
  window.setTimeout(() => consoleEl.classList.remove('tuning'), 650);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 2800);
}

function setPlayerState(next, message) {
  playerState = next;
  const [label, defaultMessage] = stateCopy[next];
  document.documentElement.dataset.playerState = next;
  consoleEl.dataset.state = next;
  $('#signalLabel').textContent = label;
  $('#status').textContent = message || defaultMessage;
  $('#miniState').textContent = label;
  $('#recovery').hidden = next !== 'unavailable';
  const playing = next === 'playing';
  consoleEl.classList.toggle('playing', playing);
  consoleEl.classList.toggle('connecting', next === 'connecting' || next === 'buffering');
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : next === 'paused' ? 'paused' : 'none';
  updateMain();
  animateBars();
}

function saveFavorites() {
  localStorage.setItem('orpheus-favorites', JSON.stringify([...favorites]));
}

function toggleFavorite(id) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  saveFavorites();
  renderFilters();
  renderStations();
  updateMain();
}

function recordRecent(id) {
  recent = [id, ...recent.filter(item => item !== id)].slice(0, 5);
  localStorage.setItem('orpheus-recent', JSON.stringify(recent));
  renderRecent();
}

function renderRecent() {
  const wrap = $('#recentWrap');
  const list = $('#recentList');
  wrap.hidden = recent.length === 0;
  list.innerHTML = recent.map(id => {
    const station = validStation(id);
    return `<button class="recent-station ${id === current.id ? 'current' : ''}" data-id="${id}" style="--recent-color:${station.color}"><i></i><span><small>${station.genre}</small><strong>${station.name}</strong></span><b>▶</b></button>`;
  }).join('');
  list.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => selectStation(button.dataset.id, true));
  });
}

function renderFilters() {
  const genres = ['All', 'Favorites', ...new Set(stations.map(station => station.genre))];
  $('#filters').innerHTML = genres.map(item => {
    const count = item === 'Favorites' ? favorites.size : item === 'All' ? stations.length : stations.filter(station => station.genre === item).length;
    return `<button class="filter ${item === genreFilter ? 'active' : ''}" data-genre="${item}">${item}<span>${count}</span></button>`;
  }).join('');
}

function visibleStations() {
  const query = $('#search').value.trim().toLowerCase();
  return stations.filter(station => {
    const inFilter = genreFilter === 'All' || (genreFilter === 'Favorites' ? favorites.has(station.id) : station.genre === genreFilter);
    const inSearch = `${station.name} ${station.genre} ${station.desc} ${station.freq}`.toLowerCase().includes(query);
    return inFilter && inSearch;
  });
}

function renderStations() {
  const visible = visibleStations();
  grid.innerHTML = visible.map(station => `
    <article class="station-card ${station.id === current.id ? 'selected' : ''}" data-id="${station.id}" style="--station-accent:${station.accent}">
      <div class="cover" style="--card:${station.color};--accent:${station.accent}"><span class="card-frequency">${station.freq.toFixed(1)} <i>virtual</i></span></div>
      <div class="card-body"><h3>${station.name}</h3><span class="genre">${station.genre}</span>
        <div class="card-controls"><small>${station.id === current.id && playerState === 'playing' ? 'Playing live' : station.id === current.id ? 'Selected station' : 'Listen live'}</small><button class="card-play ${station.id === current.id && playerState === 'playing' ? 'playing' : ''}" aria-label="${station.id === current.id && playerState === 'playing' ? 'Pause' : 'Play'} ${station.name}">${station.id === current.id && playerState === 'playing' ? 'Ⅱ' : '▶'}</button></div>
      </div>
      <button class="fav ${favorites.has(station.id) ? 'active' : ''}" aria-label="${favorites.has(station.id) ? 'Remove from' : 'Add to'} favorites">${favorites.has(station.id) ? '♥' : '♡'}</button>
    </article>`).join('');
  $('#empty').hidden = visible.length > 0;
  $('#resultCount').textContent = `${visible.length} ${visible.length === 1 ? 'station' : 'stations'}`;
  grid.querySelectorAll('.station-card').forEach(card => {
    const id = card.dataset.id;
    card.addEventListener('click', event => { if (!event.target.closest('button')) selectStation(id, false); });
    card.querySelector('.card-play').addEventListener('click', () => selectStation(id, true));
    card.querySelector('.fav').addEventListener('click', () => toggleFavorite(id));
  });
}

function updateTrackDisplay() {
  $('#trackTitle').textContent = currentTrack.title;
  $('#trackArtist').textContent = currentTrack.artist;
  $('#miniTrack').textContent = currentTrack.live ? `${currentTrack.artist} — ${currentTrack.title}` : 'Live broadcast';
  $('#metadataBadge').textContent = currentTrack.live ? 'Live metadata' : 'Live stream';
  updateMediaSession();
}

function updateMain(animateTuner = false) {
  const words = current.name.split(' ');
  const splitAt = Math.max(1, Math.ceil(words.length / 2));
  $('#now-title').innerHTML = `${words.slice(0, splitAt).join(' ')}${words.length > 1 ? '<br>' : ''}${words.slice(splitAt).join(' ')}`;
  $('#stationDescription').textContent = current.desc;
  $('#miniTitle').textContent = current.name;
  const isFavorite = favorites.has(current.id);
  $('#heartMain').textContent = isFavorite ? '♥' : '♡';
  $('#heartMain').setAttribute('aria-pressed', String(isFavorite));
  $('#heartMain').setAttribute('aria-label', `${isFavorite ? 'Remove' : 'Add'} ${current.name} ${isFavorite ? 'from' : 'to'} favorites`);
  const playing = playerState === 'playing' || playerState === 'buffering' || playerState === 'connecting';
  const icon = playing ? 'Ⅱ' : '▶';
  $('#playMain span').textContent = icon;
  $('#playMain').setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${current.name}`);
  $('#miniPlay').textContent = icon;
  $('#playLabel').textContent = playing ? 'Pause live' : 'Play live';
  $('#miniPlayer').hidden = !hasStarted;
  document.title = `${playerState === 'playing' ? '▶ ' : ''}${current.name} — Orpheus Radio`;
  updateTuner(animateTuner);
}

function resetMetadata() {
  clearTimeout(metadataTimer);
  metadataAbort?.abort();
  currentTrack = {title:'Live broadcast', artist:current.name, live:false};
  updateTrackDisplay();
}

function splitTrack(value) {
  const clean = String(value || '').trim();
  if (!clean) return null;
  const divider = clean.indexOf(' - ');
  if (divider < 1) return {artist:current.name, title:clean, live:true};
  return {artist:clean.slice(0, divider).trim(), title:clean.slice(divider + 3).trim(), live:true};
}

async function refreshMetadata() {
  clearTimeout(metadataTimer);
  metadataAbort?.abort();
  if (!current.soma) return;
  const requestedId = current.id;
  metadataAbort = new AbortController();
  const abortTimer = window.setTimeout(() => metadataAbort.abort(), 6500);
  try {
    const response = await fetch('https://api.somafm.com/channels.json', {cache:'no-store', signal:metadataAbort.signal});
    if (!response.ok) throw new Error('metadata unavailable');
    const data = await response.json();
    const channel = data.channels?.find(item => item.id === current.soma);
    const track = splitTrack(channel?.lastPlaying);
    if (current.id === requestedId && track) { currentTrack = track; updateTrackDisplay(); }
  } catch {
    if (current.id === requestedId && !currentTrack.live) updateTrackDisplay();
  } finally {
    clearTimeout(abortTimer);
    if (current.id === requestedId) metadataTimer = window.setTimeout(refreshMetadata, 30000);
  }
}

function updateUrl() {
  const url = new URL(location.href);
  url.searchParams.set('station', current.id);
  history.replaceState({station:current.id}, '', url);
}

function clearConnectionTimer() { clearTimeout(connectionTimer); connectionTimer = 0; }

function armConnectionTimer(requestedId = current.id) {
  clearConnectionTimer();
  connectionTimer = window.setTimeout(() => {
    if (current.id !== requestedId || playerState === 'playing') return;
    audio.pause();
    setPlayerState('unavailable', `${current.name} did not respond. You can retry or switch stations.`);
  }, 12000);
}

async function play() {
  const requestedId = current.id;
  if (audio.dataset.station !== current.id) {
    audio.src = current.url;
    audio.dataset.station = current.id;
  }
  hasStarted = true;
  setPlayerState('connecting', `Tuning ${current.freq.toFixed(1)}…`);
  armConnectionTimer(requestedId);
  try {
    await audio.play();
  } catch (error) {
    clearConnectionTimer();
    if (current.id !== requestedId) return;
    if (error.name === 'AbortError') return;
    setPlayerState('idle', 'Playback was blocked. Press play once more.');
  }
}

function pause() {
  clearConnectionTimer();
  audio.pause();
  setPlayerState('paused', `Paused · ${current.name}`);
}

function toggle() {
  ['playing', 'buffering', 'connecting'].includes(playerState) ? pause() : play();
}

function selectStation(id, autoplay = false, updateAddress = true) {
  const next = validStation(id);
  if (!next) return;
  const changed = next.id !== current.id;
  if (!changed && autoplay) { toggle(); return; }
  if (changed) {
    clearConnectionTimer();
    audio.pause();
    audio.removeAttribute('src');
    audio.removeAttribute('data-station');
    audio.load();
    current = next;
    localStorage.setItem('orpheus-station', current.id);
    if (updateAddress) updateUrl();
    resetMetadata();
    setPlayerState('idle', `Selected ${current.name} · ${current.freq.toFixed(1)} virtual FM`);
    updateMain(true);
    renderRecent();
    renderStations();
    refreshMetadata();
  }
  if (autoplay) play();
}

function stepStation(direction, autoplay = ['playing', 'buffering', 'connecting'].includes(playerState)) {
  const index = stations.findIndex(station => station.id === current.id);
  selectStation(stations[(index + direction + stations.length) % stations.length].id, autoplay);
}

function setVolume(value, persist = true) {
  const volume = Math.max(0, Math.min(100, Number(value)));
  audio.volume = volume / 100;
  $('#volume').value = volume;
  $('#miniVolume').value = volume;
  $('#volumeOutput').value = Math.round(volume);
  $('#volumeKnob').style.setProperty('--knob-angle', `${-135 + volume * 2.7}deg`);
  if (volume > 0) {
    lastAudibleVolume = volume;
    localStorage.setItem('orpheus-last-audible-volume', String(volume));
  }
  if (persist) localStorage.setItem('orpheus-volume', String(volume));
}

function toggleMute() { setVolume(audio.volume > 0 ? 0 : lastAudibleVolume); }

function updateMediaSession() {
  if (!('mediaSession' in navigator) || !('MediaMetadata' in window)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: currentTrack.live ? currentTrack.title : current.name,
    artist: currentTrack.live ? currentTrack.artist : 'Live radio',
    album: `Orpheus Radio · ${current.name}`,
    artwork: [
      {src:new URL('icons/app-icon-192.png', location.href).href, sizes:'192x192', type:'image/png'},
      {src:new URL('icons/app-icon-512.png', location.href).href, sizes:'512x512', type:'image/png'}
    ]
  });
}

function configureMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const actions = {play, pause, stop:pause, previoustrack:() => stepStation(-1, true), nexttrack:() => stepStation(1, true)};
  Object.entries(actions).forEach(([action, handler]) => {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* unsupported action */ }
  });
  updateMediaSession();
}

function updateSleepTimer() {
  clearInterval(sleepInterval);
  const end = Number(localStorage.getItem('orpheus-sleep-end')) || 0;
  const tick = () => {
    const remaining = end - Date.now();
    if (remaining <= 0) {
      clearInterval(sleepInterval);
      localStorage.removeItem('orpheus-sleep-end');
      $('#sleepLabel').textContent = 'Sleep timer';
      $('#cancelTimer').hidden = true;
      if (end) { pause(); showToast('Sleep timer ended. Good night.'); }
      return;
    }
    const minutes = Math.ceil(remaining / 60000);
    $('#sleepLabel').textContent = `Sleep · ${minutes}m`;
    $('#cancelTimer').hidden = false;
  };
  tick();
  if (end > Date.now()) sleepInterval = window.setInterval(tick, 1000);
}

function setSleepTimer(minutes) {
  localStorage.setItem('orpheus-sleep-end', String(Date.now() + minutes * 60000));
  updateSleepTimer();
  $('#sleepDialog').close();
  showToast(`Sleep timer set for ${minutes} minutes.`);
}

function cancelSleepTimer() {
  localStorage.removeItem('orpheus-sleep-end');
  updateSleepTimer();
  showToast('Sleep timer cancelled.');
}

async function shareCurrentStation() {
  updateUrl();
  const shareData = {title:`${current.name} — Orpheus Radio`, text:`Listen to ${current.name} on Orpheus Radio`, url:location.href};
  try {
    if (navigator.share) await navigator.share(shareData);
    else { await navigator.clipboard.writeText(location.href); showToast('Station link copied.'); }
  } catch (error) {
    if (error.name !== 'AbortError') showToast('Could not share this station.');
  }
}

function surpriseMe() {
  const choices = stations.filter(station => station.id !== current.id);
  selectStation(choices[Math.floor(Math.random() * choices.length)].id, true);
  showToast('A new signal found.');
}

function wireEvents() {
  $('#filters').addEventListener('click', event => {
    const button = event.target.closest('.filter');
    if (!button) return;
    genreFilter = button.dataset.genre;
    renderFilters();
    renderStations();
  });
  $('#search').addEventListener('input', renderStations);
  $('#playMain').addEventListener('click', toggle);
  $('#miniPlay').addEventListener('click', toggle);
  $('#heartMain').addEventListener('click', () => toggleFavorite(current.id));
  $('#prevStation').addEventListener('click', () => stepStation(-1));
  $('#nextStation').addEventListener('click', () => stepStation(1));
  $('#volume').addEventListener('input', event => setVolume(event.target.value));
  $('#miniVolume').addEventListener('input', event => setVolume(event.target.value));
  $('#retryStream').addEventListener('click', play);
  $('#tryAnother').addEventListener('click', () => stepStation(1, true));
  $('#surpriseMe').addEventListener('click', surpriseMe);
  $('#shareStation').addEventListener('click', shareCurrentStation);
  $('#sleepButton').addEventListener('click', () => $('#sleepDialog').showModal());
  $('#sleepDialog').addEventListener('click', event => { if (event.target === $('#sleepDialog')) $('#sleepDialog').close(); });
  document.querySelectorAll('.timer-options button').forEach(button => button.addEventListener('click', () => setSleepTimer(Number(button.value))));
  $('#cancelTimer').addEventListener('click', cancelSleepTimer);
  $('#clearRecent').addEventListener('click', () => { recent = []; localStorage.removeItem('orpheus-recent'); renderRecent(); showToast('Listening history cleared.'); });

  audio.addEventListener('playing', () => {
    clearConnectionTimer();
    hasStarted = true;
    setPlayerState('playing', `Signal locked · ${current.freq.toFixed(1)} virtual FM`);
    recordRecent(current.id);
    refreshMetadata();
  });
  const handleBuffering = () => {
    if (!hasStarted || playerState === 'connecting' || playerState === 'unavailable') return;
    setPlayerState('buffering');
    armConnectionTimer(current.id);
  };
  audio.addEventListener('waiting', handleBuffering);
  audio.addEventListener('stalled', handleBuffering);
  audio.addEventListener('error', () => {
    clearConnectionTimer();
    if (audio.dataset.station) setPlayerState('unavailable', `${current.name} is not responding. You can retry or switch stations.`);
  });
  audio.addEventListener('pause', () => {
    if (!['unavailable', 'idle'].includes(playerState) && !audio.ended) setPlayerState('paused', `Paused · ${current.name}`);
  });

  document.addEventListener('keydown', event => {
    const activeTag = document.activeElement?.tagName || '';
    if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(activeTag) || $('#sleepDialog').open) return;
    if (event.code === 'Space') { event.preventDefault(); toggle(); }
    if (event.code === 'ArrowLeft') { event.preventDefault(); stepStation(-1); }
    if (event.code === 'ArrowRight') { event.preventDefault(); stepStation(1); }
    if (event.key.toLowerCase() === 'm') toggleMute();
  });
  window.addEventListener('popstate', () => {
    const id = new URL(location.href).searchParams.get('station');
    if (validStation(id) && id !== current.id) selectStation(id, false, false);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshMetadata(); });

  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; $('#installApp').classList.add('available'); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; $('#installApp').hidden = true; showToast('Orpheus installed.'); });
  $('#installApp').addEventListener('click', async () => {
    if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; return; }
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    showToast(isiOS ? 'In Safari, tap Share then “Add to Home Screen”.' : 'Use your browser menu and choose “Install app”.');
  });
}

function init() {
  buildVisualizer();
  renderFilters();
  renderStations();
  renderRecent();
  wireEvents();
  setVolume(localStorage.getItem('orpheus-volume') ?? 70, false);
  resetMetadata();
  setPlayerState('idle');
  updateMain(false);
  updateSleepTimer();
  configureMediaSession();
  refreshMetadata();
  $('#year').textContent = new Date().getFullYear();
  if (urlStation && validStation(urlStation)) updateUrl();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
