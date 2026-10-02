/* PULSE INDEX — site behaviour.
   Content (events, artists, spaces, settings) is NOT in this file: it lives in
   /content/*.json and is loaded by index.html before this script runs. */
const TYPE_LABELS = window.TYPE_LABELS;
// builds "Name / Name (note) / Name" — reads e.artistNotes:{artistId:'note text'} if present
function lineupText(e){
  return e.artists.map(a => ARTISTS[a].name + (e.artistNotes && e.artistNotes[a] ? ` (${e.artistNotes[a]})` : '')).join(' / ');
}

const archived = EVENTS.filter(e=>e.status==='ARCHIVED');
const incoming = EVENTS.filter(e=>e.status==='INCOMING');

/* ---------------- NAV ---------------- */
document.querySelectorAll('nav.channels button').forEach(b=>{
  b.addEventListener('click', ()=> showView(b.dataset.v));
});
function setHash(h){ try{ history.replaceState(null,'', h ? '#'+h : location.pathname+location.search); }catch(_){} }
function currentView(){ const v=document.querySelector('.view.active'); return v ? v.id.replace('view-','') : 'signal'; }
function showView(v){
  setHash(v==='signal' ? '' : v);
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('nav.channels button').forEach(b=>b.classList.toggle('active', b.dataset.v===v));
  document.getElementById('view-'+v).classList.add('active');
  if(v==='network' && !window.__netDrawn){ drawNetwork(); window.__netDrawn=true; }
}
document.getElementById('home-btn').addEventListener('click', ()=>showView('signal'));
document.addEventListener('keydown', e=>{
  if(e.key!=='Escape') return;
  const lb=document.getElementById('lightbox');
  const fp=document.getElementById('filepanel');
  const nd=document.getElementById('netdetail');
  if(lb.classList.contains('open')) closeLightbox();
  else if(fp.classList.contains('open')) closeFile();
  else if(nd.classList.contains('open')) nd.classList.remove('open');
  else { const f=document.querySelector('.folder.open'); if(f) closeFolder(f); }
});

/* ---------------- SCAN — continuous, seamless drift ---------------- */
const scanItems = [...EVENTS].reverse(); // most recent first
const SCAN_ITEM_W = 260, SCAN_GAP_W = 110; // gap = the strip of static between the last and first item
let scanPlaying = true;
(function(){
  const track=document.getElementById('scan-track');
  const setW = scanItems.length * SCAN_ITEM_W + SCAN_GAP_W;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let offset = 0;
  const openItem = it => it.status==='ARCHIVED' ? openFolder(it.id) : openFile(it.id);
  // the item list is duplicated once so the drift can loop without ever visibly jumping
  [...scanItems, ...scanItems].forEach((it,i)=>{
    const el=document.createElement('div'); el.className='scan-item';
    const lineup = lineupText(it);
    el.innerHTML = `<span class="id">${it.id}</span><span class="name">${it.name}</span><span class="id" style="color:var(--grey)">${it.date}</span>`;
    el.title = `${it.name} — ${TYPE_LABELS[it.type]||it.type}${lineup?' — '+lineup:''}`;
    el.onclick = ()=>openItem(it);
    track.appendChild(el);
    if(i % scanItems.length === scanItems.length-1){
      const gap=document.createElement('div'); gap.className='scan-static'; gap.setAttribute('aria-hidden','true');
      track.appendChild(gap);
    }
  });

  function apply(){ track.style.transform = `translateX(${-offset}px)`; }
  function tick(){
    if(scanPlaying && !reduceMotion){
      offset += 0.4;
      if(offset >= setW) offset -= setW;
      apply();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  document.getElementById('scan-next').onclick=()=>{ offset=(offset+SCAN_ITEM_W)%setW; apply(); };
  document.getElementById('scan-prev').onclick=()=>{ offset=(offset-SCAN_ITEM_W+setW)%setW; apply(); };
  document.getElementById('scan-play').onclick=(e)=>{
    scanPlaying=!scanPlaying; e.currentTarget.textContent = scanPlaying?'❚❚':'▶▶'; e.currentTarget.setAttribute('aria-label', scanPlaying?'Pause scan':'Play scan');
  };
})();

/* ---------------- NEXT TRANSMISSION (front page) ----------------
   The soonest INCOMING event fills the front page; any others are
   listed underneath as compact rows. */
function parseDate(d){ const [dd,mm,yy]=d.split('.').map(Number); return new Date(yy,mm-1,dd); }
(function(){
  const box=document.getElementById('next-tx');
  const upcoming=[...incoming].sort((x,y)=>parseDate(x.date)-parseDate(y.date));
  if(!upcoming.length){
    box.innerHTML=`<div class="next-tx" style="display:block"><div class="label">NEXT TRANSMISSION</div>
      <div class="nt-title">No incoming transmissions right now.</div>
      <div class="nt-actions"><button class="tune-btn" onclick="showView('archive')">BROWSE THE ARCHIVE →</button></div></div>`;
    return;
  }
  const e=upcoming[0], sp=e.space?SPACES[e.space]:null;
  const days=Math.round((parseDate(e.date)-new Date(new Date().toDateString()))/864e5);
  const count = days>1 ? `IN ${days} DAYS` : days===1 ? 'TOMORROW' : days===0 ? 'TONIGHT' : '';
  const [dd,mm,yy]=e.date.split('.');
  const row=(k,v)=> v ? `<div class="row"><span>${k}</span><span>${v}</span></div>` : '';
  box.innerHTML=`<div class="next-tx">
    ${e.posterUrl ? `<div class="nt-poster" onclick="openLightbox('${e.posterUrl}','${e.name.replace(/'/g,"\\'")} — poster')"><img src="${e.posterUrl}" alt="${e.name} poster"></div>` : `<div class="nt-poster empty">POSTER — INCOMING</div>`}
    <div>
      <div class="nt-kicker"><span class="label">NEXT TRANSMISSION</span><span class="status-tag">INCOMING</span></div>
      <div class="nt-title">${e.name}</div>
      <div class="nt-date">${dd}.${mm}<span style="color:var(--grey)">.${yy.slice(2)}</span></div>
      <div class="nt-count">${count}</div>
      <div class="nt-meta">
        ${row('FILE', `<span style="color:var(--sig)">${e.id}</span> / ${TYPE_LABELS[e.type]||e.type}`)}
        ${row('TIME', e.time||'')}
        ${row('LOCATION', sp ? `${sp.name}, ${sp.city}` : '')}
        ${row(e.type==='WORKSHOP'?'FACILITATOR':'ARTISTS', lineupText(e))}
        ${row('TICKETS', e.price||'')}
      </div>
      <div class="nt-actions" style="margin-top:16px">
        ${e.ticketUrl ? `<a href="${e.ticketUrl}" target="_blank" rel="noopener" class="tune-btn primary">GET TICKETS →</a>` : ''}
        <button class="tune-btn" onclick="openFile('${e.id}')">FULL FILE →</button>
      </div>
    </div>
  </div>`;
  const rest=upcoming.slice(1);
  if(rest.length){
    document.getElementById('also-wrap').style.display='block';
    const list=document.getElementById('prog-list');
    rest.forEach(e=>{
      const sp=SPACES[e.space];
      const r=document.createElement('div'); r.className='event-row'; r.style.cursor='pointer'; r.style.minHeight='0';
      r.onclick=(ev)=>{ if(!ev.target.closest('a')) openFile(e.id); };
      r.innerHTML=`<div><div class="fid">${e.id} / ${TYPE_LABELS[e.type]||e.type}</div><div class="name">${e.name}</div></div>
        <div class="meta" style="margin:0">${e.date}${sp?` &nbsp;·&nbsp; ${sp.name.toUpperCase()}, ${sp.city.toUpperCase()}`:''}</div>
        ${e.ticketUrl ? `<a href="${e.ticketUrl}" target="_blank" rel="noopener" class="tune-btn" style="align-self:flex-start;margin-top:0">GET TICKETS →</a>` : ''}`;
      list.appendChild(r);
    });
  }
})();
// About image
(function(){ if(window.ABOUT_IMAGE){ const box=document.getElementById('about-image'); box.classList.add('has-img'); box.innerHTML=`<img src="${ABOUT_IMAGE}" alt="Pulse Index — visual">`; box.onclick=()=>openLightbox(ABOUT_IMAGE,'Pulse Index'); } })();
// keep the sticky archive header sitting right under the top bar
(function(){ const set=()=>document.documentElement.style.setProperty('--barh', document.getElementById('freqbar').offsetHeight+'px'); set(); addEventListener('resize', set); })();

/* ---------------- ARCHIVE — filing cabinet ----------------
   Most recent folder sits at the top of the drawer. Tabs step across in
   fixed columns so every label stays visible; contents are built the
   first time a folder is opened. */
(function(){
  const cab=document.getElementById('cabinet');
  [...archived].reverse().forEach((e,i)=>{
    const f=document.createElement('div'); f.className='folder'; f.id='folder-'+e.id;
    const lineup=lineupText(e);
    f.innerHTML=`<div class="tab" style="margin-left:${(i%5)*17}%"><span class="fid">${e.id}</span><span>${e.date}</span></div>
      <div class="body">
        <div class="cover">
          <div><div class="label">${TYPE_LABELS[e.type]||e.type}</div><div class="fname">${e.name}</div>${lineup?`<div class="lineup">${lineup}</div>`:''}</div>
          <div><span class="stamp">ARCHIVED</span><button class="fclose">CLOSE ✕</button></div>
        </div>
        <div class="contents"></div>
      </div>`;
    const toggle=()=> f.classList.contains('open') ? closeFolder(f) : openFolder(e.id);
    f.querySelector('.tab').onclick=toggle;
    f.querySelector('.cover').onclick=toggle;
    cab.appendChild(f);
  });
})();
function closeFolder(f){ f.classList.remove('open'); setHash('archive'); }
function openFolder(id){
  const e=EVENTS.find(x=>x.id===id); if(!e) return;
  if(!document.getElementById('view-archive').classList.contains('active')) showView('archive');
  closeFile();
  document.querySelectorAll('.folder.open').forEach(closeFolder);
  const f=document.getElementById('folder-'+id);
  const c=f.querySelector('.contents');
  if(!c.dataset.built){ c.innerHTML=folderHead(e)+fileLayers(e); c.dataset.built='1'; }
  f.classList.add('open'); setHash(id);
  c.querySelectorAll('.layer').forEach((l,i)=>{ l.classList.remove('show'); setTimeout(()=>l.classList.add('show'), 80*i+120); });
  setTimeout(()=>f.scrollIntoView({behavior:'smooth', block:'start'}), 60);
}
function folderHead(e){
  const sp = e.space ? SPACES[e.space] : null;
  const contents=[e.posterUrl?'1 poster':'', (e.docPhotos||[]).length?`${e.docPhotos.length} photos`:'', (e.videos||[]).length?`${e.videos.length} video${e.videos.length>1?'s':''}`:'', (e.promoCards||[]).length?`${e.promoCards.length} promo cards`:''].filter(Boolean).join(' · ');
  const row=(k,v)=> v ? `<div class="row"><span>${k}</span><span>${v}</span></div>` : '';
  return `<div class="folder-head">
    ${e.posterUrl ? `<div class="clip" onclick="openLightbox('${e.posterUrl}','${e.name.replace(/'/g,"\\'")} — poster')"><img src="${e.posterUrl}" alt="${e.name} poster"></div>` : '<div></div>'}
    <div class="sheet">
      ${row('FILE', e.id)}${row('TYPE', TYPE_LABELS[e.type]||e.type)}${row('DATE', e.date + (e.time?' · '+e.time:''))}
      ${row('LOCATION', sp ? (sp.mapUrl?`<a href="${sp.mapUrl}" target="_blank" rel="noopener">${sp.name}${sp.address?', '+sp.address:', '+sp.city}</a>`:`${sp.name}${sp.address?', '+sp.address:', '+sp.city}`) : '')}
      ${row(e.type==='WORKSHOP'?'FACILITATOR':'ARTISTS', lineupText(e))}${row('DOCUMENTED BY', (e.documentation||[]).map(a=>ARTISTS[a].name).join(' / '))}
      ${row('CONTENTS', contents)}${row('STATUS', e.status)}
    </div>
  </div>`;
}

/* ---------------- EVENT FILE / UNBOXING ---------------- */
function bioHtml(b, style){ return (b||'').split(/\n\s*\n/).map(p=>`<p style="${style}">${p.trim()}</p>`).join(''); }
function artistBlock(a){
  const ar = ARTISTS[a];
  const links = (ar.links||[]).map(l=>`<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join('');
  return `<div style="margin-bottom:14px;display:flex;gap:10px;align-items:flex-start">
    ${ar.photoUrl?`<img src="${ar.photoUrl}" alt="${ar.name}" style="width:56px;height:56px;object-fit:cover;border:1px solid var(--line);flex:0 0 auto">`:''}
    <div>
      <div style="font-family:var(--disp);font-weight:600;font-size:14px">${ar.name} <span style="font-family:var(--mono);font-weight:400;font-size:10px;color:var(--grey)">/ ${ar.role}</span></div>
      ${ar.bio?bioHtml(ar.bio,'margin:4px 0 8px;font-size:12px;max-width:640px'):''}
      ${links}
    </div>
  </div>`;
}
function galleryItem(src, cap){
  return `<div class="gallery-item" onclick="openLightbox('${src}','${(cap||'').replace(/'/g,"\\'")}')" style="cursor:pointer">
    <img src="${src}" alt="${cap||''}"><div class="cap">${cap||''}</div>
  </div>`;
}
function fileLayers(e){
  const sp = e.space ? SPACES[e.space] : null;
  const isIncoming = e.status==='INCOMING';
  const docIncoming = `<div class="layer"><div class="lhead">DOCUMENTATION</div><div class="doc-incoming">
    <span class="status-tag">DOCUMENTATION INCOMING</span>
    <a href="mailto:pulseindex.platform@gmail.com?subject=Documentation%20%E2%80%94%20${encodeURIComponent(e.id+' '+e.name)}">SUBMIT YOUR OWN →</a>
  </div></div>`;
  const artistBlocks = e.artists.map(artistBlock).join('') || '<span style="color:var(--grey)">no linked artists on file</span>';
  const docBlocks = (e.documentation||[]).map(artistBlock).join('');
  const venueLine = sp ? (sp.address ? `<a href="${sp.mapUrl||'#'}" target="_blank" rel="noopener">${sp.name}, ${sp.address}</a>` : `${sp.name}, ${sp.city}`) + (sp.link?` &nbsp;<a href="${sp.link}" target="_blank" rel="noopener">(venue link)</a>`:'') : '';
  const eventLinks = (e.links||[]).map(l=>`<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join('');
  const ticketBlock = e.ticketUrl ? `<div class="layer"><div class="lhead">TICKETS</div><a href="${e.ticketUrl}" target="_blank" rel="noopener" class="tune-btn" style="display:inline-block">GET TICKETS →</a></div>` : '';

  // Visual Identity holds only ADDITIONAL art (poster shown once, in the header, not repeated here)
  const visualAssets = (e.promoCards||[]).map(c=>galleryItem(c.src, c.cap));
  const docPhotos = (e.docPhotos||[]).map(p=>galleryItem(p.src, p.cap));
  const videoItems = (e.videos||[]).map(v=>`<a class="gallery-item video-link" href="https://youtu.be/${v.id}" target="_blank" rel="noopener" style="grid-column:1/-1;text-decoration:none">
    <div style="font-family:var(--disp);font-weight:600;font-size:15px">▶ ${v.cap}</div>
    <div class="cap">Video on YouTube — opens in a new tab ↗</div></a>`);

  return `
    <div class="layer"><div class="lhead">DESCRIPTION</div><p style="margin:0">${e.description || `Documentation for ${e.name}, transmitted ${e.date}${sp?' from '+sp.name+', '+sp.city:''}. Full archival notes pending digitisation.`}</p></div>
    ${sp ? `<div class="layer"><div class="lhead">VENUE</div>${sp.description?`<p style="margin:0 0 8px">${sp.description}</p>`:''}<div class="related-list">${venueLine}</div></div>` : ''}
    ${isIncoming && (e.price || e.ticketUrl) ? `<div class="layer"><div class="lhead">TICKETS</div>${e.price?`<p style="margin:0 0 4px">${e.price}${e.ticketNote?'<br>'+e.ticketNote:''}</p>`:''}${e.ticketUrl?`<a href="${e.ticketUrl}" target="_blank" rel="noopener" class="tune-btn">GET TICKETS →</a>`:''}</div>` : ''}
    ${visualAssets.length ? `<div class="layer"><div class="lhead">VISUAL IDENTITY</div><div class="gallery-grid">${visualAssets.join('')}</div></div>` : ''}
    <div class="layer"><div class="lhead">${e.type==='WORKSHOP'?'FACILITATOR':'ARTISTS'}</div>${artistBlocks}</div>
    ${isIncoming ? docIncoming : `    <div class="layer"><div class="lhead">DOCUMENTATION</div>
      <div class="gallery-grid" style="margin-bottom:${docBlocks?'14px':'0'}">
        ${videoItems.join('')}${(docPhotos.length||videoItems.length) ? docPhotos.join('') : `<div class="gallery-item"><div class="poster-frame" style="aspect-ratio:4/3">CONTACT SHEET — PLACEHOLDER</div></div><div class="gallery-item"><div class="monitor"></div></div>`}
      </div>
      ${docBlocks || '<p style="color:var(--grey);margin:0">No documenter credited yet.</p>'}
    </div>
`}
    ${eventLinks ? `<div class="layer"><div class="lhead">LINKS</div><div class="related-list">${eventLinks}</div></div>` : ''}
  `;
}
function openFile(id){
  const e = EVENTS.find(x=>x.id===id);
  const sp = e.space ? SPACES[e.space] : null;
  document.getElementById('file-content').innerHTML = `
    <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap; margin:30px 0 20px">
      <div class="file-head" style="flex:1; min-width:180px; margin:0">
        <div class="fid">PULSE INDEX / ${TYPE_LABELS[e.type]||e.type} / FILE ${e.id}</div>
        <div class="ftitle">${e.name}</div>
        <div class="mono" style="font-size:11px;color:var(--grey)">${e.date}${e.time?' · '+e.time:''}${sp?' · '+sp.city.toUpperCase():''}</div>
        <div class="mono" style="font-size:11px;margin-top:8px">STATUS: ${e.status}</div>
      </div>
      ${e.posterUrl ? `<div class="poster-box" onclick="openLightbox('${e.posterUrl}','${e.name.replace(/'/g,"\\'")} — poster')"><img src="${e.posterUrl}" alt="${e.name} poster"></div>` : ''}
    </div>
` + fileLayers(e);
  document.getElementById('filepanel').classList.add('open'); setHash(id);
  document.getElementById('filepanel').scrollTop = 0;
  document.querySelectorAll('#file-content .layer').forEach((l,i)=>{
    l.classList.remove('show');
    setTimeout(()=>l.classList.add('show'), 80*i+60);
  });
}
document.getElementById('file-close').onclick = closeFile;
function openLightbox(src, cap){
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-cap').textContent = cap||'';
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox(){ document.getElementById('lightbox').classList.remove('open'); }
document.getElementById('lightbox-close').onclick = closeLightbox;
document.getElementById('lightbox').addEventListener('click', e=>{ if(e.target.id==='lightbox') closeLightbox(); });
function closeFile(){
  const fp=document.getElementById('filepanel'); if(fp.classList.contains('open')){ const v=currentView(); setHash(v==='signal'?'':v); }
  fp.classList.remove('open');
}

/* ---------------- NETWORK ---------------- */
let netCity='ALL', netCat='ALL';
const nodePos={}; // id -> {x,y} — set once a node has been dragged, overrides the generated layout
const NETVB={x:0,y:0,w:700,h:500}; // pan/zoom state — kept within these starting bounds
const TAG_COLORS = {AUDIO:'#e4531f', VISUAL:'#5c7a8c', DOCUMENTATION:'#8c6b4a'};
function drawNetwork(){
  const svg=document.getElementById('netsvg');
  const cityMatch = c => netCity==='ALL' || (c||'').includes(netCity);
  const catMatch = tags => netCat==='ALL' || tags.includes(netCat);
  // an artist also counts for a city if they appeared at an event held there
  const playedIn = id => netCity!=='ALL' && EVENTS.some(e => [...e.artists, ...(e.documentation||[])].includes(id)
      && e.space && SPACES[e.space] && (SPACES[e.space].city||'').includes(netCity));
  const onFile = EVENTS.flatMap(e=>[...e.artists, ...(e.documentation||[])]);
  const usedArtists = [...new Set([...onFile, ...onFile.flatMap(id=>ARTISTS[id].members||[])])]
    .filter(id => (cityMatch(ARTISTS[id].city) || playedIn(id)) && catMatch(ARTISTS[id].tags));
  const usedSpaces = [...new Set(EVENTS.filter(e=>e.space).map(e=>e.space))]
    .filter(id => cityMatch(SPACES[id].city));
  const cx=350, cy=250;
  // elliptical radii kept comfortably inside the 700x500 viewBox so nothing runs off-canvas.
  // nodePos[id], if set by dragging, overrides the generated position.
  const artistNodes = usedArtists.map((id,i)=>{
    const a=usedArtists.length, ang=(i/a)*Math.PI*2 - Math.PI/2;
    const gen={x:cx+Math.cos(ang)*285, y:cy+Math.sin(ang)*195};
    return {id, ...(nodePos[id]||gen), rad:16, label:ARTISTS[id].name.toUpperCase(), tags:ARTISTS[id].tags};
  });
  const spaceNodes = usedSpaces.map((id,i)=>{
    const a=usedSpaces.length, ang=(i/a)*Math.PI*2 - Math.PI/2;
    const gen={x:cx+Math.cos(ang)*110, y:cy+Math.sin(ang)*70};
    return {id, ...(nodePos[id]||gen), rad:20, label:SPACES[id].name.toUpperCase(), tags:['SPACE']};
  });
  const nodes=[...artistNodes,...spaceNodes];
  const links=[];
  EVENTS.forEach(e=>{
    const people=[...e.artists, ...(e.documentation||[])];
    people.forEach(a=>{ if(e.space) links.push([a,e.space]); });
    for(let i=0;i<people.length;i++) for(let j=i+1;j<people.length;j++) links.push([people[i],people[j]]);
  });
  const memberLinks = Object.values(ARTISTS).flatMap(a=>(a.members||[]).map(m=>[a.id,m]));
  let svgHtml='<defs>';
  // multi-tag artists (e.g. Static Channel = AUDIO+VISUAL) get a gradient stroke blending both colors
  nodes.filter(n=>n.tags.length>1).forEach(n=>{
    const stops = n.tags.map((t,i)=>`<stop offset="${i/(n.tags.length-1)*100}%" stop-color="${TAG_COLORS[t]||'#888'}"/>`).join('');
    svgHtml += `<linearGradient id="grad-${n.id}" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>`;
  });
  svgHtml += '</defs>';
  links.forEach(([a,b])=>{
    const A=nodes.find(n=>n.id===a), B=nodes.find(n=>n.id===b);
    if(A&&B) svgHtml+=`<line data-a="${a}" data-b="${b}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
  });
  memberLinks.forEach(([a,b])=>{
    const A=nodes.find(n=>n.id===a), B=nodes.find(n=>n.id===b);
    if(A&&B) svgHtml+=`<line class="member" data-a="${a}" data-b="${b}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
  });
  if(!nodes.length) svgHtml += `<text x="350" y="250" text-anchor="middle" style="fill:var(--grey)">NO SIGNAL IN THIS FILTER</text>`;
  nodes.forEach(n=>{
    const cls = n.tags.map(t=>'tag-'+t).join(' ');
    const strokeOverride = n.tags.length>1 ? ` style="stroke:url(#grad-${n.id})"` : '';
    svgHtml+=`<g class="netnode ${cls}" data-id="${n.id}" data-r="${n.rad}">
      <circle r="${n.rad}" cx="${n.x}" cy="${n.y}"${strokeOverride}/>
      <text x="${n.x}" y="${n.y+n.rad+14}" text-anchor="middle">${n.label}</text>
    </g>`;
  });
  svg.innerHTML = svgHtml;
  svg.querySelectorAll('.netnode').forEach(g=>{ g.style.cursor='grab'; });
}
/* pan + zoom + per-node dragging on the network canvas. Note: pointer
   capture retargets the synthetic 'click' event to the SVG itself, so
   node selection is done here directly (tap = pointerdown+up with no
   real movement) instead of relying on click listeners on individual
   nodes. Starting a drag ON a node moves that node; starting on empty
   canvas pans the whole view. */
(function(){
  const svg=document.getElementById('netsvg');
  const setVB=()=>svg.setAttribute('viewBox', `${NETVB.x} ${NETVB.y} ${NETVB.w} ${NETVB.h}`);
  setVB();
  const toSvgPoint=(clientX,clientY)=>{
    const rect=svg.getBoundingClientRect();
    return { x: NETVB.x + (clientX-rect.left)/rect.width*NETVB.w,
             y: NETVB.y + (clientY-rect.top)/rect.height*NETVB.h };
  };
  let dragging=false, moved=false, lastX=0, lastY=0, startX=0, startY=0, downId=null;
  svg.addEventListener('pointerdown', e=>{
    dragging=true; moved=false;
    lastX=startX=e.clientX; lastY=startY=e.clientY;
    const g=e.target.closest('.netnode');
    downId = g ? g.dataset.id : null;
    if(downId) svg.style.cursor='grabbing';
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', e=>{
    if(!dragging) return;
    if(Math.abs(e.clientX-startX)>4 || Math.abs(e.clientY-startY)>4) moved=true;
    if(downId){
      // dragging a single node: move its circle/label and any connected lines
      const pt=toSvgPoint(e.clientX,e.clientY);
      const g=svg.querySelector(`.netnode[data-id="${downId}"]`);
      if(!g) return;
      const rad=+g.dataset.r;
      g.querySelector('circle').setAttribute('cx',pt.x); g.querySelector('circle').setAttribute('cy',pt.y);
      const t=g.querySelector('text'); t.setAttribute('x',pt.x); t.setAttribute('y',pt.y+rad+14);
      svg.querySelectorAll(`line[data-a="${downId}"]`).forEach(l=>{ l.setAttribute('x1',pt.x); l.setAttribute('y1',pt.y); });
      svg.querySelectorAll(`line[data-b="${downId}"]`).forEach(l=>{ l.setAttribute('x2',pt.x); l.setAttribute('y2',pt.y); });
      nodePos[downId]={x:pt.x,y:pt.y};
    } else {
      const scale=NETVB.w/svg.clientWidth;
      NETVB.x -= (e.clientX-lastX)*scale; NETVB.y -= (e.clientY-lastY)*scale;
      setVB();
    }
    lastX=e.clientX; lastY=e.clientY;
  });
  svg.addEventListener('pointerup', ()=>{
    dragging=false; svg.style.cursor='grab';
    if(!moved && downId) selectNode(downId);
  });
  svg.addEventListener('pointerleave', ()=>{ dragging=false; svg.style.cursor='grab'; });
  svg.addEventListener('wheel', e=>{
    e.preventDefault();
    const factor = Math.exp(Math.max(-40, Math.min(40, e.deltaY)) * 0.0012); // gentle, works for mouse wheels and trackpads
    const newW=Math.min(1400,Math.max(300,NETVB.w*factor));
    const newH=newW*(500/700);
    NETVB.x += (NETVB.w-newW)/2; NETVB.y += (NETVB.h-newH)/2;
    NETVB.w=newW; NETVB.h=newH; setVB();
  }, {passive:false});
})();
document.querySelectorAll('#net-filters button[data-city]').forEach(b=>b.addEventListener('click', ()=>{
  document.querySelectorAll('#net-filters button[data-city]').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); netCity=b.dataset.city; drawNetwork();
}));
document.querySelectorAll('#net-filters button[data-cat]').forEach(b=>b.addEventListener('click', ()=>{
  document.querySelectorAll('#net-filters button[data-cat]').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); netCat=b.dataset.cat; drawNetwork();
}));
function groupsOf(id){ return Object.values(ARTISTS).filter(a=>(a.members||[]).includes(id)); }
function eventLinksFor(list){
  return list.map(e=>{
    const venueNamed = e.space && SPACES[e.space] && SPACES[e.space].name===e.name;
    const what = `<span style="color:var(--sig)">${e.id}</span> &nbsp;${e.date} — ${TYPE_LABELS[e.type]||e.type}${venueNamed?'':`<br><span style="color:var(--ink)">${e.name}</span>`}`;
    return e.status==='ARCHIVED'
      ? `<a href="#" class="onfile" onclick="event.preventDefault(); document.getElementById('netdetail').classList.remove('open'); openFolder('${e.id}')"><span class="go">open file →</span>${what}</a>`
      : `<a href="#" class="onfile" onclick="event.preventDefault(); openFile('${e.id}')"><span class="go">incoming →</span>${what}</a>`;
  }).join('') || '<span style="color:var(--grey)">none logged</span>';
}
function selectNode(id){
  const det=document.getElementById('netdetail');
  if(ARTISTS[id]){
    const a=ARTISTS[id];
    const evs=EVENTS.filter(e=>e.artists.includes(id) || (e.documentation||[]).includes(id));
    const links=(a.links||[]).map(l=>`<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join(' &nbsp; ');
    det.innerHTML=`<button class="close" id="net-close">CLOSE ✕</button>
      ${a.photoUrl?`<img src="${a.photoUrl}" alt="${a.name}" style="width:100%;max-width:180px;display:block;margin-bottom:8px;border:1px solid var(--line)">`:''}
      <div style="font-family:var(--disp);font-weight:600;font-size:16px">${a.name} <span style="font-family:var(--mono);font-weight:400;font-size:10px;color:var(--grey)">/ ${a.role} · ${a.tags.join(' + ')}${a.city?' · '+a.city:''}</span></div>
      ${a.bio?bioHtml(a.bio,'margin:6px 0'):''}
      <div class="netlinks">${links}</div>
      ${(a.members||[]).length?`<div class="label" style="margin-top:10px">MEMBERS</div><div class="netfiles">${a.members.map(m=>`<a href="#" onclick="event.preventDefault(); selectNode('${m}')">${ARTISTS[m].name} →</a>`).join('')}</div>`:''}
      ${groupsOf(id).length?`<div class="label" style="margin-top:10px">MEMBER OF</div><div class="netfiles">${groupsOf(id).map(g=>`<a href="#" onclick="event.preventDefault(); selectNode('${g.id}')">${g.name} →</a>`).join('')}</div>`:''}
      <div class="label" style="margin-top:10px">ON FILE</div><div class="netfiles">${eventLinksFor(evs)}</div>`;
  } else if(SPACES[id]){
    const s=SPACES[id];
    const evs=EVENTS.filter(e=>e.space===id);
    det.innerHTML=`<button class="close" id="net-close">CLOSE ✕</button>
      <div style="font-family:var(--disp);font-weight:600;font-size:16px">${s.name} <span style="font-family:var(--mono);font-weight:400;font-size:10px;color:var(--grey)">/ SPACE · ${s.city}</span></div>
      ${s.description?`<p style="margin:6px 0">${s.description}</p>`:''}
      ${s.address?`<p style="margin:6px 0;color:var(--grey)">${s.address}</p>`:''}
      <div class="netlinks">${s.link?`<a href="${s.link}" target="_blank" rel="noopener">venue link</a>`:''}</div>
      <div class="label" style="margin-top:10px">ON FILE</div><div class="netfiles">${eventLinksFor(evs)}</div>`;
  }
  det.classList.add('open');
  document.getElementById('net-close').onclick = ()=>det.classList.remove('open');
}
/* ---------------- DIRECT LINKS ----------------
   pulseindex…/#003 opens that event, #archive / #network / #about open a page. */
function route(){
  const h=decodeURIComponent(location.hash.slice(1)); if(!h) return;
  const ev=EVENTS.find(e=>e.id.toLowerCase()===h.toLowerCase());
  if(ev) (ev.status==='ARCHIVED' ? openFolder(ev.id) : openFile(ev.id));
  else if(document.getElementById('view-'+h)) showView(h);
}
route(); addEventListener('hashchange', route);
