/* =========================================================
   rCloud — Room Finder (drop-in client-side component)
   USAGE
     1. Place <div id="room-finder"></div> on any rCloud page.
     2. Place /data/cssp-schedule.json at site root (or set
        window.ROOMFINDER_DATA_URL before loading this script).
     3. <script src="/assets/js/roomfinder.js" defer></script>

   The component auto-injects minimal scoped CSS that falls back
   to the host page's native fonts, colors, link styles, and
   layout — no hardcoded theme. If rCloud defines --background,
   --foreground, --accent, --border, --muted CSS variables they
   are used automatically.
   ========================================================= */
(function () {
  "use strict";

  var DATA_URL = (window.ROOMFINDER_DATA_URL) || "/data/cssp-schedule.json";
  var CACHE_KEY = "cssp_schedule_v1";
  var CACHE_TTL  = 1000 * 60 * 60 * 12;

  var DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  var DAYS_SHORT = ["MON","TUE","WED","THU","FRI","SAT"];

  /* CSS is loaded separately as roomfinder.css (see RoomFinderClient.jsx).
     Do NOT inject <style> from JS here — Next.js/SSR and CSPs get happier. */
  var CSS_DONT_USE = [
    "#room-finder { box-sizing: border-box; }",
    "#room-finder *, #room-finder *::before, #room-finder *::after { box-sizing: inherit; }",
    "#room-finder { font-size: 1rem; line-height: 1.6; color: inherit; }",
    "#room-finder .rf-kicker { display:inline-block; font-size:.75rem; letter-spacing:.2em; text-transform:uppercase; font-weight:600; color:var(--accent, LinkText, #6b3fa0); margin-bottom:.75rem; }",
    "#room-finder h1.rf-h1 { font-family: inherit; font-weight:600; font-size: clamp(2.1rem, 5vw, 3.2rem); line-height:1.08; letter-spacing:-.02em; margin:0 0 .75rem; max-width:18ch; }",
    "#room-finder .rf-lede { font-size:1.05rem; max-width:60ch; margin:0 0 1.25rem; color: var(--muted, inherit); opacity:.8; }",
    "#room-finder .rf-ctas { display:flex; flex-wrap:wrap; gap:.6rem; margin:.5rem 0 1.5rem; }",
    "#room-finder .rf-btn { font:inherit; padding:.7rem 1.1rem; border-radius:6px; border:1px solid var(--border, ButtonBorder); background:ButtonFace; color:ButtonText; cursor:pointer; font-weight:600; font-size:.92rem; text-decoration:none; display:inline-flex; align-items:center; gap:.4rem; }",
    "#room-finder .rf-btn:hover { filter:brightness(.96); }",
    "#room-finder .rf-btn.rf-primary { background:var(--foreground, #111); color:var(--background,#fff); border-color:var(--foreground,#111); }",
    "#room-finder .rf-btn.rf-accent { background:var(--accent,#6b3fa0); color:#fff; border-color:var(--accent,#6b3fa0); }",
    "#room-finder .rf-btn.rf-ghost { background:transparent; color:var(--muted, inherit); opacity:.75; }",
    "#room-finder .rf-stats { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid var(--border, #ddd); border-radius:10px; overflow:hidden; margin:1.5rem 0; background:var(--card, transparent); }",
    "#room-finder .rf-stat { padding:1rem 1.2rem; border-right:1px solid var(--border,#ddd); }",
    "#room-finder .rf-stat:last-child { border-right:none; }",
    "#room-finder .rf-stat-num { font-size:1.8rem; font-weight:600; line-height:1; font-variant-numeric:tabular-nums; }",
    "#room-finder .rf-stat-label { font-size:.7rem; letter-spacing:.14em; text-transform:uppercase; opacity:.6; margin-top:.4rem; font-weight:700; }",
    "#room-finder .rf-panel { border:1px solid var(--border,#ddd); border-radius:12px; padding:1.25rem; margin:.8rem 0 1rem; background:var(--card, transparent); }",
    "#room-finder .rf-panel-kicker { display:inline-block; font-size:.7rem; letter-spacing:.18em; text-transform:uppercase; color:var(--accent,LinkText,#6b3fa0); font-weight:700; margin-bottom:.4rem; }",
    "#room-finder .rf-panel-title { font-size:1.35rem; font-weight:600; margin:0 0 .25rem; }",
    "#room-finder .rf-panel-sub { margin:0 0 1rem; opacity:.75; font-size:.9rem; }",
    "#room-finder .rf-search { position:relative; display:block; }",
    "#room-finder .rf-search input { width:100%; padding:.85rem 1rem .85rem 2.6rem; font:inherit; color:inherit; background:var(--background,#fff); border:1px solid var(--border,#ccc); border-radius:8px; outline:none; }",
    "#room-finder .rf-search input:focus { border-color:var(--accent,Highlight); box-shadow:0 0 0 3px color-mix(in srgb, var(--accent,#6b3fa0) 20%, transparent); }",
    "#room-finder .rf-search svg { position:absolute; left:.9rem; top:50%; transform:translateY(-50%); width:1.1rem; height:1.1rem; opacity:.55; }",
    "#room-finder .rf-tabs { display:flex; gap:4px; border:1px solid var(--border,#ddd); border-radius:10px; padding:4px; background:color-mix(in srgb, var(--foreground,#000) 4%, transparent); overflow-x:auto; margin:.5rem 0; }",
    "#room-finder .rf-tab { flex:1; min-width:max-content; padding:.6rem .9rem; border:none; background:transparent; color:inherit; font:inherit; font-weight:600; font-size:.88rem; border-radius:7px; white-space:nowrap; cursor:pointer; opacity:.8; }",
    "#room-finder .rf-tab.rf-active { background:var(--card, #fff); opacity:1; box-shadow:0 1px 2px rgba(0,0,0,.06); }",
    "#room-finder .rf-filters { display:grid; gap:1.2rem; grid-template-columns:1fr; }",
    "@media (min-width: 720px) { #room-finder .rf-filters { grid-template-columns:1fr 1fr; } }",
    "#room-finder .rf-filters label { display:block; font-size:.7rem; letter-spacing:.14em; text-transform:uppercase; font-weight:700; opacity:.65; margin-bottom:.5rem; }",
    "#room-finder .rf-chips { display:flex; flex-wrap:wrap; gap:6px; }",
    "#room-finder .rf-chip { padding:.4rem .75rem; font:inherit; font-size:.82rem; font-weight:600; background:var(--card,#fff); color:inherit; border:1px solid var(--border,#ccc); border-radius:999px; cursor:pointer; }",
    "#room-finder .rf-chip.rf-active { background:var(--foreground,#111); color:var(--background,#fff); border-color:var(--foreground,#111); }",
    "#room-finder .rf-toggles { display:flex; gap:8px; flex-wrap:wrap; margin-top:.5rem; }",
    "#room-finder .rf-toggle { padding:.4rem .75rem; font:inherit; font-size:.8rem; font-weight:600; border-radius:999px; border:1px solid var(--border,#ccc); background:var(--card,#fff); color:inherit; display:inline-flex; align-items:center; gap:.35rem; cursor:pointer; }",
    "#room-finder .rf-toggle .rf-dot { width:8px; height:8px; border-radius:999px; background:currentColor; }",
    "#room-finder .rf-toggle.rf-free.rf-active { color:#15803d; border-color:#c6e5d1; background:#e7f5ec; }",
    "#room-finder .rf-toggle.rf-busy.rf-active { color:#b91c1c; border-color:#f3c7c1; background:#fce8e6; }",
    "#room-finder .rf-rhead { display:flex; justify-content:space-between; align-items:baseline; margin:.75rem 0 .5rem; padding-bottom:.5rem; border-bottom:1px solid var(--border,#ddd); }",
    "#room-finder .rf-rhead h3 { margin:0; font-size:1.1rem; font-weight:600; }",
    "#room-finder .rf-count { font-size:.8rem; opacity:.6; font-variant-numeric:tabular-nums; }",
    "#room-finder .rf-grid { display:grid; grid-template-columns:1fr; gap:.75rem; }",
    "@media (min-width: 560px) { #room-finder .rf-grid { grid-template-columns:repeat(2,1fr); } }",
    "@media (min-width: 900px) { #room-finder .rf-grid { grid-template-columns:repeat(3,1fr); } }",
    "#room-finder .rf-card { border:1px solid var(--border,#ddd); border-radius:10px; padding:1rem; background:var(--card,#fff); cursor:pointer; display:flex; flex-direction:column; gap:.4rem; transition:border-color .15s; }",
    "#room-finder .rf-card:hover { border-color:var(--accent,#6b3fa0); }",
    "#room-finder .rf-card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:.5rem; }",
    "#room-finder .rf-card-title { font-size:1.3rem; font-weight:600; line-height:1.1; }",
    "#room-finder .rf-meta { font-size:.88rem; opacity:.85; }",
    "#room-finder .rf-meta strong { font-weight:600; opacity:1; color:inherit; }",
    "#room-finder .rf-muted { opacity:.6; font-size:.82rem; margin-top:.15rem; }",
    "#room-finder .rf-tmet { font-size:.78rem; opacity:.55; font-variant-numeric:tabular-nums; }",
    "#room-finder .rf-badge { display:inline-flex; align-items:center; gap:.35rem; padding:.2rem .55rem; border-radius:999px; font-size:.72rem; font-weight:700; border:1px solid transparent; white-space:nowrap; }",
    "#room-finder .rf-badge .rf-dot { width:7px; height:7px; border-radius:999px; background:currentColor; }",
    "#room-finder .rf-free { color:#15803d; background:#e7f5ec; border-color:#c6e5d1; }",
    "#room-finder .rf-busy { color:#b91c1c; background:#fce8e6; border-color:#f3c7c1; }",
    "#room-finder .rf-none { color:#6b7280; background:#f1eee6; border-color:#ded8c7; }",
    "#room-finder .rf-tag { display:inline-block; padding:.2rem .55rem; border-radius:999px; font-size:.72rem; font-weight:700; background:color-mix(in srgb, var(--foreground,#000) 6%, transparent); border:1px solid var(--border,#ddd); }",
    "#room-finder .rf-empty { text-align:center; padding:2rem 1rem; color:var(--muted, inherit); opacity:.7; border:1px dashed var(--border,#ccc); border-radius:10px; grid-column:1/-1; }",
    "#room-finder .rf-empty svg { width:2.2rem; height:2.2rem; margin:0 auto .5rem; opacity:.7; }",
    "#room-finder .rf-empty-title { font-weight:600; font-size:1.05rem; margin-bottom:.25rem; color:var(--foreground, inherit); opacity:1; }",
    "#room-finder .rf-empty p { margin:0; font-size:.88rem; }",
    "#room-finder .rf-dtitle { display:flex; justify-content:space-between; align-items:center; gap:.5rem; margin-bottom:.75rem; flex-wrap:wrap; }",
    "#room-finder .rf-dtitle h2 { margin:0; font-size:1.6rem; font-weight:600; }",
    "#room-finder .rf-dstats { display:grid; grid-template-columns:repeat(2,1fr); gap:.6rem; margin-bottom:1rem; }",
    "@media (min-width:560px){ #room-finder .rf-dstats { grid-template-columns:repeat(4,1fr); } }",
    "#room-finder .rf-stat-s { border:1px solid var(--border,#ddd); border-radius:8px; padding:.75rem .9rem; background:var(--background,transparent); }",
    "#room-finder .rf-stat-l { font-size:.66rem; letter-spacing:.12em; text-transform:uppercase; font-weight:700; opacity:.6; }",
    "#room-finder .rf-stat-v { font-size:.9rem; font-weight:600; margin-top:.35rem; line-height:1.35; }",
    "#room-finder .rf-stat-v-dim { font-weight:500; opacity:.7; font-size:.82rem; }",
    "#room-finder .rf-tl-h { font-size:1rem; font-weight:600; margin:.5rem 0 .5rem; }",
    "#room-finder .rf-timeline { display:flex; flex-direction:column; gap:.4rem; }",
    "#room-finder .rf-tl { display:grid; grid-template-columns:130px 1fr; gap:.8rem; padding:.75rem 1rem; border:1px solid var(--border,#ddd); border-left:3px solid var(--accent,#6b3fa0); border-radius:6px; background:var(--background,transparent); }",
    "#room-finder .rf-tl.rf-tl-free { border-left-color:#15803d; }",
    "#room-finder .rf-tl-time { font-size:.82rem; font-weight:700; color:var(--accent,#6b3fa0); font-variant-numeric:tabular-nums; }",
    "#room-finder .rf-tl.rf-tl-free .rf-tl-time { color:#15803d; }",
    "#room-finder .rf-tl-course { font-weight:600; }",
    "#room-finder .rf-tl.rf-tl-free .rf-tl-course { color:#15803d; }",
    "#room-finder .rf-tl-sub { font-size:.82rem; opacity:.65; margin-top:.15rem; }",
    "@media (max-width:520px){ #room-finder .rf-tl { grid-template-columns:1fr; gap:.25rem; } }",
    "#room-finder .rf-callout { padding:1rem; border:1px solid #c6e5d1; background:#e7f5ec; border-radius:10px; margin-bottom:.8rem; }",
    "#room-finder .rf-callout .rf-callout-sub { margin:.25rem 0 0; font-size:.86rem; opacity:.85; }",
    "#room-finder .rf-wic { display:flex; gap:.5rem; flex-wrap:wrap; }",
    "#room-finder .rf-wic input { flex:1; min-width:14rem; padding:.75rem .9rem; font:inherit; background:var(--background,#fff); color:inherit; border:1px solid var(--border,#ccc); border-radius:6px; outline:none; }",
    "#room-finder .rf-wic input:focus { border-color:var(--accent,Highlight); }",
    "#room-finder .rf-wic-out { display:grid; gap:.7rem; margin-top:.8rem; }",
    "#room-finder .rf-wic-card { border:1px solid var(--border,#ddd); border-radius:10px; padding:1rem; background:var(--card,#fff); }",
    "#room-finder .rf-wic-top { display:flex; justify-content:space-between; gap:.5rem; flex-wrap:wrap; }",
    "#room-finder .rf-big { font-size:1.3rem; font-weight:600; line-height:1.1; }",
    "#room-finder .rf-wic-grid { margin-top:.8rem; display:grid; grid-template-columns:repeat(2,1fr); gap:.6rem; }",
    "@media (min-width:560px){ #room-finder .rf-wic-grid { grid-template-columns:repeat(4,1fr); } }",
    "#room-finder .rf-k { font-size:.66rem; letter-spacing:.12em; text-transform:uppercase; font-weight:700; opacity:.6; }",
    "#room-finder .rf-v { font-weight:600; font-size:.88rem; margin-top:.25rem; }",
    "#room-finder .rf-wic-foot { margin-top:.8rem; padding-top:.6rem; border-top:1px solid var(--border,#ddd); font-size:.85rem; }",
    "#room-finder .rf-link { background:none; border:none; color:var(--accent,LinkText); font:inherit; font-weight:600; cursor:pointer; padding:0; }",
    "#room-finder .rf-link:hover { text-decoration:underline; }",
    "#room-finder .rf-table-wrap { overflow-x:auto; border:1px solid var(--border,#ddd); border-radius:8px; }",
    "#room-finder table.rf-table { width:100%; border-collapse:collapse; font-size:.88rem; }",
    "#room-finder table.rf-table th, #room-finder table.rf-table td { padding:.7rem .9rem; text-align:left; border-bottom:1px solid var(--border,#ddd); }",
    "#room-finder table.rf-table th { background:color-mix(in srgb, var(--foreground,#000) 4%, transparent); font-size:.7rem; text-transform:uppercase; letter-spacing:.1em; font-weight:700; cursor:pointer; opacity:.7; }",
    "#room-finder table.rf-table th:hover { color:var(--accent,LinkText); opacity:1; }",
    "#room-finder table.rf-table tbody tr { cursor:pointer; }",
    "#room-finder table.rf-table tbody tr:hover { background:color-mix(in srgb, var(--accent,#6b3fa0) 8%, transparent); }",
    "#room-finder .rf-sort { color:var(--accent,#6b3fa0); margin-left:4px; }",
    "#room-finder .rf-cards { display:none; }",
    "#room-finder .rf-scard { border:1px solid var(--border,#ddd); border-radius:8px; padding:.85rem; }",
    "#room-finder .rf-scard + .rf-scard { margin-top:.4rem; }",
    "#room-finder .rf-sc-top { display:flex; justify-content:space-between; gap:.5rem; font-weight:600; font-size:1.05rem; margin-bottom:.2rem; }",
    "#room-finder .rf-sc-meta { font-size:.82rem; opacity:.8; }",
    "@media (max-width:640px){ #room-finder .rf-table-wrap { display:none; } #room-finder .rf-cards { display:grid; } }",
    "#room-finder .rf-notice { margin-top:1.2rem; padding:.85rem 1rem; border-radius:8px; font-size:.86rem; line-height:1.5; background:#fbf1d6; border:1px solid #f0dfa5; color:#92630a; }",
    "#room-finder .rf-notice strong { color:#6e4805; }",
    "#room-finder .rf-notice.rf-sample { background:#fff4e0; border-color:#eacb8e; color:#7a4f0d; display:none; }",
    "#room-finder .rf-notice.rf-sample.show { display:block; }",
    "#room-finder .rf-offline-banner { background:color-mix(in srgb, var(--accent,#6b3fa0) 10%, transparent); border-color:color-mix(in srgb, var(--accent,#6b3fa0) 30%, transparent); color:var(--accent,#6b3fa0); display:none; }",
    "#room-finder.rf-from-cache .rf-offline-banner { display:block; }",
    "#room-finder .rf-meta { margin-top:1rem; padding-top:.8rem; border-top:1px solid var(--border,#ddd); display:flex; flex-wrap:wrap; gap:.4rem 1.5rem; font-size:.78rem; opacity:.65; }",
    "#room-finder .rf-meta strong { font-weight:600; }",
    "#room-finder .rf-vh { position:absolute !important; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }",
    "#room-finder code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background:color-mix(in srgb, var(--foreground,#000) 6%, transparent); padding:1px 5px; border-radius:4px; font-size:.82em; }",
    "@media (max-width:520px){ #room-finder .rf-stats { grid-template-columns:1fr; } #room-finder .rf-stat { border-right:none; border-bottom:1px solid var(--border,#ddd); } #room-finder .rf-stat:last-child { border-bottom:none; } }",
    "@media (prefers-reduced-motion: reduce) { #room-finder * { animation-duration:.001ms !important; transition-duration:.001ms !important; scroll-behavior:auto !important; } }"
  ].join("\n");

  function injectCSS() {
    if (document.getElementById("rf-style")) return;
    var s = document.createElement("style");
    s.id = "rf-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- helpers ---------- */
  function $(s, r) { return (r||document).querySelector(s); }
  function h(tag, attrs, kids) {
    attrs = attrs||{}; kids = kids==null?[]:(Array.isArray(kids)?kids:[kids]);
    var n = document.createElement(tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs,k)) {
      var v = attrs[k];
      if (v==null || v===false) continue;
      if (k==="class") n.className=v;
      else if (k.slice(0,2)==="on" && typeof v==="function") n.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v===true) n.setAttribute(k,"");
      else n.setAttribute(k,v);
    }
    kids.forEach(function(c){
      if (c==null||c===false) return;
      n.appendChild((typeof c==="string"||typeof c==="number")?document.createTextNode(String(c)):c);
    });
    return n;
  }
  function svg(id, cls) {
    var ns = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(ns,"svg");
    if (cls) s.setAttribute("class",cls);
    s.setAttribute("viewBox","0 0 24 24");
    s.setAttribute("aria-hidden","true");
    s.setAttribute("fill","none");
    s.setAttribute("stroke","currentColor");
    s.setAttribute("stroke-width","2");
    s.setAttribute("stroke-linecap","round");
    s.setAttribute("stroke-linejoin","round");
    var u = document.createElementNS(ns,"use");
    u.setAttributeNS("http://www.w3.org/1999/xlink","href","#rf-i-"+id);
    u.setAttribute("href","#rf-i-"+id);
    s.appendChild(u);
    return s;
  }

  function parseTime(hm){ var p=hm.split(":").map(Number); return p[0]*60+p[1]; }
  function fmt12(hm){ var p=hm.split(":").map(Number); var per=p[0]>=12?"PM":"AM"; var hh=((p[0]+11)%12)+1; return hh+":"+String(p[1]).padStart(2,"0")+" "+per; }
  function fmtRng(a,b){ return fmt12(a)+"\u2013"+fmt12(b); }
  function nowHM(d){ d=d||new Date(); return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }
  function todayName(d){ d=d||new Date(); return ["Sunday"].concat(DAYS)[d.getDay()]; }
  function toHM(m){ return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"); }
  function badge(s){
    var label = s==="busy"?"Occupied":s==="free"?"Available":"No class";
    return h("span",{class:"rf-badge rf-"+s},[h("span",{class:"rf-dot","aria-hidden":"true"}),label]);
  }
  function tag(t){ return h("span",{class:"rf-tag"},t); }

  function statusAt(room, day, hm) {
    var t = parseTime(hm);
    var list = st.schedule.filter(function(s){return s.room===room&&s.day===day;}).sort(function(a,b){return parseTime(a.start)-parseTime(b.start);});
    var cur = list.find(function(s){ return t>=parseTime(s.start)&&t<parseTime(s.end); });
    if (cur) return {status:"busy",current:cur,next:null};
    var nx = list.find(function(s){ return parseTime(s.start)>t; })||null;
    if (!list.length) return {status:"none",current:null,next:null};
    return {status:"free",current:null,next:nx};
  }

  /* ---------- state ---------- */
  var st = { meta:{}, schedule:[], rooms:[], availableDays:[], mode:"room",
    filters:{day:null,time:null,status:null},
    sort:{key:"day",dir:"asc"}, detailRoom:null };
  var root;

  /* ---------- data ---------- */
  function cacheGet(){ try{var p=JSON.parse(localStorage.getItem(CACHE_KEY)); if(!p||!p.ts||!p.payload||Date.now()-p.ts>CACHE_TTL) return null; return p.payload;}catch(e){return null;} }
  function cachePut(p){ try{localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),payload:p}));}catch(e){} }
  function load(){
    var cached = cacheGet();
    function apply(d,fromCache){
      st.meta = d.metadata||{};
      st.schedule = (d.schedule||[]).map(function(x){return Object.assign({},x);});
      var rooms={}, days={};
      st.schedule.forEach(function(s){ if(s.room) rooms[s.room]=1; if(s.day) days[s.day]=1; });
      var mr = st.meta.rooms;
      var roomList = (Array.isArray(mr)&&mr.length)?mr:Object.keys(rooms);
      st.rooms = roomList.slice().sort(function(a,b){
        var na=parseInt(a,10),nb=parseInt(b,10);
        if(!isNaN(na)&&!isNaN(nb)&&na!==nb) return na-nb;
        return String(a).localeCompare(String(b),"en",{numeric:true});
      });
      st.availableDays = DAYS.filter(function(d){return days[d];});
      root.classList.toggle("rf-from-cache", !!fromCache);
      render();
    }
    if (cached) apply(cached,true);
    fetch(DATA_URL,{cache:"no-cache"}).then(function(r){ if(!r.ok) throw new Error(); return r.json(); })
      .then(function(d){ cachePut(d); apply(d,false); })
      .catch(function(){ if(!cached) fatal(); });
  }
  function fatal(){
    root.innerHTML = "";
    root.appendChild(h("div",{class:"rf-panel"},[
      h("p",{class:"rf-panel-title"},"Schedule unavailable"),
      h("p",{class:"rf-panel-sub"},"Couldn\u2019t load the schedule data. Please check your connection and try again.")
    ]));
  }

  /* ---------- DOM ---------- */
  function mount(){
    root = document.getElementById("room-finder");
    if (!root) return;
    root.innerHTML = "";

    // inline SVG sprite
    var sp = document.createElementNS("http://www.w3.org/2000/svg","svg");
    sp.setAttribute("width","0"); sp.setAttribute("height","0"); sp.style.position="absolute";
    sp.setAttribute("aria-hidden","true");
    sp.innerHTML = '<defs>'+
      '<symbol id="rf-i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></symbol>'+
      '<symbol id="rf-i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>'+
      '<symbol id="rf-i-box" viewBox="0 0 24 24"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></symbol>'+
      '</defs>';
    root.appendChild(sp);

    root.appendChild(h("p",{class:"rf-kicker"},"Room Finder"));
    root.appendChild(h("h1",{class:"rf-h1"},"Find a classroom. Check a schedule. Know where to go."));
    root.appendChild(h("p",{class:"rf-lede"},
      "A fast, student-facing viewer for CSSP classroom schedules. Look up a room, find your next class, or see which rooms are free right now."));

    var ctas = h("div",{class:"rf-ctas"});
    ctas.appendChild(h("button",{class:"rf-btn rf-primary",type:"button",onclick:function(){switchMode("room");}},"Find a room"));
    ctas.appendChild(h("button",{class:"rf-btn",type:"button",onclick:function(){switchMode("where");}},"Where is my class?"));
    ctas.appendChild(h("button",{class:"rf-btn rf-accent",type:"button",onclick:function(){switchMode("free");}},"What\u2019s free now"));
    root.appendChild(ctas);

    var strip = h("div",{class:"rf-stats"});
    strip.appendChild(h("div",{class:"rf-stat"},[h("div",{class:"rf-stat-num",id:"rf-nrooms"},"\u2014"),h("div",{class:"rf-stat-label"},"Rooms")]));
    strip.appendChild(h("div",{class:"rf-stat"},[h("div",{class:"rf-stat-num",id:"rf-nclasses"},"\u2014"),h("div",{class:"rf-stat-label"},"Scheduled classes")]));
    strip.appendChild(h("div",{class:"rf-stat"},[h("div",{class:"rf-stat-num",id:"rf-ndays"},"\u2014"),h("div",{class:"rf-stat-label"},"Days with schedules")]));
    root.appendChild(strip);

    var searchPanel = h("div",{class:"rf-panel"});
    searchPanel.appendChild(h("span",{class:"rf-panel-kicker"},"Quick search"));
    searchPanel.appendChild(h("h2",{class:"rf-panel-title"},"Where are you looking for a room?"));
    searchPanel.appendChild(h("p",{class:"rf-panel-sub"},"Search by room number, course code, or section. Everything runs on your device after the schedule loads."));
    var sw = h("label",{class:"rf-search"});
    sw.appendChild(svg("search"));
    var si = h("input",{type:"search",id:"rf-q",placeholder:"e.g. 301, PSY 115, BSP 3C",autocomplete:"off",spellcheck:"false"});
    si.addEventListener("input",function(){ if(st.mode==="room") renderRooms(); else if(st.mode==="class") renderClasses(); else if(st.mode==="table") renderTable(); });
    sw.appendChild(si);
    searchPanel.appendChild(sw);
    searchPanel.appendChild(h("div",{class:"rf-notice rf-offline-banner",role:"status"},[h("strong",{},"Offline mode. "),"You\u2019re viewing the most recently loaded schedule. Data may not be current."]));
    root.appendChild(searchPanel);

    var tabs = h("div",{class:"rf-tabs",role:"tablist"});
    [["room","Find a room"],["class","Find a class"],["free","What\u2019s free now"],["where","Where is my class"],["table","Full schedule"]].forEach(function(m){
      tabs.appendChild(h("button",{class:"rf-tab",type:"button","data-mode":m[0],role:"tab","aria-selected":m[0]==="room"?"true":"false",onclick:function(){switchMode(m[0]);}},m[1]));
    });
    root.appendChild(tabs);

    var fp = h("div",{class:"rf-panel rf-filters"});
    var dayG = h("div",{},[h("label",{},"Day"),h("div",{class:"rf-chips",id:"rf-days"})]);
    var timeG = h("div",{id:"rf-timeg"},[h("label",{},"Time"),h("div",{class:"rf-chips",id:"rf-times"})]);
    fp.appendChild(dayG); fp.appendChild(timeG);
    root.appendChild(fp);

    root.appendChild(h("section",{id:"rf-panel-room"},[
      h("div",{class:"rf-rhead"},[h("h3",{},"Rooms"),h("span",{class:"rf-count",id:"rf-crooms"},"Loading\u2026")]),
      h("div",{class:"rf-grid",id:"rf-rooms"}),
      h("div",{id:"rf-anchor"}),
      h("div",{class:"rf-panel rf-detail",id:"rf-detail",hidden:"hidden","aria-live":"polite"},[
        h("div",{class:"rf-dtitle"},[h("h2",{id:"rf-dtitle"}),h("button",{class:"rf-btn rf-ghost",type:"button",id:"rf-dclose"},"Close")]),
        h("div",{class:"rf-dstats",id:"rf-dstats"}),
        h("h3",{class:"rf-tl-h",id:"rf-tlh"}),
        h("div",{class:"rf-timeline",id:"rf-tl"})
      ])
    ]));
    root.appendChild(h("section",{id:"rf-panel-class",hidden:"hidden"},[
      h("div",{class:"rf-rhead"},[h("h3",{},"Classes"),h("span",{class:"rf-count",id:"rf-cclasses"},"\u2014")]),
      h("div",{class:"rf-grid",id:"rf-classes"})
    ]));
    root.appendChild(h("section",{id:"rf-panel-free",hidden:"hidden"},[
      h("div",{class:"rf-callout"},[
        h("span",{class:"rf-panel-kicker",style:"color:#15803d;"},"Using your local time"),
        h("h3",{style:"margin:2px 0 4px;font-size:1.05rem;"},"\u201CFree\u201D means no scheduled class was found."),
        h("p",{class:"rf-callout-sub"},"A room may still be reserved, locked, in maintenance, or used for an unscheduled activity. Availability shown is based on the published class schedule only.")
      ]),
      h("div",{class:"rf-rhead"},[h("h3",{},"Available rooms"),h("span",{class:"rf-count",id:"rf-cfree"},"\u2014")]),
      h("div",{class:"rf-grid",id:"rf-free"})
    ]));
    root.appendChild(h("section",{id:"rf-panel-where",hidden:"hidden"},[
      h("div",{class:"rf-panel"},[
        h("span",{class:"rf-panel-kicker"},"Class lookup"),
        h("h2",{class:"rf-panel-title"},"Where is my class?"),
        h("p",{class:"rf-panel-sub"},"Enter your course code or section \u2014 for example PSY 115 or BSP 3C."),
        h("form",{class:"rf-wic",onsubmit:function(e){e.preventDefault();runWIC();}},[
          h("label",{class:"rf-vh",for:"rf-wic-in"},"Course or section"),
          h("input",{type:"text",id:"rf-wic-in",placeholder:"Course / section",autocomplete:"off"}),
          h("button",{type:"button",class:"rf-btn rf-primary",id:"rf-wic-btn",onclick:runWIC},"Find")
        ])
      ]),
      h("div",{id:"rf-wic-out",class:"rf-wic-out"})
    ]));
    root.appendChild(h("section",{id:"rf-panel-table",hidden:"hidden"},[
      h("div",{class:"rf-panel"},[
        h("span",{class:"rf-panel-kicker"},"Full schedule"),
        h("h2",{class:"rf-panel-title"},"All scheduled classes"),
        h("p",{class:"rf-panel-sub"},"Tap any column header to sort. On phones, the table becomes cards. Use the search bar above to filter."),
        h("div",{class:"rf-table-wrap"},[h("table",{class:"rf-table"},[h("thead",[h("tr",{id:"rf-thead"})]),h("tbody",{id:"rf-tbody"})])]),
        h("div",{id:"rf-cards",class:"rf-cards"})
      ])
    ]));

    var disc = h("div",{class:"rf-notice",role:"note"},[
      h("strong",{},"A note on availability. "),
      h("span",{id:"rf-disc"},"Room availability is based on the published class schedule and does not guarantee physical access or availability.")
    ]);
    root.appendChild(disc);
    root.appendChild(h("div",{class:"rf-notice rf-sample",id:"rf-sample"},[
      h("strong",{},"Sample schedule. "),"Replace ",h("code",{},"/data/cssp-schedule.json")," with the official CSSP class schedule before publishing."
    ]));
    var meta = h("div",{class:"rf-meta"});
    meta.appendChild(h("div",{},[h("strong",{},"Schedule updated: "),h("span",{id:"rf-updated"},"\u2014")]));
    meta.appendChild(h("div",{},[h("strong",{},"Source: "),h("span",{id:"rf-source"},"\u2014")]));
    root.appendChild(meta);

    $("#rf-dclose",root).addEventListener("click",function(){ st.detailRoom=null; $("#rf-detail",root).hidden=true; });
  }

  function qstr(){ return ($("#rf-q",root)||{}).value||""; }
  function resolve(){
    var d = st.filters.day, t = st.filters.time, n=new Date();
    if (t==="NOW"||(!t&&st.filters.status)) t=nowHM(n);
    if (!d) d=todayName(n);
    return {day:d,time:t};
  }
  function match(e,s){
    if(!s) return true;
    var hay = [e.course,e.section,e.room,e.instructor,e.building,e.day].filter(Boolean).join(" ").toLowerCase();
    var sl=s.trim().toLowerCase();
    return hay.indexOf(sl)>=0 || hay.replace(/\s+/g,"").indexOf(sl.replace(/\s+/g,""))>=0;
  }
  function emptyEl(title,body){
    return h("div",{class:"rf-empty"},[
      svg("box"),
      h("div",{class:"rf-empty-title"},title),
      body?h("p",{},body):null
    ]);
  }
  function openDetail(r){ st.detailRoom=r; renderDetail(); $("#rf-anchor",root).scrollIntoView({behavior:"smooth",block:"start"}); }

  function renderDays(){
    var w=$("#rf-days",root); w.innerHTML="";
    w.appendChild(h("button",{class:"rf-chip"+(st.filters.day===null?" rf-active":""),type:"button",onclick:function(){st.filters.day=null;st.detailRoom=null;render();}},"All days"));
    st.availableDays.forEach(function(d){
      w.appendChild(h("button",{class:"rf-chip"+(st.filters.day===d?" rf-active":""),type:"button",onclick:function(){st.filters.day=d;st.detailRoom=null;render();}},DAYS_SHORT[DAYS.indexOf(d)]));
    });
  }
  function renderTimes(){
    var w=$("#rf-times",root); w.innerHTML="";
    w.appendChild(h("button",{class:"rf-chip"+(st.filters.time==="NOW"?" rf-active":""),type:"button",onclick:function(){st.filters.time="NOW";st.detailRoom=null;render();}},"Now"));
    for(var H=7;H<=20;H++){
      var v=String(H).padStart(2,"0")+":00";
      w.appendChild(h("button",{class:"rf-chip"+(st.filters.time===v?" rf-active":""),type:"button",onclick:(function(vv){return function(){st.filters.time=vv;st.detailRoom=null;render();};})(v)},fmt12(v)));
    }
    var tr=h("div",{class:"rf-toggles"});
    tr.appendChild(h("button",{class:"rf-toggle rf-free"+(st.filters.status==="free"?" rf-active":""),type:"button",onclick:function(){st.filters.status=st.filters.status==="free"?null:"free";render();}},[h("span",{class:"rf-dot"}),"Currently available"]));
    tr.appendChild(h("button",{class:"rf-toggle rf-busy"+(st.filters.status==="busy"?" rf-active":""),type:"button",onclick:function(){st.filters.status=st.filters.status==="busy"?null:"busy";render();}},[h("span",{class:"rf-dot"}),"Currently occupied"]));
    w.appendChild(tr);
  }

  function card(e, kind){
    var onclick=function(){
      st.detailRoom=e.room; st.filters.day=e.day; switchMode("room");
      $("#rf-anchor",root).scrollIntoView({behavior:"smooth",block:"start"});
    };
    return h("div",{class:"rf-card",tabindex:"0",role:"button",onclick:onclick,
      onkeydown:function(ev){if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();onclick();}}},[
      h("div",{class:"rf-card-top"},[h("div",{class:"rf-card-title"},e.course),tag("Room "+e.room)]),
      h("div",{class:"rf-meta"},[h("strong",{},e.section||""),e.instructor?h("div",{class:"rf-muted"},e.instructor):null]),
      h("div",{class:"rf-tmet"},e.day+" \u00B7 "+fmtRng(e.start,e.end))
    ]);
  }

  function renderRooms(){
    var list=$("#rf-rooms",root); list.innerHTML="";
    var r=resolve(), q=qstr();
    var rows = st.rooms.map(function(rm){return {room:rm,st:statusAt(rm,r.day,r.time)};})
      .filter(function(x){
        if (st.filters.status && x.st.status!==st.filters.status) return false;
        if (!q) return true;
        var pieces=[x.room];
        if(x.st.current) pieces.push(x.st.current.course,x.st.current.section,x.st.current.instructor);
        if(x.st.next) pieces.push(x.st.next.course,x.st.next.section,x.st.next.instructor);
        return pieces.filter(Boolean).join(" ").toLowerCase().indexOf(q.toLowerCase())>=0;
      });
    var order={busy:0,free:1,none:2};
    rows.sort(function(a,b){return order[a.st.status]!==order[b.st.status]?order[a.st.status]-order[b.st.status]:String(a.room).localeCompare(String(b.room),"en",{numeric:true});});
    $("#rf-crooms",root).textContent = rows.length+" room"+(rows.length===1?"":"s")+" \u00B7 "+r.day+(r.time?" \u00B7 "+fmt12(r.time):"");
    if(!rows.length){ list.appendChild(emptyEl("No matching rooms found","Try a different day, time, or search term.")); return; }
    rows.forEach(function(x){
      var body, room=x.room, s=x.st;
      if(s.status==="busy") body=[
        h("div",{class:"rf-meta"},[h("strong",{},s.current.course),s.current.section?" \u2014 "+s.current.section:"",s.current.instructor?h("div",{class:"rf-muted"},s.current.instructor):null]),
        h("div",{class:"rf-tmet"},fmtRng(s.current.start,s.current.end))
      ];
      else if(s.status==="free") body=[
        h("div",{class:"rf-meta"},s.next?["Next class: ",h("strong",{},s.next.course)]:"No more classes scheduled today."),
        h("div",{class:"rf-tmet"},s.next?((s.next.section||"")+(s.next.section?" \u00B7 ":""))+fmtRng(s.next.start,s.next.end):"")
      ];
      else body=[h("div",{class:"rf-meta rf-muted"},"No scheduled classes found for this room on this day.")];
      var onRoomClick=function(){openDetail(room);};
      list.appendChild(h("div",{class:"rf-card",tabindex:"0",role:"button",onclick:onRoomClick,onkeydown:function(ev){if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();onRoomClick();}}},[
        h("div",{class:"rf-card-top"},[h("div",{class:"rf-card-title"},"Room "+room),badge(s.status)]),
        body
      ]));
    });
  }

  function renderClasses(){
    var list=$("#rf-classes",root); list.innerHTML="";
    var q=qstr(), es=st.schedule.slice();
    if(st.filters.day) es=es.filter(function(e){return e.day===st.filters.day;});
    if(st.filters.time && st.filters.time!=="NOW"){var t=parseTime(st.filters.time);es=es.filter(function(e){return parseTime(e.start)<=t&&t<parseTime(e.end);});}
    else if(st.filters.time==="NOW"){var t2=parseTime(nowHM()),d=todayName();es=es.filter(function(e){return e.day===d&&parseTime(e.start)<=t2&&t2<parseTime(e.end);});}
    if(q) es=es.filter(function(e){return match(e,q);});
    es.sort(function(a,b){var dd=DAYS.indexOf(a.day)-DAYS.indexOf(b.day); return dd?dd:parseTime(a.start)-parseTime(b.start);});
    $("#rf-cclasses",root).textContent=es.length+" class"+(es.length===1?"":"es")+" found";
    if(!es.length){list.appendChild(emptyEl("No matching classes found","Try a different day, time, or search term."));return;}
    es.forEach(function(e){list.appendChild(card(e));});
  }

  function renderFree(){
    var list=$("#rf-free",root); list.innerHTML="";
    var n=new Date(), day=todayName(n), time=nowHM(n);
    var rows = st.rooms.map(function(r){return {room:r,st:statusAt(r,day,time)};}).filter(function(x){return x.st.status==="free";})
      .sort(function(a,b){return String(a.room).localeCompare(String(b.room),"en",{numeric:true});});
    $("#rf-cfree",root).textContent=rows.length+" free room"+(rows.length===1?"":"s")+" \u00B7 "+day+" \u00B7 "+fmt12(time);
    if(st.availableDays.indexOf(day)<0){list.appendChild(emptyEl("No schedule data for this day",""));return;}
    if(!rows.length){list.appendChild(emptyEl("No free rooms right now","Based on the published schedule, every known room is occupied at this moment."));return;}
    rows.forEach(function(x){
      var onFree=function(){st.detailRoom=x.room;st.filters.day=day;st.filters.time="NOW";switchMode("room");$("#rf-anchor",root).scrollIntoView({behavior:"smooth",block:"start"});};
      list.appendChild(h("div",{class:"rf-card",tabindex:"0",role:"button",onclick:onFree,onkeydown:function(ev){if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();onFree();}}},[
        h("div",{class:"rf-card-top"},[h("div",{class:"rf-card-title"},"Room "+x.room),badge("free")]),
        x.st.next?h("div",{class:"rf-meta"},["Next: ",h("strong",{},x.st.next.course),x.st.next.section?" ("+x.st.next.section+")":""]):h("div",{class:"rf-meta rf-muted"},"No more classes scheduled today."),
        h("div",{class:"rf-tmet"},x.st.next?"at "+fmt12(x.st.next.start):"")
      ]));
    });
  }

  function runWIC(){
    switchMode("where");
    var out=$("#rf-wic-out",root); out.innerHTML="";
    var q=($("#rf-wic-in",root).value||"").trim(); if(!q) return;
    var ql=q.toLowerCase();
    var ms=st.schedule.filter(function(e){
      var hay=[e.course,e.section,e.room,e.instructor].filter(Boolean).join(" ").toLowerCase();
      return hay.indexOf(ql)>=0||hay.replace(/\s+/g,"").indexOf(ql.replace(/\s+/g,""))>=0;
    }).sort(function(a,b){var dd=DAYS.indexOf(a.day)-DAYS.indexOf(b.day);return dd?dd:parseTime(a.start)-parseTime(b.start);});
    if(!ms.length){out.appendChild(emptyEl("No matching class found","We couldn\u2019t find \u201C"+q+"\u201D in the published schedule."));return;}
    ms.forEach(function(e){
      var grid = h("div",{class:"rf-wic-grid"},[
        cell("Day",e.day),cell("Time",fmtRng(e.start,e.end)),cell("Room",e.room),e.instructor?cell("Instructor",e.instructor):null
      ]);
      out.appendChild(h("div",{class:"rf-wic-card"},[
        h("div",{class:"rf-wic-top"},[h("div",{},[h("div",{class:"rf-big"},e.course),h("div",{class:"rf-muted",style:"font-size:.85rem;margin-top:2px;"},e.section||"")]),tag("Room "+e.room)]),
        grid,
        h("div",{class:"rf-wic-foot"},[h("button",{class:"rf-link",type:"button",onclick:function(){st.detailRoom=e.room;st.filters.day=e.day;switchMode("room");$("#rf-anchor",root).scrollIntoView({behavior:"smooth",block:"start"});}},"View full room schedule \u2192")])
      ]));
    });
  }
  function cell(k,v){ return h("div",{},[h("div",{class:"rf-k"},k),h("div",{class:"rf-v"},v)]); }

  function renderTable(){
    var hd=$("#rf-thead",root), bd=$("#rf-tbody",root), cards=$("#rf-cards",root);
    var cols=[
      {key:"day",label:"Day",render:function(e){return e.day;}},
      {key:"start",label:"Time",render:function(e){return fmtRng(e.start,e.end);}},
      {key:"course",label:"Course",render:function(e){return e.course;}},
      {key:"section",label:"Section",render:function(e){return e.section||"";}},
      {key:"room",label:"Room",render:function(e){return e.room||"";}}
    ];
    if(st.schedule.some(function(e){return e.instructor;})) cols.push({key:"instructor",label:"Instructor",render:function(e){return e.instructor||"";}});
    hd.innerHTML="";
    cols.forEach(function(c){
      var th=h("th",{onclick:function(){if(st.sort.key===c.key)st.sort.dir=st.sort.dir==="asc"?"desc":"asc";else{st.sort.key=c.key;st.sort.dir="asc";}renderTable();}},c.label);
      if(st.sort.key===c.key) th.appendChild(h("span",{class:"rf-sort"},st.sort.dir==="asc"?" \u25B2":" \u25BC"));
      hd.appendChild(th);
    });
    var es=st.schedule.slice();
    if(st.filters.day) es=es.filter(function(e){return e.day===st.filters.day;});
    var qq=qstr(); if(qq) es=es.filter(function(e){return match(e,qq);});
    es.sort(function(a,b){
      var av,bv,k=st.sort.key;
      if(k==="start"){av=parseTime(a.start);bv=parseTime(b.start);}
      else if(k==="day"){av=DAYS.indexOf(a.day);bv=DAYS.indexOf(b.day);}
      else {av=(a[k]||"").toString();bv=(b[k]||"").toString();}
      if(av<bv) return st.sort.dir==="asc"?-1:1;
      if(av>bv) return st.sort.dir==="asc"?1:-1;
      return 0;
    });
    bd.innerHTML=""; cards.innerHTML="";
    es.forEach(function(e){
      var tr=h("tr",{onclick:function(){st.detailRoom=e.room;st.filters.day=e.day;switchMode("room");$("#rf-anchor",root).scrollIntoView({behavior:"smooth",block:"start"});}});
      cols.forEach(function(c){tr.appendChild(h("td",{},c.render(e)||""));});
      bd.appendChild(tr);
      cards.appendChild(h("div",{class:"rf-scard"},[
        h("div",{class:"rf-sc-top"},[e.course,tag("Room "+e.room)]),
        h("div",{class:"rf-sc-meta"},(e.section?e.section+" \u00B7 ":"")+e.day+" \u00B7 "+fmtRng(e.start,e.end)),
        e.instructor?h("div",{class:"rf-sc-meta rf-muted"},e.instructor):null
      ]));
    });
  }

  function tlBusy(e){return h("div",{class:"rf-tl"},[h("div",{class:"rf-tl-time"},fmtRng(e.start,e.end)),h("div",{class:"rf-tl-body"},[h("div",{class:"rf-tl-course"},e.course+(e.section?" \u2014 "+e.section:"")),e.instructor?h("div",{class:"rf-tl-sub"},e.instructor):null])]);}
  function tlFree(a,b){return h("div",{class:"rf-tl rf-tl-free"},[h("div",{class:"rf-tl-time"},fmtRng(toHM(a),toHM(b))),h("div",{class:"rf-tl-body"},h("div",{class:"rf-tl-course"},"Available"))]);}
  function buildTl(room,day){
    var list=st.schedule.filter(function(s){return s.room===room&&s.day===day;}).sort(function(a,b){return parseTime(a.start)-parseTime(b.start);});
    if(!list.length) return [emptyEl("No scheduled classes","No scheduled classes found for this room on "+day+".")];
    var items=[], DS=7*60, DE=21*60, cur=Math.min(DS,parseTime(list[0].start)), last=Math.max(DE,parseTime(list[list.length-1].end));
    if(cur<parseTime(list[0].start)){items.push(tlFree(cur,parseTime(list[0].start)));cur=parseTime(list[0].start);}
    list.forEach(function(e){var es=parseTime(e.start),ee=parseTime(e.end);if(es>cur)items.push(tlFree(cur,es));items.push(tlBusy(e));cur=ee;});
    if(cur<last) items.push(tlFree(cur,last));
    return items;
  }
  function sbox(l,v){var w=h("div",{class:"rf-stat-s"},[h("div",{class:"rf-stat-l"},l),h("div",{class:"rf-stat-v"})]);var vv=w.querySelector(".rf-stat-v"); if(typeof v==="string"||typeof v==="number") vv.textContent=v; else vv.appendChild(v); return w;}
  function renderDetail(){
    var p=$("#rf-detail",root); if(!st.detailRoom){p.hidden=true;return;} p.hidden=false;
    var room=st.detailRoom, day=st.filters.day||todayName(),
        time=(st.filters.time==="NOW"||!st.filters.time)?nowHM():st.filters.time,
        s=statusAt(room,day,time);
    $("#rf-dtitle",root).textContent="Room "+room;
    $("#rf-tlh",root).textContent=day+"\u2019s schedule";
    var ss=$("#rf-dstats",root); ss.innerHTML="";
    ss.appendChild(sbox("Current status",badge(s.status)));
    ss.appendChild(sbox("Next class",s.next?h("div",{},[h("div",{},s.next.course+(s.next.section?" \u2014 "+s.next.section:"")),h("div",{class:"rf-stat-v-dim"},s.next.day+" \u00B7 "+fmt12(s.next.start))]):h("div",{class:"rf-stat-v-dim"},"None scheduled for the rest of the day")));
    var tds=st.schedule.filter(function(x){return x.room===room&&x.day===day;}).sort(function(a,b){return parseTime(a.start)-parseTime(b.start);});
    var past=tds.filter(function(x){return parseTime(x.end)<=parseTime(time);}), lst=past[past.length-1]||null;
    ss.appendChild(sbox("Last class",lst?h("div",{},[h("div",{},lst.course+(lst.section?" \u2014 "+lst.section:"")),h("div",{class:"rf-stat-v-dim"},fmtRng(lst.start,lst.end))]):h("div",{class:"rf-stat-v-dim"},"None earlier today")));
    ss.appendChild(sbox("Schedule day",h("div",{},day)));
    var tl=$("#rf-tl",root); tl.innerHTML="";
    buildTl(room,day).forEach(function(n){tl.appendChild(n);});
  }

  function switchMode(m){
    st.mode=m;
    root.querySelectorAll(".rf-tab").forEach(function(b){
      var on=b.dataset.mode===m; b.classList.toggle("rf-active",on); b.setAttribute("aria-selected",on?"true":"false");
    });
    ["room","class","free","where","table"].forEach(function(x){ $("#rf-panel-"+x,root).hidden = x!==m; });
    $("#rf-timeg",root).style.display = (m==="free"||m==="where")?"none":"";
    if(m==="free") renderFree();
    if(m==="table") renderTable();
    if(m==="room") renderRooms();
    if(m==="class") renderClasses();
    if(m==="room" && st.detailRoom) renderDetail(); else $("#rf-detail",root).hidden=true;
  }

  function renderMeta(){
    $("#rf-updated",root).textContent=st.meta.updated||"\u2014";
    $("#rf-source",root).textContent=st.meta.source||"Provided schedule";
    $("#rf-sample",root).classList.toggle("show",!!st.meta.isSample);
    if(st.meta.disclaimer) $("#rf-disc",root).textContent=st.meta.disclaimer;
  }
  function renderStats(){
    $("#rf-nrooms",root).textContent=st.rooms.length;
    $("#rf-nclasses",root).textContent=st.schedule.length;
    $("#rf-ndays",root).textContent=st.availableDays.length;
  }

  function render(){
    renderMeta(); renderStats(); renderDays(); renderTimes();
    if(st.mode==="room") renderRooms();
    if(st.mode==="class") renderClasses();
    if(st.mode==="free") renderFree();
    if(st.mode==="where") { /* keeps prior results */ }
    if(st.mode==="table") renderTable();
    renderDetail();
  }

  function init(){
    mount(); if(!root) return;
    switchMode("room");
    load();
    setInterval(function(){
      if(st.mode==="free") renderFree();
      else if(st.mode==="room" && (st.filters.time==="NOW"||!st.filters.time)){ renderRooms(); renderDetail(); }
    },60*1000);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();
