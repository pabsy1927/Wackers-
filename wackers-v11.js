import { useState, useRef, useEffect } from "react";

const GOLF_API_KEY = "PKKKM6QRKV6ED2ZKNULS43NRG4";

// ── THEME ─────────────────────────────────────────────────────────────────────
const T = {
  teal:"#00897B", tealDark:"#00695C", tealPale:"#E0F2F1",
  gold:"#F9A825", red:"#E53935", blue:"#1E88E5", green:"#43A047",
  bg:"#F4F6F5", white:"#FFFFFF", border:"#E0E6E3",
  text:"#1A2C25", sub:"#5A7A6E", dim:"#9AB5AC",
};
const TC = { red:{bg:"#E53935",label:"Red"}, blue:{bg:"#1E88E5",label:"Blue"}, green:{bg:"#43A047",label:"Green"}, yellow:{bg:"#F9A825",label:"Gold"} };
const DP = [5,4,5,4,3,5,3,4,4,3,4,5,4,4,5,3,4,4];
const DS = [9,15,7,1,13,5,17,3,11,10,6,18,2,16,4,8,14,12];
const DY = [520,385,470,390,175,510,145,395,410,155,375,490,365,355,490,160,380,405];
const BUILTIN = [{id:"tewkesbury",name:"Tewkesbury Park",location:"Tewkesbury, Gloucestershire",pars:DP,sis:DS,yards:DY,lat:51.987,lon:-2.162}];

// ── UTILS ─────────────────────────────────────────────────────────────────────
const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5);
const gcode= () => Math.random().toString(36).slice(2,8).toUpperCase();
const tm   = t  => TC[t] || TC.red;
const n    = v  => Number(v) || 0;

function sf(score, par, hcp, si) {
  if (!score || score <= 0) return 0;
  const shots = Math.floor(hcp / 18) + (si <= (hcp % 18) ? 1 : 0);
  return Math.max(0, par - (score - shots) + 2);
}
function totalSF(scores, hcp, pars, sis) {
  return (scores || []).reduce((acc, v, i) => v > 0 ? acc + sf(v, pars[i], hcp, sis[i]) : acc, 0);
}
function yds(la1,lo1,la2,lo2) {
  const R=6371000, dLa=(la2-la1)*Math.PI/180, dLo=(lo2-lo1)*Math.PI/180;
  const a = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(a))*1.09361);
}
// Safe score getter
function getScores(game, pid, day) {
  if (!game || !game.scores) return Array(18).fill(0);
  const byDay = game.scores[pid];
  if (!byDay) return Array(18).fill(0);
  const arr = byDay[day];
  if (!arr || !Array.isArray(arr)) return Array(18).fill(0);
  return [...arr];
}

// ── ATOMS ─────────────────────────────────────────────────────────────────────
const Ico = ({d,sz=20,col="currentColor"}) => (
  <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);

function Av({name, team, size=38}) {
  const ini = name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
  return <div style={{width:size,height:size,borderRadius:"50%",background:tm(team).bg,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.34,flexShrink:0}}>{ini}</div>;
}

function Chip({pts}) {
  const bg = pts>=4?"#1A237E":pts===3?"#1565C0":pts===2?"#42A5F5":pts===1?"#90CAF9":"#E0E6E3";
  const col = pts>=3?"#fff":pts>=1?T.text:T.dim;
  return <div style={{width:28,height:28,borderRadius:6,background:bg,color:col,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{pts>0?pts:"—"}</div>;
}
// Score block — coloured by relation to par (like the reference screenshot)
function ScoreBlock({score, par, hcp, si}) {
  if(!score||score<=0) return <div style={{width:28,height:28,borderRadius:6,background:"#F0F0F0",color:T.dim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>—</div>;
  const pts = sf(score,par,hcp,si);
  // Colour: eagle+=dark blue, birdie=mid blue, par=light blue, bogey=empty/outline, double+=none
  const diff = score - par;
  let bg = "#E0E6E3", col = T.sub;
  if(pts>=4){bg="#1A237E";col="#fff";}       // eagle or better
  else if(pts===3){bg="#1565C0";col="#fff";}  // birdie
  else if(pts===2){bg="#42A5F5";col="#fff";}  // par
  else if(pts===1){bg="#90CAF9";col=T.text;}  // bogey / 1pt
  return <div style={{width:28,height:28,borderRadius:6,background:bg,color:col,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{score}</div>;
}

function Bar({title,sub,onBack,right}) {
  return (
    <div style={{background:T.teal,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
      {onBack && <button onClick={onBack} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",padding:0,display:"flex"}}><Ico d="M19 12H5M12 5l-7 7 7 7" sz={22} col="#fff"/></button>}
      <div style={{flex:1}}>
        <div style={{fontWeight:700,fontSize:17,color:"#fff"}}>{title}</div>
        {sub && <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",marginTop:1}}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Crd({children, style={}}) {
  return <div style={{background:T.white,borderRadius:14,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:`1px solid ${T.border}`,...style}}>{children}</div>;
}

function Btn({label,onClick,disabled,full,sm,outline,color}) {
  const bg = disabled?"#E0E6E3":outline?"transparent":(color||T.teal);
  const cl = disabled?T.dim:outline?(color||T.teal):"#fff";
  return (
    <button onClick={onClick} disabled={disabled}
      style={{background:bg,color:cl,border:outline?`2px solid ${color||T.teal}`:"none",borderRadius:10,
        padding:sm?"8px 14px":"13px 18px",fontWeight:700,fontSize:sm?13:15,
        cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",opacity:disabled?0.6:1}}>
      {label}
    </button>
  );
}

function Fld({children}) {
  return <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:0.5,marginBottom:5,marginTop:12}}>{children}</div>;
}

function Inp({label,value,onChange,placeholder,type="text"}) {
  return (
    <div>
      {label && <Fld>{label}</Fld>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",padding:"11px 13px",background:"#F8FAFA",border:`1px solid ${T.border}`,borderRadius:10,fontSize:14,color:T.text,boxSizing:"border-box"}}/>
    </div>
  );
}

// ── NAV ───────────────────────────────────────────────────────────────────────
const TABS = [
  {id:"courses", label:"Courses",    icon:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"},
  {id:"setup",   label:"Match Setup",icon:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"},
  {id:"map",     label:"Course Map", icon:"M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"},
  {id:"cards",   label:"Scorecard",  icon:"M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"},
  {id:"board",   label:"Leaderboard",icon:"M4 20h16M4 20V4M4 20l4-4M20 20V4M20 20l-4-4M12 20V10"},
  {id:"history", label:"History",    icon:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"},
];

function Nav({tab, setTab}) {
  return (
    <div style={{flexShrink:0,background:T.white,borderTop:`1px solid ${T.border}`,display:"flex",boxShadow:"0 -2px 8px rgba(0,0,0,0.06)"}}>
      {TABS.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"8px 2px 10px",border:"none",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <Ico d={t.icon} sz={19} col={active?T.teal:T.dim}/>
            <span style={{fontSize:8.5,fontWeight:700,color:active?T.teal:T.dim,letterSpacing:0.2}}>{t.label}</span>
            {active && <div style={{width:16,height:2,borderRadius:2,background:T.teal}}/>}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSES TAB
// ═══════════════════════════════════════════════════════════════════════════════
function CoursesTab({course, setCourse}) {
  const [query, setQuery] = useState("");
  const [res,   setRes]   = useState([]);
  const [load,  setLoad]  = useState(false);
  const [err,   setErr]   = useState("");

  async function search() {
    if(!query.trim()) return;
    setLoad(true); setErr(""); setRes([]);
    const bi = BUILTIN.filter(c=>c.name.toLowerCase().includes(query.toLowerCase()));
    try {
      const r = await fetch(
        `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(query)}`,
        {headers:{Authorization:`Key ${GOLF_API_KEY}`}});
      if(!r.ok) throw new Error();
      const data = await r.json();
      setRes([...bi,...(data.courses||[])]);
      if(!bi.length&&!(data.courses||[]).length) setErr("No courses found");
    } catch {
      setRes(BUILTIN);
      setErr("Full search available once Wackers is live. Showing built-in courses.");
    }
    setLoad(false);
  }

  function pick(c) {
    if(c.pars) { setCourse(c); return; }
    const tee   = c.tees?.male?.[0] || c.tees?.female?.[0] || {};
    const holes = tee.holes || [];
    setCourse({
      id:c.id, name:c.club_name||c.course_name,
      location:[c.location?.city,c.location?.country].filter(Boolean).join(", "),
      pars:  holes.length===18 ? holes.map(h=>h.par||4)      : DP,
      sis:   holes.length===18 ? holes.map(h=>h.handicap||0) : DS,
      yards: holes.length===18 ? holes.map(h=>h.yardage||0)  : DY,
      lat:c.location?.latitude, lon:c.location?.longitude,
    });
  }

  return (
    <div style={{flex:1,overflowY:"auto",background:T.bg,paddingBottom:80}}>
      {/* Active course */}
      {course && (
        <div style={{margin:"12px 16px 0"}}>
          <Crd>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:T.teal,letterSpacing:0.5,marginBottom:2}}>ACTIVE COURSE</div>
                <div style={{fontWeight:700,fontSize:16,color:T.text}}>{course.name}</div>
                <div style={{fontSize:12,color:T.sub,marginTop:2}}>
                  Par {course.pars.reduce((a,b)=>a+b,0)} · {course.yards.reduce((a,b)=>a+b,0).toLocaleString()} yards
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:T.teal,fontWeight:600}}>✓ Selected</div>
                <div style={{fontSize:11,color:T.sub,marginTop:2}}>Go to Course Map →</div>
              </div>
            </div>
          </Crd>
        </div>
      )}

      {/* Search */}
      <div style={{padding:"14px 16px 0"}}>
        <div style={{display:"flex",gap:8}}>
          <input value={query} onChange={e=>setQuery(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&search()}
            placeholder="Search course e.g. Tewkesbury Park…"
            style={{flex:1,padding:"12px 14px",background:T.white,border:`1px solid ${T.border}`,borderRadius:10,fontSize:14,color:T.text}}/>
          <button onClick={search}
            style={{background:T.teal,color:"#fff",border:"none",borderRadius:10,padding:"12px 18px",fontWeight:700,fontSize:14,cursor:"pointer",minWidth:72,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {load
              ? <div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
              : "Search"}
          </button>
        </div>
        {err && (
          <div style={{marginTop:8,padding:"9px 12px",background:"#FFF8E1",border:`1px solid ${T.gold}44`,borderRadius:8,fontSize:12,color:"#6D4C00"}}>{err}</div>
        )}
      </div>

      {/* Results / built-ins */}
      <div style={{padding:"12px 16px 0"}}>
        <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:0.5,marginBottom:8}}>
          {res.length>0 ? `${res.length} COURSES FOUND — tap to select` : "BUILT-IN COURSES"}
        </div>
        <Crd style={{padding:0,overflow:"hidden"}}>
          {(res.length>0?res:BUILTIN).map((c,i)=>{
            const name = c.name||c.club_name||c.course_name||"";
            const loc  = typeof c.location==="string" ? c.location : [c.location?.city,c.location?.country].filter(Boolean).join(", ");
            const par  = c.pars ? c.pars.reduce((a,b)=>a+b,0) : c.tees?.male?.[0]?.par_total;
            const active = course && (course.id===c.id||course.name===name);
            return (
              <div key={c.id||i} onClick={()=>pick(c)}
                style={{padding:"13px 16px",borderTop:i>0?`1px solid ${T.border}`:"none",cursor:"pointer",
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  background:active?T.tealPale:"transparent"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.tealPale}
                onMouseLeave={e=>e.currentTarget.style.background=active?T.tealPale:"transparent"}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:T.text}}>{name}</div>
                  {loc&&<div style={{fontSize:12,color:T.sub,marginTop:2}}>{loc}</div>}
                  {par&&<div style={{fontSize:11,color:T.teal,marginTop:2,fontWeight:600}}>Par {par}</div>}
                </div>
                {active
                  ? <span style={{color:T.teal,fontWeight:700,fontSize:13}}>✓</span>
                  : <Ico d="M9 18l6-6-6-6" sz={18} col={T.dim}/>}
              </div>
            );
          })}
        </Crd>
        <div style={{fontSize:11,color:T.dim,textAlign:"center",padding:"12px 0"}}>
          30,000+ courses available once Wackers launches at its own domain
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE MAP TAB
// ═══════════════════════════════════════════════════════════════════════════════
function MapTab({course}) {
  const mapRef=useRef(null), leafRef=useRef(null), pMkr=useRef(null), pinMkr=useRef(null), accC=useRef(null), watchRef=useRef(null);
  const [hole,setHole]=useState(0), [pos,setPos]=useState(null), [acc,setAcc]=useState(null);
  const [gps,setGps]=useState(false), [gpsErr,setGpsErr]=useState(""), [leafOk,setLeafOk]=useState(false);
  const [hd,setHd]=useState(()=>Array(18).fill(null).map(()=>({pin:null})));

  const ac    = course || BUILTIN[0];
  const pars  = ac.pars  || DP;
  const yards = ac.yards || DY;
  const pin   = hd[hole]?.pin;
  const dist  = pos && pin ? yds(pos.lat,pos.lon,pin.lat,pin.lon) : null;

  useEffect(()=>{
    if(window.L){setLeafOk(true);return;}
    const css=document.createElement("link"); css.rel="stylesheet"; css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(css);
    const js=document.createElement("script"); js.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; js.onload=()=>setLeafOk(true); document.head.appendChild(js);
  },[]);

  useEffect(()=>{
    if(!leafOk||!mapRef.current||leafRef.current)return;
    const L=window.L, map=L.map(mapRef.current,{zoomControl:false,attributionControl:false});
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:21}).addTo(map);
    L.control.zoom({position:"topright"}).addTo(map);
    map.setView([ac.lat||51.987, ac.lon||-2.162], 15);
    leafRef.current=map;
    return ()=>{map.remove(); leafRef.current=null;};
  },[leafOk]);

  // Re-centre map when course changes
  useEffect(()=>{
    if(!leafRef.current) return;
    leafRef.current.setView([ac.lat||51.987, ac.lon||-2.162], 15);
  },[ac.id]);

  useEffect(()=>{
    if(!leafRef.current)return;
    const L=window.L, map=leafRef.current;
    function onClick(e){
      const{lat,lng}=e.latlng;
      setHd(prev=>{const nx=[...prev];nx[hole]={pin:{lat,lon:lng}};return nx;});
      if(pinMkr.current) map.removeLayer(pinMkr.current);
      const icon=L.divIcon({className:"",iconAnchor:[10,24],html:`<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">⛳</div>`});
      pinMkr.current=L.marker([lat,lng],{icon,draggable:true}).addTo(map);
      pinMkr.current.on("dragend",ev=>{const p=ev.target.getLatLng();setHd(prev=>{const nx=[...prev];nx[hole]={pin:{lat:p.lat,lon:p.lng}};return nx;});});
    }
    map.on("click",onClick);
    return()=>map.off("click",onClick);
  },[leafRef.current,hole]);

  useEffect(()=>{
    if(!leafRef.current||!pos)return;
    const L=window.L, map=leafRef.current;
    const icon=L.divIcon({className:"",iconAnchor:[11,11],html:`<div style="width:22px;height:22px;border-radius:50%;background:${T.blue};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`});
    if(pMkr.current) map.removeLayer(pMkr.current);
    if(accC.current) map.removeLayer(accC.current);
    pMkr.current=L.marker([pos.lat,pos.lon],{icon}).addTo(map);
    if(acc) accC.current=L.circle([pos.lat,pos.lon],{radius:acc/2,color:T.blue,fillColor:T.blue,fillOpacity:0.07,weight:1}).addTo(map);
  },[pos,acc]);

  function startGPS(){
    if(!navigator.geolocation){setGpsErr("Not supported");return;}
    setGps(true);setGpsErr("");
    watchRef.current=navigator.geolocation.watchPosition(
      p=>{setPos({lat:p.coords.latitude,lon:p.coords.longitude});setAcc(Math.round(p.coords.accuracy));},
      e=>{setGpsErr(e.message);setGps(false);},
      {enableHighAccuracy:true,maximumAge:2000,timeout:15000}
    );
  }
  function stopGPS(){if(watchRef.current)navigator.geolocation.clearWatch(watchRef.current);setGps(false);}
  useEffect(()=>()=>{if(watchRef.current)navigator.geolocation.clearWatch(watchRef.current);},[]);

  function dc(d){return d<100?T.green:d<175?T.gold:T.red;}

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* HUD bar */}
      <div style={{background:T.tealDark,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          {[{l:"HOLE",v:hole+1},{l:"PAR",v:pars[hole]},{l:"YDS",v:yards[hole]}].map((x,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.65)",fontWeight:600,letterSpacing:0.8}}>{x.l}</div>
              <div style={{fontSize:26,fontWeight:700,color:"#fff",lineHeight:1}}>{x.v}</div>
            </div>
          ))}
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",lineHeight:1.3,maxWidth:100}}>{ac.name}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.65)",fontWeight:600,letterSpacing:0.8}}>TO PIN</div>
          <div style={{fontSize:dist?40:24,fontWeight:700,color:dist?dc(dist):"rgba(255,255,255,0.35)",lineHeight:1,transition:"color 0.3s"}}>{dist||"—"}</div>
          {dist&&<div style={{fontSize:9,color:"rgba(255,255,255,0.6)"}}>yards</div>}
        </div>
      </div>

      {/* Map */}
      <div style={{flex:1,position:"relative"}}>
        <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
        {!leafOk&&(
          <div style={{position:"absolute",inset:0,background:"#1a2c25",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
            <div style={{width:28,height:28,border:"3px solid rgba(255,255,255,0.15)",borderTopColor:T.teal,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
            <div style={{color:T.dim,fontSize:13}}>Loading satellite map…</div>
          </div>
        )}
        {leafOk&&!pin&&(
          <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.7)",color:"#fff",padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:600,zIndex:10,whiteSpace:"nowrap",pointerEvents:"none"}}>
            Tap the green to place the pin ⛳
          </div>
        )}
        <div style={{position:"absolute",bottom:14,left:14,background:"rgba(0,0,0,0.65)",borderRadius:20,padding:"6px 12px",display:"flex",alignItems:"center",gap:6,zIndex:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",transition:"all 0.3s",background:gps?(pos?T.green:T.gold):"#666",boxShadow:gps&&pos?`0 0 0 3px ${T.green}44`:"none"}}/>
          <span style={{color:"#fff",fontSize:11,fontWeight:600}}>{gps?(pos?`±${acc}m`:"Acquiring…"):"GPS off"}</span>
        </div>
        <button onClick={gps?stopGPS:startGPS}
          style={{position:"absolute",bottom:14,right:14,background:gps?T.red:T.teal,color:"#fff",border:"none",borderRadius:22,padding:"11px 18px",fontWeight:700,fontSize:13,cursor:"pointer",zIndex:10,boxShadow:"0 3px 12px rgba(0,0,0,0.3)"}}>
          {gps?"Stop GPS":"📍 Start GPS"}
        </button>
        {gpsErr&&<div style={{position:"absolute",top:48,left:14,right:14,background:T.red,borderRadius:10,padding:"8px 12px",zIndex:10,fontSize:12,color:"#fff"}}>⚠ {gpsErr}</div>}
      </div>

      {/* Hole selector strip */}
      <div style={{flexShrink:0,background:T.tealDark,padding:"9px 12px 12px",overflowX:"auto"}}>
        <div style={{display:"flex",gap:5,minWidth:"max-content"}}>
          {Array.from({length:18},(_,i)=>(
            <button key={i} onClick={()=>setHole(i)}
              style={{width:34,height:34,borderRadius:8,border:"none",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0,
                background:hole===i?T.gold:"rgba(255,255,255,0.12)",
                color:hole===i?"#fff":hd[i]?.pin?T.tealPale:"rgba(255,255,255,0.5)",
                outline:hd[i]?.pin&&hole!==i?`2px solid ${T.tealPale}`:"none"}}>
              {i+1}
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.leaflet-container{font-family:inherit!important;}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATCH SETUP TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SetupTab({game, setGame, course, setTab}) {
  const [step,   setStep]  = useState(1);
  const [gName,  setGName] = useState("");
  const [gDate,  setGDate] = useState(new Date().toISOString().split("T")[0]);
  const [gDays,  setGDays] = useState(1);
  const [players,setPL]    = useState([]);
  const [matches,setMT]    = useState([]);
  const [comps,  setComps] = useState([]);
  const [pForm,  setPF]    = useState({name:"",hcp:"",team:"red"});
  const [mForm,  setMF]    = useState({name:"",day:1,A:[],B:[],C:[],tri:false});
  const [cForm,  setCF]    = useState({type:"ntp",hole:1,day:1});
  const [showJ,  setShowJ] = useState(false);
  const [jCode,  setJCode] = useState("");
  const [jErr,   setJErr]  = useState("");
  const codeRef = useRef(gcode());
  const TKEYS = ["red","blue","green","yellow"];

  function addPlayer() {
    if(!pForm.name.trim()||!pForm.hcp) return;
    setPL(p=>[...p,{id:uid(),name:pForm.name.trim(),handicap:parseInt(pForm.hcp),team:pForm.team}]);
    setPF(f=>({...f,name:"",hcp:""}));
  }
  function togglePInTeam(pid,key) {
    setMF(f=>{
      const taken=["A","B","C"].filter(k=>k!==key).flatMap(k=>f[k]);
      if(taken.includes(pid)) return f;
      const cur=f[key];
      return {...f,[key]:cur.includes(pid)?cur.filter(x=>x!==pid):[...cur,pid]};
    });
  }
  function addMatch() {
    if(!mForm.A.length||!mForm.B.length) return;
    const teams=[
      {id:"A",color:"red",  players:mForm.A},
      {id:"B",color:"blue", players:mForm.B},
      ...(mForm.tri&&mForm.C.length?[{id:"C",color:"green",players:mForm.C}]:[]),
    ];
    // Always store day as a plain number
    const dayNum = parseInt(String(mForm.day),10) || 1;
    setMT(ms=>[...ms,{id:uid(),name:mForm.name||`Match ${ms.length+1}`,day:dayNum,teams}]);
    setMF({name:"",day:1,A:[],B:[],C:[],tri:false});
  }
  function addComp() {
    const holeNum = parseInt(String(cForm.hole),10)||1;
    const dayNum  = parseInt(String(cForm.day),10)||1;
    if(comps.find(c=>c.type===cForm.type&&c.hole===holeNum&&c.day===dayNum)) return;
    setComps(cs=>[...cs,{id:uid(),type:cForm.type,hole:holeNum,day:dayNum}]);
  }
  function launch() {
    const g = {
      id:uid(), code:codeRef.current,
      name:gName||"Society Day",
      date:gDate,
      days:gDays,  // always a plain number (1 or 2)
      course:course||BUILTIN[0],
      players,
      matches,
      competitions:comps,
      bonuses:[],
      scores:{},
      createdAt:new Date().toISOString(),
    };
    setGame(g);
    setTab("cards");
  }
  function handleJoin() {
    const c=jCode.trim().toUpperCase();
    if(c.length<4){setJErr("Enter a valid code");return;}
    if(game?.code===c)return;
    setJErr("Code not found. Live join works once Wackers is hosted.");
  }

  // ── ACTIVE GAME VIEW ──────────────────────────────────────────────────────
  if(game) {
    return (
      <div style={{flex:1,overflowY:"auto",background:T.bg,paddingBottom:80}}>
        <div style={{padding:"12px 16px 0"}}>
          <Crd>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontWeight:700,fontSize:18,color:T.text}}>{game.name}</div>
                <div style={{fontSize:12,color:T.sub,marginTop:3}}>{game.course?.name} · {game.date}</div>
                <div style={{fontSize:12,color:T.sub}}>{game.players.length} players · {game.matches.length} matches · {game.days} day{game.days>1?"s":""}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:T.sub,marginBottom:2}}>JOIN CODE</div>
                <div style={{fontSize:26,fontWeight:700,color:T.teal,letterSpacing:3}}>{game.code}</div>
              </div>
            </div>
            <div style={{marginTop:12}}><Btn label="End Game" onClick={()=>setGame(null)} sm outline/></div>
          </Crd>

          <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:0.5,padding:"14px 0 8px"}}>PLAYERS ({game.players.length})</div>
          <Crd style={{padding:0,overflow:"hidden"}}>
            {game.players.map((p,i)=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderTop:i>0?`1px solid ${T.border}`:"none"}}>
                <Av name={p.name} team={p.team} size={34}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14,color:T.text}}>{p.name}</div>
                  <div style={{fontSize:11,color:T.sub}}>Hcp {p.handicap} · {tm(p.team).label}</div>
                </div>
                <div style={{width:10,height:10,borderRadius:"50%",background:tm(p.team).bg}}/>
              </div>
            ))}
          </Crd>

          <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:0.5,padding:"14px 0 8px"}}>MATCHES ({game.matches.length})</div>
          {game.matches.map(m=>(
            <Crd key={m.id} style={{marginBottom:10}}>
              <div style={{fontWeight:700,fontSize:15,color:T.text,marginBottom:8}}>
                {m.name}
                {game.days>1&&<span style={{fontSize:11,color:T.sub,fontWeight:400}}> · Day {m.day}</span>}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {m.teams.map(t=>(
                  <div key={t.id} style={{background:tm(t.color).bg+"18",border:`1px solid ${tm(t.color).bg}44`,borderRadius:10,padding:"6px 10px"}}>
                    <div style={{fontSize:9,fontWeight:700,color:tm(t.color).bg,letterSpacing:0.5,marginBottom:3}}>{TC[t.color]?.label} Team</div>
                    {t.players.map(pid=>{const pl=game.players.find(p=>p.id===pid);return pl?<div key={pid} style={{fontSize:13,color:T.text,fontWeight:600}}>{pl.name}</div>:null;})}
                  </div>
                ))}
              </div>
            </Crd>
          ))}

          {(game.competitions||[]).length>0&&(
            <>
              <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:0.5,padding:"6px 0 8px"}}>COMPETITIONS</div>
              {game.competitions.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:T.white,borderRadius:10,marginBottom:6,border:`1px solid ${T.border}`}}>
                  <span style={{fontSize:18}}>{c.type==="ntp"?"📍":"💥"}</span>
                  <span style={{fontSize:13,color:T.text,fontWeight:600}}>{c.type==="ntp"?"Nearest the Pin":"Longest Drive"} — Hole {c.hole}{game.days>1?` (Day ${c.day})`:""}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── CREATE FLOW ───────────────────────────────────────────────────────────
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:T.bg,overflow:"hidden"}}>
      {/* Step tabs */}
      <div style={{display:"flex",background:T.white,borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        {["Details","Players","Matches","Comps"].map((s,i)=>(
          <div key={i} onClick={()=>setStep(i+1)}
            style={{flex:1,padding:"10px 4px",textAlign:"center",cursor:"pointer",
              borderBottom:step===i+1?`2px solid ${T.teal}`:"2px solid transparent",
              color:step===i+1?T.teal:T.dim,fontWeight:step===i+1?700:500,fontSize:11,whiteSpace:"nowrap"}}>
            {i+1}. {s}
          </div>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"0 16px 80px"}}>
        {/* Join banner */}
        <Crd style={{marginTop:12,padding:"11px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,color:T.sub}}>Got a code to join?</div>
            <button onClick={()=>setShowJ(v=>!v)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 12px",fontSize:12,color:T.teal,cursor:"pointer",fontWeight:600}}>Enter Code →</button>
          </div>
          {showJ&&(
            <div style={{marginTop:10,display:"flex",gap:8}}>
              <input value={jCode} onChange={e=>{setJCode(e.target.value.toUpperCase());setJErr("");}} placeholder="e.g. WACK42" maxLength={8}
                style={{flex:1,padding:"10px 12px",background:"#F8FAFA",border:`1px solid ${T.border}`,borderRadius:10,fontSize:18,color:T.text,fontWeight:700,letterSpacing:4,textAlign:"center"}}/>
              <Btn label="Join" onClick={handleJoin} sm/>
            </div>
          )}
          {jErr&&<div style={{color:T.red,fontSize:12,marginTop:6}}>{jErr}</div>}
        </Crd>

        {/* STEP 1 */}
        {step===1&&(
          <div>
            <Crd style={{marginTop:12,textAlign:"center"}}>
              <div style={{fontSize:10,fontWeight:600,color:T.sub,letterSpacing:0.5,marginBottom:4}}>GAME CODE</div>
              <div style={{fontSize:40,fontWeight:700,color:T.teal,letterSpacing:6}}>{codeRef.current}</div>
              <div style={{fontSize:11,color:T.dim,marginTop:2}}>Share with your group to join</div>
            </Crd>
            <Inp label="Game Name" value={gName} onChange={setGName} placeholder="e.g. The Masters 2026"/>
            <Inp label="Date" type="date" value={gDate} onChange={setGDate}/>
            <Fld>Number of Days</Fld>
            <div style={{display:"flex",gap:8}}>
              {[1,2].map(d=>(
                <button key={d} onClick={()=>setGDays(d)}
                  style={{flex:1,padding:"11px 0",border:`1px solid ${gDays===d?T.teal:T.border}`,borderRadius:10,background:gDays===d?T.teal:T.white,color:gDays===d?"#fff":T.sub,fontWeight:700,fontSize:14,cursor:"pointer"}}>
                  {d} Day{d>1?"s":""}
                </button>
              ))}
            </div>
            <div style={{marginTop:10,padding:"10px 12px",background:T.tealPale,borderRadius:10,fontSize:12,color:T.tealDark}}>
              ⛳ Course: {course?.name||"Tewkesbury Park (default)"}
            </div>
            <div style={{marginTop:14}}><Btn label="Next: Add Players →" onClick={()=>setStep(2)} full disabled={!gName.trim()}/></div>
          </div>
        )}

        {/* STEP 2 */}
        {step===2&&(
          <div>
            <Crd style={{marginTop:12}}>
              <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:10}}>Add Player</div>
              <Inp value={pForm.name} onChange={v=>setPF(f=>({...f,name:v}))} placeholder="Full name"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Inp value={pForm.hcp} onChange={v=>setPF(f=>({...f,hcp:v}))} placeholder="Handicap" type="number"/>
                <div>
                  <Fld>Team</Fld>
                  <select value={pForm.team} onChange={e=>setPF(f=>({...f,team:e.target.value}))}
                    style={{width:"100%",padding:"11px 10px",background:"#F8FAFA",border:`1px solid ${T.border}`,borderRadius:10,fontSize:14,color:T.text}}>
                    {TKEYS.map(t=><option key={t} value={t}>{TC[t].label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginTop:10}}><Btn label="+ Add Player" onClick={addPlayer} full/></div>
            </Crd>
            {players.length>0&&(
              <Crd style={{marginTop:10,padding:0,overflow:"hidden"}}>
                {players.map((p,i)=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderTop:i>0?`1px solid ${T.border}`:"none"}}>
                    <Av name={p.name} team={p.team} size={32}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:14,color:T.text}}>{p.name}</div>
                      <div style={{fontSize:11,color:T.sub}}>Hcp {p.handicap} · {TC[p.team].label}</div>
                    </div>
                    <button onClick={()=>setPL(ps=>ps.filter(x=>x.id!==p.id))} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:20}}>×</button>
                  </div>
                ))}
              </Crd>
            )}
            <div style={{marginTop:14}}><Btn label="Next: Set Up Matches →" onClick={()=>setStep(3)} full disabled={players.length<2}/></div>
          </div>
        )}

        {/* STEP 3 */}
        {step===3&&(
          <div>
            {matches.map(m=>(
              <Crd key={m.id} style={{marginTop:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:15,color:T.text}}>
                    {m.name}{gDays>1&&<span style={{fontSize:11,color:T.sub}}> · Day {m.day}</span>}
                  </div>
                  <button onClick={()=>setMT(ms=>ms.filter(x=>x.id!==m.id))} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:20}}>×</button>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {m.teams.map(t=>(
                    <div key={t.id} style={{background:tm(t.color).bg+"18",border:`1px solid ${tm(t.color).bg}44`,borderRadius:10,padding:"6px 10px"}}>
                      <div style={{fontSize:9,fontWeight:700,color:tm(t.color).bg,marginBottom:3}}>{TC[t.color]?.label}</div>
                      {t.players.map(pid=>{const pl=players.find(p=>p.id===pid);return pl?<div key={pid} style={{fontSize:12,color:T.text,fontWeight:600}}>{pl.name.split(" ")[0]}</div>:null;})}
                    </div>
                  ))}
                </div>
              </Crd>
            ))}
            <Crd style={{marginTop:10}}>
              <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:10}}>New Match</div>
              <div style={{display:"grid",gridTemplateColumns:gDays>1?"1fr 80px":"1fr",gap:8}}>
                <Inp value={mForm.name} onChange={v=>setMF(f=>({...f,name:v}))} placeholder={`Match ${matches.length+1}`}/>
                {gDays>1&&(
                  <div>
                    <Fld>Day</Fld>
                    <select value={mForm.day} onChange={e=>setMF(f=>({...f,day:parseInt(e.target.value,10)}))}
                      style={{width:"100%",padding:"11px 8px",background:"#F8FAFA",border:`1px solid ${T.border}`,borderRadius:10,fontSize:14,color:T.text}}>
                      {Array.from({length:gDays},(_,i)=><option key={i+1} value={i+1}>Day {i+1}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <button onClick={()=>setMF(f=>({...f,tri:!f.tri}))}
                style={{marginTop:8,padding:"5px 12px",border:`1px solid ${mForm.tri?T.teal:T.border}`,borderRadius:16,background:mForm.tri?T.tealPale:"transparent",color:mForm.tri?T.teal:T.sub,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {mForm.tri?"3 Teams ✓":"2 Teams"} — tap to switch
              </button>
              {["A","B",...(mForm.tri?["C"]:[])].map((key,ti)=>{
                const labels=["Red Team","Blue Team","Green Team"],colors=["red","blue","green"];
                const taken=["A","B","C"].filter(k=>k!==key).flatMap(k=>mForm[k]);
                return (
                  <div key={key} style={{marginTop:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:tm(colors[ti]).bg}}/>
                      <span style={{fontSize:11,fontWeight:600,color:T.sub}}>{labels[ti]}</span>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {players.filter(p=>!taken.includes(p.id)).map(p=>{
                        const sel=mForm[key].includes(p.id);
                        return (
                          <button key={p.id} onClick={()=>togglePInTeam(p.id,key)}
                            style={{padding:"6px 12px",border:`1px solid ${sel?tm(colors[ti]).bg:T.border}`,borderRadius:20,background:sel?tm(colors[ti]).bg+"22":"transparent",color:sel?T.text:T.sub,fontSize:13,fontWeight:sel?700:400,cursor:"pointer"}}>
                            {p.name.split(" ")[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div style={{marginTop:12}}><Btn label="+ Add Match" onClick={addMatch} full disabled={!mForm.A.length||!mForm.B.length}/></div>
            </Crd>
            <div style={{marginTop:14}}>
              {matches.length===0 && (mForm.A.length===0||mForm.B.length===0) && (
                <div style={{padding:"10px 12px",background:"#FFF3E0",border:"1px solid #FFB74D",borderRadius:10,fontSize:13,color:"#E65100",marginBottom:10,textAlign:"center"}}>
                  ⚠️ Add at least one match before continuing
                </div>
              )}
              <Btn label="Next: Add Competitions →" onClick={()=>{
                // Auto-save current match if teams are selected
                if(mForm.A.length>0&&mForm.B.length>0) addMatch();
                setStep(4);
              }} full disabled={matches.length===0&&mForm.A.length===0}/>
            </div>
          </div>
        )}

        {/* STEP 4 — COMPETITIONS */}
        {step===4&&(
          <div>
            <Crd style={{marginTop:12}}>
              <div style={{fontWeight:700,fontSize:15,color:T.text,marginBottom:4}}>Competitions</div>
              <div style={{fontSize:13,color:T.sub,marginBottom:12}}>
                Set which holes have Nearest the Pin or Longest Drive. Badges appear on every player's scorecard.
              </div>
              {comps.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:c.type==="ntp"?"#E3F2FD":"#FFF9E6",borderRadius:8,marginBottom:6,border:`1px solid ${c.type==="ntp"?"#90CAF9":"#FFE082"}`}}>
                  <span style={{fontSize:16}}>{c.type==="ntp"?"📍":"💥"}</span>
                  <span style={{fontWeight:700,fontSize:13,color:T.text,flex:1}}>{c.type==="ntp"?"Nearest the Pin":"Longest Drive"} — Hole {c.hole}{gDays>1?` (Day ${c.day})`:""}</span>
                  <button onClick={()=>setComps(cs=>cs.filter(x=>x.id!==c.id))} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
                </div>
              ))}
              <Fld>Type</Fld>
              <div style={{display:"flex",gap:8,marginBottom:4}}>
                {[{v:"ntp",l:"📍 Nearest Pin"},{v:"ld",l:"💥 Longest Drive"}].map(opt=>(
                  <button key={opt.v} onClick={()=>setCF(f=>({...f,type:opt.v}))}
                    style={{flex:1,padding:"9px 8px",border:`1px solid ${cForm.type===opt.v?T.teal:T.border}`,borderRadius:10,background:cForm.type===opt.v?T.tealPale:"transparent",color:cForm.type===opt.v?T.teal:T.sub,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                    {opt.l}
                  </button>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:gDays>1?"1fr 1fr":"1fr",gap:8,marginBottom:12}}>
                <div>
                  <Fld>Hole</Fld>
                  <select value={cForm.hole} onChange={e=>setCF(f=>({...f,hole:parseInt(e.target.value,10)}))}
                    style={{width:"100%",padding:"10px 12px",background:"#F8FAFA",border:`1px solid ${T.border}`,borderRadius:10,fontSize:14,color:T.text,boxSizing:"border-box"}}>
                    {Array.from({length:18},(_,i)=><option key={i+1} value={i+1}>Hole {i+1} — Par {(course?.pars||DP)[i]}</option>)}
                  </select>
                </div>
                {gDays>1&&(
                  <div>
                    <Fld>Day</Fld>
                    <select value={cForm.day} onChange={e=>setCF(f=>({...f,day:parseInt(e.target.value,10)}))}
                      style={{width:"100%",padding:"10px 12px",background:"#F8FAFA",border:`1px solid ${T.border}`,borderRadius:10,fontSize:14,color:T.text,boxSizing:"border-box"}}>
                      {Array.from({length:gDays},(_,i)=><option key={i+1} value={i+1}>Day {i+1}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <Btn label="+ Add Competition" onClick={addComp} full/>
            </Crd>
            <div style={{marginTop:14}}><Btn label="🏌️  Launch Game" onClick={launch} full color={T.teal}/></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORECARD TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ScorecardTab({game, setGame}) {
  const [openId,    setOpenId]    = useState(null);
  const [openMatch, setOpenMatch] = useState(null);
  const [day,       setDay]       = useState(1);
  const [groupHole, setGroupHole] = useState(0);

  if(!game) {
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:T.bg,gap:12,padding:24,textAlign:"center"}}>
        <div style={{fontSize:48}}>⛳</div>
        <div style={{fontWeight:700,fontSize:18,color:T.text}}>No game set up yet</div>
        <div style={{fontSize:13,color:T.sub}}>Go to Match Setup to create a game first</div>
      </div>
    );
  }

  const pars  = game.course?.pars  || DP;
  const sis   = game.course?.sis   || DS;
  const yards = game.course?.yards || DY;
  const comps = game.competitions  || [];

  // Get competitions on a specific hole for a specific day
  function compsOn(holeIdx, d) {
    return comps.filter(c => {
      const holeMatch = parseInt(String(c.hole),10) === holeIdx+1;
      const dayMatch  = game.days <= 1 || parseInt(String(c.day),10) === d;
      return holeMatch && dayMatch;
    });
  }

  function updateScore(pid, holeIdx, val) {
    setGame(g => {
      const scores = JSON.parse(JSON.stringify(g.scores||{}));
      if(!scores[pid]) scores[pid] = {};
      if(!scores[pid][day] || !Array.isArray(scores[pid][day])) scores[pid][day] = Array(18).fill(0);
      scores[pid][day][holeIdx] = Math.max(0, parseInt(String(val),10)||0);
      return {...g, scores};
    });
  }

  // Always show ALL matches — grouped by day when multi-day game
  // No filtering that could cause empty screens
  const allMatches = game.matches || [];

  // ── GROUP VIEW ─────────────────────────────────────────────────────────────
  if(openMatch) {
    const match = (game.matches||[]).find(m=>m.id===openMatch);
    if(!match) { setOpenMatch(null); return null; }

    const allPids      = match.teams.flatMap(t=>t.players);
    const matchPlayers = allPids.map(pid=>{
      const pl = game.players.find(p=>p.id===pid);
      const teamColor = match.teams.find(t=>t.players.includes(pid))?.color;
      return pl ? {...pl, teamColor} : null;
    }).filter(Boolean);

    const par     = pars[groupHole];
    const yardage = yards[groupHole];
    const si      = sis[groupHole];
    const holeComps = compsOn(groupHole, day);

    const dayBtns = game.days > 1 ? (
      <div style={{display:"flex",gap:5}}>
        {Array.from({length:game.days},(_,i)=>(
          <button key={i+1} onClick={()=>setDay(i+1)}
            style={{background:day===i+1?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)",border:`1px solid ${day===i+1?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.3)"}`,color:"#fff",borderRadius:16,padding:"3px 10px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            D{i+1}
          </button>
        ))}
      </div>
    ) : null;

    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",background:T.bg,overflow:"hidden"}}>
        <Bar title={match.name} sub="Group Scorecard" onBack={()=>setOpenMatch(null)} right={dayBtns}/>

        {/* Hole strip */}
        <div style={{background:T.tealDark,padding:"8px 12px",overflowX:"auto",flexShrink:0}}>
          <div style={{display:"flex",gap:4,minWidth:"max-content"}}>
            {Array.from({length:18},(_,i)=>{
              const hc = compsOn(i,day);
              const allDone = matchPlayers.every(p=>(getScores(game,p.id,day)[i]||0)>0);
              return (
                <button key={i} onClick={()=>setGroupHole(i)}
                  style={{width:32,height:32,borderRadius:7,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0,position:"relative",
                    background:groupHole===i?T.gold:allDone?"rgba(76,175,80,0.35)":"rgba(255,255,255,0.12)",
                    color:groupHole===i?"#fff":"rgba(255,255,255,0.8)"}}>
                  {i+1}
                  {hc.length>0&&<div style={{position:"absolute",top:1,right:1,width:6,height:6,borderRadius:"50%",background:hc[0].type==="ntp"?"#29B6F6":"#FFA726"}}/>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hole info bar */}
        <div style={{background:T.teal,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{display:"flex",gap:16}}>
            {[{l:"HOLE",v:groupHole+1},{l:"PAR",v:par},{l:"YARDS",v:yardage},{l:"SI",v:si}].map((x,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.7)",letterSpacing:1}}>{x.l}</div>
                <div style={{fontSize:22,fontWeight:700,color:"#fff",lineHeight:1}}>{x.v}</div>
              </div>
            ))}
          </div>
          {holeComps.length>0&&(
            <div style={{display:"flex",gap:6}}>
              {holeComps.map(c=>(
                <div key={c.id} style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",gap:4}}>
                  {c.type==="ntp"?"📍 NTP":"💥 LD"}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Player score entry */}
        <div style={{flex:1,overflowY:"auto",padding:"12px 16px",paddingBottom:90}}>
          {matchPlayers.map(player=>{
            const allScores = getScores(game, player.id, day);
            const sc        = allScores[groupHole] || 0;
            const pts       = sc>0 ? sf(sc, par, player.handicap, si) : 0;
            const totalPts  = totalSF(allScores, player.handicap, pars, sis);
            const played    = allScores.filter(s=>s>0).length;
            const shots     = Math.floor(player.handicap/18)+(si<=(player.handicap%18)?1:0);

            return (
              <Crd key={player.id} style={{marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <Av name={player.name} team={player.teamColor||player.team} size={40}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:15,color:T.text}}>{player.name}</div>
                    <div style={{fontSize:11,color:T.sub}}>
                      Hcp {player.handicap}{shots>0?` · +${shots} shot${shots>1?"s":""} this hole`:""} · {totalPts} pts ({played} holes)
                    </div>
                  </div>
                  {pts>0&&(
                    <div style={{textAlign:"center"}}>
                      <Chip pts={pts}/>
                      <div style={{fontSize:9,color:T.sub,marginTop:2}}>pts</div>
                    </div>
                  )}
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <button onClick={()=>updateScore(player.id, groupHole, Math.max(0,sc-1))}
                    style={{width:44,height:44,borderRadius:10,border:`1px solid ${T.border}`,background:"#F8FAFA",fontSize:22,color:T.teal,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                  <div style={{flex:1,textAlign:"center"}}>
                    <input type="number" min="0" max="15" value={sc||""} onChange={e=>updateScore(player.id,groupHole,e.target.value)}
                      style={{width:"100%",padding:"10px 0",textAlign:"center",background:"#F8FAFA",border:`1px solid ${T.border}`,borderRadius:10,fontSize:28,fontWeight:700,color:sc?T.text:T.dim}}
                      placeholder={String(par)}/>
                    <div style={{fontSize:10,color:T.sub,marginTop:3}}>
                      {sc>0?(sc===par?"Level par":sc<par?`${par-sc} under par`:`${sc-par} over par`):"Enter score"}
                    </div>
                  </div>
                  <button onClick={()=>updateScore(player.id, groupHole, sc+1)}
                    style={{width:44,height:44,borderRadius:10,border:`1px solid ${T.border}`,background:"#F8FAFA",fontSize:22,color:T.teal,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                </div>
              </Crd>
            );
          })}
        </div>

        {/* Prev / Next */}
        <div style={{flexShrink:0,background:T.white,borderTop:`1px solid ${T.border}`,padding:"10px 16px",display:"flex",gap:10}}>
          <button onClick={()=>setGroupHole(h=>Math.max(0,h-1))} disabled={groupHole===0}
            style={{flex:1,padding:"12px 0",border:`1px solid ${T.border}`,borderRadius:10,background:"#F8FAFA",fontWeight:700,fontSize:14,cursor:groupHole>0?"pointer":"not-allowed",color:groupHole>0?T.text:T.dim}}>
            ← Hole {groupHole}
          </button>
          <button onClick={()=>setGroupHole(h=>Math.min(17,h+1))} disabled={groupHole===17}
            style={{flex:1,padding:"12px 0",border:"none",borderRadius:10,background:groupHole<17?T.teal:"#E0E6E3",fontWeight:700,fontSize:14,cursor:groupHole<17?"pointer":"not-allowed",color:groupHole<17?"#fff":T.dim}}>
            Hole {groupHole+2} →
          </button>
        </div>
      </div>
    );
  }

  // ── INDIVIDUAL SCORECARD ───────────────────────────────────────────────────
  if(openId) {
    const player = game.players.find(p=>p.id===openId);
    if(!player) { setOpenId(null); return null; }

    const hs       = getScores(game, player.id, day);
    const totalPts = totalSF(hs, player.handicap, pars, sis);
    const gross    = hs.reduce((a,b)=>a+b,0);
    const totalPar = pars.reduce((a,b)=>a+b,0);

    const dayBtns = game.days>1 ? (
      <div style={{display:"flex",gap:5}}>
        {Array.from({length:game.days},(_,i)=>(
          <button key={i+1} onClick={()=>setDay(i+1)}
            style={{background:day===i+1?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)",border:`1px solid ${day===i+1?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.3)"}`,color:"#fff",borderRadius:16,padding:"3px 10px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            D{i+1}
          </button>
        ))}
      </div>
    ) : null;

    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",background:T.bg,overflow:"hidden"}}>
        <Bar title={player.name} sub={`Handicap ${player.handicap} · ${game.course?.name||""}`} onBack={()=>setOpenId(null)} right={dayBtns}/>
        <div style={{flex:1,overflowY:"auto"}}>
          <div style={{margin:"12px 16px"}}>
            <Crd>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <Av name={player.name} team={player.team} size={48}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:17,color:T.text}}>{player.name}</div>
                  <div style={{fontSize:12,color:T.sub}}>Handicap {player.handicap}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:34,fontWeight:700,color:T.teal,lineHeight:1}}>{totalPts}</div>
                  <div style={{fontSize:11,color:T.sub}}>Stableford</div>
                </div>
              </div>
            </Crd>
          </div>

          {[0,9].map(off=>{
            const label  = off===0?"FRONT NINE":"BACK NINE";
            const outLabel = off===0?"Out":"In";
            const slice  = hs.slice(off,off+9);
            const hGross = slice.reduce((a,b)=>a+b,0);
            const hPar   = pars.slice(off,off+9).reduce((a,b)=>a+b,0);
            const hPts   = slice.reduce((s,sc,i)=>sc>0?s+sf(sc,pars[off+i],player.handicap,sis[off+i]):s,0);
            return (
              <div key={off} style={{margin:"0 16px 12px",background:T.white,borderRadius:14,overflow:"hidden",border:`1px solid ${T.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:320}}>
                    <thead>
                      {/* Teal hole header row — matches screenshot */}
                      <tr style={{background:T.teal}}>
                        <td style={{padding:"6px 8px",color:"#fff",fontWeight:700,fontSize:11,letterSpacing:0.5,whiteSpace:"nowrap"}}>Hole</td>
                        {Array.from({length:9},(_,i)=>i+off+1).map(h=>{
                          const hc = compsOn(h-1,day);
                          return (
                            <td key={h} style={{textAlign:"center",padding:"6px 3px",fontWeight:700,color:"#fff",fontSize:12,position:"relative"}}>
                              <span style={{position:"relative"}}>
                                {h}
                                {hc.length>0&&<span style={{position:"absolute",top:-4,right:-5,fontSize:7}}>{hc[0].type==="ntp"?"📍":"💥"}</span>}
                              </span>
                            </td>
                          );
                        })}
                        <td style={{textAlign:"center",padding:"6px 6px",fontWeight:800,color:"#fff",fontSize:12}}>{outLabel}</td>
                      </tr>
                      <tr style={{background:"#FAFAFA"}}>
                        <td style={{padding:"4px 8px",color:T.sub,fontSize:10}}>Hcp</td>
                        {sis.slice(off,off+9).map((s,i)=><td key={i} style={{textAlign:"center",color:T.sub,fontSize:10,padding:"4px 2px"}}>{s}</td>)}
                        <td/>
                      </tr>
                      <tr style={{borderBottom:`2px solid ${T.border}`}}>
                        <td style={{padding:"4px 8px",color:T.text,fontWeight:700,fontSize:12}}>Par</td>
                        {pars.slice(off,off+9).map((p,i)=><td key={i} style={{textAlign:"center",fontWeight:700,color:T.text,fontSize:12,padding:"4px 2px"}}>{p}</td>)}
                        <td style={{textAlign:"center",fontWeight:800,color:T.text,fontSize:12}}>{hPar}</td>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Score row — coloured blocks matching screenshot */}
                      <tr style={{background:"#F8FAFA"}}>
                        <td style={{padding:"6px 8px",color:T.text,fontWeight:700,fontSize:12}}>Score</td>
                        {Array.from({length:9},(_,i)=>i+off).map(hi=>(
                          <td key={hi} style={{textAlign:"center",padding:"4px 2px"}}>
                            <ScoreBlock score={hs[hi]||0} par={pars[hi]} hcp={player.handicap} si={sis[hi]}/>
                          </td>
                        ))}
                        <td style={{textAlign:"center",fontWeight:800,fontSize:14,color:T.teal}}>{hGross||"—"}</td>
                      </tr>
                      {/* Edit row — plain inputs */}
                      <tr>
                        <td style={{padding:"3px 8px",color:T.dim,fontSize:10}}>Edit</td>
                        {Array.from({length:9},(_,i)=>i+off).map(hi=>(
                          <td key={hi} style={{textAlign:"center",padding:"3px 2px"}}>
                            <input type="number" min="0" max="15" value={hs[hi]||""} onChange={e=>updateScore(player.id,hi,e.target.value)}
                              style={{width:28,textAlign:"center",background:"#fff",border:`1px solid ${T.border}`,borderRadius:5,fontSize:11,padding:"2px 0",color:T.text}}/>
                          </td>
                        ))}
                        <td style={{textAlign:"center",fontSize:11,color:T.dim}}>{hPts} pts</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Totals — matches screenshot: Gross Strokes / Net Score / Stableford */}
          <div style={{margin:"0 16px 90px"}}>
            <div style={{background:T.white,borderRadius:14,border:`1px solid ${T.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",textAlign:"center"}}>
                <div style={{padding:"14px 8px",borderRight:`1px solid ${T.border}`}}>
                  <div style={{fontSize:28,fontWeight:700,color:T.blue}}>{gross||"—"}</div>
                  <div style={{fontSize:10,color:T.sub,marginTop:2}}>{gross?`+${gross-totalPar} gross`:"Gross Strokes"}</div>
                </div>
                <div style={{padding:"14px 8px",borderRight:`1px solid ${T.border}`}}>
                  <div style={{fontSize:28,fontWeight:700,color:T.text}}>
                    {gross ? gross - Math.round(player.handicap * 18/18) : "—"}
                  </div>
                  <div style={{fontSize:10,color:T.sub,marginTop:2}}>
                    {gross ? `${gross - Math.round(player.handicap) < totalPar ? "" : "+"}${gross - Math.round(player.handicap) - totalPar} net` : "Net Score"}
                  </div>
                </div>
                <div style={{padding:"14px 8px"}}>
                  <div style={{fontSize:28,fontWeight:700,color:T.teal}}>{totalPts}</div>
                  <div style={{fontSize:10,color:T.sub,marginTop:2}}>Stableford</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── INLINE SCORECARD VIEW — all players expanded, like photo 2 ──────────────
  return (
    <div style={{flex:1,overflowY:"auto",background:T.bg,paddingBottom:80}}>
      {allMatches.length===0&&(
        <div style={{padding:32,textAlign:"center",color:T.sub,fontSize:13}}>No matches set up yet.</div>
      )}

      {allMatches.map(m=>{
        const allPids   = m.teams.flatMap(t=>t.players);
        const mPlayers  = allPids.map(pid=>{
          const pl        = game.players.find(p=>p.id===pid);
          const teamColor = m.teams.find(t=>t.players.includes(pid))?.color;
          return pl ? {...pl, teamColor} : null;
        }).filter(Boolean);

        return (
          <div key={m.id} style={{margin:"12px 16px 0"}}>
            {/* Match name header — shows day label for multi-day games */}
            <div style={{background:T.teal,borderRadius:"12px 12px 0 0",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:700,fontSize:15,color:"#fff"}}>{m.name}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>
                {game.days>1?`Day ${parseInt(String(m.day),10)} · `:""}Stableford
              </div>
            </div>

            {/* One inline scorecard per player */}
            {mPlayers.map((pl, pi) => {
              const hs       = getScores(game, pl.id, day);
              const totalPts = totalSF(hs, pl.handicap, pars, sis);
              const gross    = hs.reduce((a,b)=>a+b,0);
              const totalPar = pars.reduce((a,b)=>a+b,0);
              const netScore = gross ? gross - pl.handicap : 0;

              return (
                <div key={pl.id} style={{background:T.white,borderTop:pi>0?`2px solid ${T.bg}`:"none",paddingBottom:4}}>
                  {/* Player name row */}
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px 6px"}}>
                    <Av name={pl.name} team={pl.teamColor||pl.team} size={36}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:15,color:T.text}}>{pl.name}</div>
                      <div style={{fontSize:11,color:T.sub}}>Hcp {pl.handicap}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:26,fontWeight:700,color:T.teal,lineHeight:1}}>{totalPts}</div>
                      <div style={{fontSize:10,color:T.sub}}>Stableford</div>
                    </div>
                  </div>

                  {/* Front and back nine tables */}
                  {[0,9].map(off=>{
                    const outLabel = off===0?"Out":"In";
                    const hGross   = hs.slice(off,off+9).reduce((a,b)=>a+b,0);
                    const hPar     = pars.slice(off,off+9).reduce((a,b)=>a+b,0);

                    return (
                      <div key={off} style={{overflowX:"auto",borderTop:`1px solid ${T.border}`}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:300}}>
                          <thead>
                            {/* Teal hole header */}
                            <tr style={{background:T.teal}}>
                              <td style={{padding:"5px 6px",color:"#fff",fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>Hole</td>
                              {Array.from({length:9},(_,i)=>i+off+1).map(h=>{
                                const hc = compsOn(h-1,day);
                                return (
                                  <td key={h} style={{textAlign:"center",padding:"5px 2px",fontWeight:700,color:"#fff",fontSize:12,position:"relative"}}>
                                    <span style={{position:"relative"}}>
                                      {h}
                                      {hc.length>0&&<span style={{position:"absolute",top:-4,right:-5,fontSize:7}}>{hc[0].type==="ntp"?"📍":"💥"}</span>}
                                    </span>
                                  </td>
                                );
                              })}
                              <td style={{textAlign:"center",padding:"5px 5px",fontWeight:800,color:"#fff",fontSize:11}}>{outLabel}</td>
                            </tr>
                            {/* Hcp row */}
                            <tr style={{background:"#FAFAFA"}}>
                              <td style={{padding:"3px 6px",color:T.sub,fontSize:10}}>Hcp</td>
                              {sis.slice(off,off+9).map((s,i)=><td key={i} style={{textAlign:"center",color:T.sub,fontSize:10,padding:"3px 2px"}}>{s}</td>)}
                              <td/>
                            </tr>
                            {/* Par row */}
                            <tr style={{borderBottom:`2px solid ${T.border}`}}>
                              <td style={{padding:"3px 6px",color:T.text,fontWeight:700,fontSize:12}}>Par</td>
                              {pars.slice(off,off+9).map((p,i)=><td key={i} style={{textAlign:"center",fontWeight:700,color:T.text,fontSize:12,padding:"3px 2px"}}>{p}</td>)}
                              <td style={{textAlign:"center",fontWeight:800,color:T.text,fontSize:12}}>{hPar}</td>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Score blocks — coloured like screenshot */}
                            <tr>
                              <td style={{padding:"5px 6px",color:T.text,fontWeight:700,fontSize:12}}>Score</td>
                              {Array.from({length:9},(_,i)=>i+off).map(hi=>(
                                <td key={hi} style={{textAlign:"center",padding:"4px 2px"}}>
                                  <ScoreBlock score={hs[hi]||0} par={pars[hi]} hcp={pl.handicap} si={sis[hi]}/>
                                </td>
                              ))}
                              <td style={{textAlign:"center",fontWeight:800,fontSize:13,color:T.teal}}>{hGross||"—"}</td>
                            </tr>
                            {/* Editable input row */}
                            <tr style={{background:"#FAFAFA"}}>
                              <td style={{padding:"3px 6px",color:T.dim,fontSize:10}}>Edit</td>
                              {Array.from({length:9},(_,i)=>i+off).map(hi=>(
                                <td key={hi} style={{textAlign:"center",padding:"3px 2px"}}>
                                  <input type="number" min="0" max="15"
                                    value={hs[hi]||""}
                                    onChange={e=>updateScore(pl.id,hi,e.target.value)}
                                    style={{width:28,textAlign:"center",background:"#fff",border:`1px solid ${T.border}`,borderRadius:5,fontSize:11,padding:"2px 0",color:T.text}}/>
                                </td>
                              ))}
                              <td style={{textAlign:"center",fontSize:10,color:T.dim}}>
                                {hs.slice(off,off+9).reduce((s,sc,i)=>sc>0?s+sf(sc,pars[off+i],pl.handicap,sis[off+i]):s,0)} pts
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}

                  {/* Totals row — Gross / Net / Stableford */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:`1px solid ${T.border}`,textAlign:"center"}}>
                    <div style={{padding:"10px 8px",borderRight:`1px solid ${T.border}`}}>
                      <div style={{fontSize:22,fontWeight:700,color:T.blue}}>{gross||"—"}</div>
                      <div style={{fontSize:10,color:T.sub}}>Gross Strokes</div>
                    </div>
                    <div style={{padding:"10px 8px",borderRight:`1px solid ${T.border}`}}>
                      <div style={{fontSize:22,fontWeight:700,color:T.text}}>{gross?gross-pl.handicap:"—"}</div>
                      <div style={{fontSize:10,color:T.sub}}>Net Score</div>
                    </div>
                    <div style={{padding:"10px 8px"}}>
                      <div style={{fontSize:22,fontWeight:700,color:T.teal}}>{totalPts}</div>
                      <div style={{fontSize:10,color:T.sub}}>Stableford</div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{height:4,background:T.teal,borderRadius:"0 0 12px 12px",marginBottom:16}}/>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════════
function LeaderboardTab({game, setGame}) {
  const [view, setView] = useState("individual");
  const [day,  setDay]  = useState(1);
  const [bForm,setBF]   = useState({type:"ntp",hole:1,pid:"",desc:""});

  if(!game) {
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:T.bg,gap:12,padding:24,textAlign:"center"}}>
        <div style={{fontSize:48}}>🏆</div>
        <div style={{fontWeight:700,fontSize:18,color:T.text}}>No active game</div>
        <div style={{fontSize:13,color:T.sub}}>Set up a game in Match Setup first</div>
      </div>
    );
  }

  const pars = game.course?.pars || DP;
  const sis  = game.course?.sis  || DS;

  function addBonus() {
    if(!bForm.pid) return;
    const pl = game.players.find(p=>p.id===bForm.pid);
    setGame(g=>({...g,bonuses:[...(g.bonuses||[]),{id:uid(),...bForm,playerName:pl?.name}]}));
    setBF({type:"ntp",hole:1,pid:"",desc:""});
  }
  function removeBonus(id) {
    setGame(g=>({...g,bonuses:(g.bonuses||[]).filter(b=>b.id!==id)}));
  }

  const ranked = game.players
    .map(p=>{
      const sc = getScores(game,p.id,day);
      return {...p, pts:totalSF(sc,p.handicap,pars,sis), played:sc.filter(s=>s>0).length, sc};
    })
    .sort((a,b)=>b.pts-a.pts)
    .map((p,i)=>({...p,rank:i+1}));

  const teamMap = {};
  game.players.forEach(p=>{
    if(!teamMap[p.team]) teamMap[p.team]={team:p.team,pts:0};
    for(let d=1; d<=game.days; d++) {
      teamMap[p.team].pts += totalSF(getScores(game,p.id,d), p.handicap, pars, sis);
    }
  });
  const teamRanked = Object.values(teamMap).sort((a,b)=>b.pts-a.pts);

  const visibleMatches = game.days<=1
    ? (game.matches||[])
    : (game.matches||[]).filter(m=>parseInt(String(m.day),10)===day);

  function matchResult(m) {
    const teams = m.teams.map(t=>({
      ...t,
      sfTotal: t.players.reduce((s,pid)=>{
        const pl=game.players.find(p=>p.id===pid);
        return s+totalSF(getScores(game,pid,day),pl?.handicap||0,pars,sis);
      },0)
    }));
    const wins = teams.map(()=>0);
    let halved = 0;
    for(let h=0;h<18;h++){
      const bests = teams.map(t=>Math.max(0,...t.players.map(pid=>{
        const pl=game.players.find(p=>p.id===pid);
        const sc=getScores(game,pid,day)[h]||0;
        return sc>0 ? sf(sc,pars[h],pl?.handicap||0,sis[h]) : 0;
      })));
      const mx=Math.max(...bests);
      if(mx===0){halved++;continue;}
      const ws=bests.map((v,i)=>v===mx?i:-1).filter(i=>i>=0);
      if(ws.length===1) wins[ws[0]]++;
      else halved++;
    }
    return {teams,wins,halved};
  }

  return (
    <div style={{flex:1,overflowY:"auto",background:T.bg,paddingBottom:80}}>
      {/* Team banner */}
      <div style={{display:"flex",margin:"12px 16px 10px",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.1)"}}>
        {teamRanked.map((t,i)=>(
          <div key={t.team} style={{flex:1,background:tm(t.team).bg,padding:"14px 0",textAlign:"center",color:"#fff",borderRight:i<teamRanked.length-1?"2px solid rgba(255,255,255,0.2)":"none"}}>
            <div style={{fontSize:10,fontWeight:600,opacity:0.8,letterSpacing:1}}>{TC[t.team]?.label.toUpperCase()} TEAM</div>
            <div style={{fontSize:34,fontWeight:700}}>{t.pts}</div>
            <div style={{fontSize:10,opacity:0.7}}>all days total</div>
          </div>
        ))}
      </div>

      {/* Toggles */}
      <div style={{display:"flex",gap:6,padding:"0 16px 10px",flexWrap:"wrap"}}>
        {game.days>1&&Array.from({length:game.days},(_,i)=>(
          <button key={i+1} onClick={()=>setDay(i+1)}
            style={{padding:"6px 12px",border:`1px solid ${day===i+1?T.teal:T.border}`,borderRadius:10,background:day===i+1?T.teal:T.white,color:day===i+1?"#fff":T.sub,fontWeight:700,fontSize:12,cursor:"pointer"}}>
            Day {i+1}
          </button>
        ))}
        <div style={{flex:1}}/>
        {[{id:"individual",l:"Individual"},{id:"matches",l:"Matches"},{id:"bonuses",l:"NTP / LD"}].map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)}
            style={{padding:"6px 12px",border:`1px solid ${view===v.id?T.teal:T.border}`,borderRadius:10,background:view===v.id?T.teal:T.white,color:view===v.id?"#fff":T.sub,fontWeight:700,fontSize:12,cursor:"pointer"}}>
            {v.l}
          </button>
        ))}
      </div>

      {/* INDIVIDUAL */}
      {view==="individual"&&(
        <div style={{background:T.white,borderRadius:14,margin:"0 16px",border:`1px solid ${T.border}`,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          {/* Header row — dark, matching screenshot */}
          <div style={{display:"grid",gridTemplateColumns:"44px 1fr 60px 60px 44px",padding:"10px 16px",background:"#424242",color:"#ccc",fontSize:12,fontWeight:600,letterSpacing:0.5}}>
            <span style={{textAlign:"center"}}>#</span>
            <span>Player</span>
            <span style={{textAlign:"center"}}>Score</span>
            <span style={{textAlign:"center"}}>+/-</span>
            <span style={{textAlign:"center"}}>🚩</span>
          </div>
          {ranked.map((p,i)=>{
            const gross=p.sc.reduce((a,b)=>a+b,0);
            const diff=gross-pars.slice(0,p.played).reduce((a,b)=>a+b,0);
            return (
              <div key={p.id} style={{display:"grid",gridTemplateColumns:"44px 1fr 60px 60px 44px",alignItems:"center",padding:"14px 16px",borderTop:`1px solid ${T.border}`}}>
                <span style={{fontWeight:700,color:T.sub,fontSize:16,textAlign:"center"}}>{p.rank}.</span>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {/* Teal avatar like screenshot */}
                  <div style={{width:40,height:40,borderRadius:"50%",background:T.teal,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0}}>
                    {p.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontWeight:600,fontSize:15,color:T.text}}>{p.name}</div>
                  </div>
                </div>
                <span style={{fontWeight:800,fontSize:22,color:T.text,textAlign:"center"}}>{p.pts}</span>
                <span style={{fontWeight:700,fontSize:15,textAlign:"center",color:diff>0?T.red:diff<0?T.green:T.sub}}>
                  {p.played>0?(diff>=0?`+${diff}`:diff):"—"}
                </span>
                <span style={{textAlign:"center",color:T.sub,fontSize:14}}>{p.played}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* MATCHES */}
      {view==="matches"&&(
        <div style={{padding:"0 16px"}}>
          {visibleMatches.length===0&&<div style={{padding:24,textAlign:"center",color:T.sub,fontSize:13}}>No matches for this selection.</div>}
          {visibleMatches.map(m=>{
            const {teams,wins,halved}=matchResult(m);
            const mx=Math.max(...wins);
            return (
              <Crd key={m.id} style={{marginBottom:12,padding:0,overflow:"hidden"}}>
                <div style={{background:T.tealDark,padding:"9px 14px",fontWeight:700,fontSize:13,color:"#fff"}}>{m.name.toUpperCase()}</div>
                {teams.map((t,ti)=>{
                  const leading=wins[ti]===mx&&mx>0;
                  return (
                    <div key={t.id} style={{padding:"12px 14px",borderTop:ti>0?`1px solid ${T.border}`:"none",background:leading?tm(t.color).bg+"12":"transparent"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:10,height:10,borderRadius:"50%",background:tm(t.color).bg}}/>
                          <div>{t.players.map(pid=>{const pl=game.players.find(p=>p.id===pid);return pl?<div key={pid} style={{fontWeight:700,fontSize:14,color:T.text}}>{pl.name}</div>:null;})}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:22,fontWeight:700,color:leading?T.teal:T.sub}}>{wins[ti]} holes</div>
                          <div style={{fontSize:11,color:T.sub}}>{t.sfTotal} pts</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={{padding:"6px 14px 8px",borderTop:`1px solid ${T.border}`,fontSize:11,color:T.dim}}>{halved} holes halved</div>
              </Crd>
            );
          })}
        </div>
      )}

      {/* NTP / LD */}
      {view==="bonuses"&&(
        <div style={{padding:"0 16px"}}>
          <Crd style={{marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15,color:T.text,marginBottom:12}}>Record a Bonus</div>
            <Fld>Type</Fld>
            <select value={bForm.type} onChange={e=>setBF(f=>({...f,type:e.target.value}))}
              style={{width:"100%",padding:"11px 12px",background:"#F8FAFA",border:`1px solid ${T.border}`,borderRadius:10,fontSize:14,color:T.text,boxSizing:"border-box"}}>
              <option value="ntp">📍 Nearest the Pin</option>
              <option value="ld">💥 Longest Drive</option>
              <option value="other">🏆 Other Award</option>
            </select>
            {bForm.type==="ntp"&&(
              <div>
                <Fld>Hole</Fld>
                <select value={bForm.hole} onChange={e=>setBF(f=>({...f,hole:parseInt(e.target.value,10)}))}
                  style={{width:"100%",padding:"11px 12px",background:"#F8FAFA",border:`1px solid ${T.border}`,borderRadius:10,fontSize:14,color:T.text,boxSizing:"border-box"}}>
                  {Array.from({length:18},(_,i)=><option key={i+1} value={i+1}>Hole {i+1}</option>)}
                </select>
              </div>
            )}
            <Fld>Winner</Fld>
            <select value={bForm.pid} onChange={e=>setBF(f=>({...f,pid:e.target.value}))}
              style={{width:"100%",padding:"11px 12px",background:"#F8FAFA",border:`1px solid ${T.border}`,borderRadius:10,fontSize:14,color:T.text,boxSizing:"border-box"}}>
              <option value="">Select player…</option>
              {game.players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Fld>Notes (optional)</Fld>
            <input value={bForm.desc} onChange={e=>setBF(f=>({...f,desc:e.target.value}))} placeholder="e.g. 3 feet on the 7th"
              style={{width:"100%",padding:"11px 12px",background:"#F8FAFA",border:`1px solid ${T.border}`,borderRadius:10,fontSize:14,color:T.text,boxSizing:"border-box"}}/>
            <div style={{marginTop:12}}><Btn label="✓ Save Bonus" onClick={addBonus} full disabled={!bForm.pid}/></div>
          </Crd>
          {(game.bonuses||[]).length===0&&<div style={{padding:"20px 0",textAlign:"center",color:T.sub,fontSize:13}}>No bonuses recorded yet.</div>}
          {(game.bonuses||[]).map(b=>(
            <Crd key={b.id} style={{marginBottom:10,display:"flex",gap:12,alignItems:"center"}}>
              <div style={{fontSize:26}}>{b.type==="ntp"?"📍":b.type==="ld"?"💥":"🏆"}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:T.text}}>{b.type==="ntp"?`Nearest Pin — Hole ${b.hole}`:b.type==="ld"?"Longest Drive":"Bonus"}</div>
                <div style={{fontSize:15,color:T.teal,fontWeight:700,marginTop:2}}>{b.playerName}</div>
                {b.desc&&<div style={{fontSize:11,color:T.sub,marginTop:2}}>{b.desc}</div>}
              </div>
              <button onClick={()=>removeBonus(b.id)} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
            </Crd>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY TAB
// ═══════════════════════════════════════════════════════════════════════════════
function HistoryTab({history, onReopen}) {
  if(history.length===0) {
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:T.bg,gap:12,padding:24,textAlign:"center"}}>
        <div style={{fontSize:48}}>📋</div>
        <div style={{fontWeight:700,fontSize:18,color:T.text}}>No past games yet</div>
        <div style={{fontSize:13,color:T.sub,lineHeight:1.6}}>Your completed games will appear here.<br/>Create your first game in Match Setup.</div>
      </div>
    );
  }
  return (
    <div style={{flex:1,overflowY:"auto",background:T.bg,paddingBottom:80}}>
      <div style={{padding:"12px 16px 0"}}>
        <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:0.5,marginBottom:10}}>PAST GAMES ({history.length})</div>
        {[...history].reverse().map(g=>{
          const pars=g.course?.pars||DP, sis=g.course?.sis||DS;
          const top = g.players.map(p=>({...p,pts:totalSF(getScores(g,p.id,1),p.handicap,pars,sis)})).sort((a,b)=>b.pts-a.pts)[0];
          const tm2 = {};
          g.players.forEach(p=>{
            if(!tm2[p.team])tm2[p.team]=0;
            for(let d=1;d<=g.days;d++) tm2[p.team]+=totalSF(getScores(g,p.id,d),p.handicap,pars,sis);
          });
          const winner = Object.entries(tm2).sort((a,b)=>b[1]-a[1])[0];
          return (
            <Crd key={g.id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:16,color:T.text}}>{g.name}</div>
                  <div style={{fontSize:12,color:T.sub,marginTop:2}}>{g.course?.name} · {g.date}</div>
                  <div style={{fontSize:12,color:T.sub}}>{g.players.length} players · {g.matches.length} matches · {g.days} day{g.days>1?"s":""}</div>
                  {winner&&<div style={{marginTop:6,fontSize:12,color:T.teal,fontWeight:600}}>🏆 {TC[winner[0]]?.label} Team — {winner[1]} pts</div>}
                  {top&&<div style={{fontSize:12,color:T.sub}}>Best: {top.name} ({top.pts} pts)</div>}
                  {(g.bonuses||[]).length>0&&(
                    <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                      {g.bonuses.map(b=>(<span key={b.id} style={{fontSize:11,background:T.tealPale,color:T.tealDark,borderRadius:20,padding:"2px 8px",fontWeight:600}}>{b.type==="ntp"?"📍":"💥"} {b.playerName}</span>))}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,marginLeft:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.teal,letterSpacing:2}}>{g.code}</div>
                  <Btn label="View" onClick={()=>onReopen(g)} sm outline/>
                </div>
              </div>
            </Crd>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab,     setTab]     = useState("courses");
  const [course,  setCourse]  = useState(null);
  const [game,    setGame]    = useState(null);
  const [history, setHistory] = useState([]);

  function handleSetGame(g) {
    if(g===null && game) {
      setHistory(h=>{
        const exists = h.find(x=>x.id===game.id);
        return exists ? h.map(x=>x.id===game.id?game:x) : [...h,game];
      });
    }
    setGame(g);
  }

  function reopenGame(g) { setGame(g); setTab("board"); }

  // Keep history in sync with live score changes
  useEffect(()=>{
    if(!game) return;
    setHistory(h=>{
      const exists = h.find(x=>x.id===game.id);
      return exists ? h.map(x=>x.id===game.id?game:x) : h;
    });
  },[game]);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",maxWidth:480,margin:"0 auto",fontFamily:"'DM Sans',sans-serif",background:T.bg,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}button:focus{outline:none;}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;}
        input,select{outline:none;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px;}
        @keyframes spin{to{transform:rotate(360deg);}}
        .leaflet-container{font-family:'DM Sans',sans-serif!important;}
      `}</style>

      {/* Top bar */}
      <div style={{background:T.teal,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:8,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,color:T.teal}}>W</div>
          <span style={{fontWeight:700,fontSize:20,color:"#fff",letterSpacing:0.5}}>Wackers</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {course&&<div style={{fontSize:11,color:"rgba(255,255,255,0.75)",fontWeight:500}}>{course.name}</div>}
          {game&&<div style={{background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"3px 10px",fontSize:14,fontWeight:700,color:"#fff",letterSpacing:2}}>{game.code}</div>}
        </div>
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {tab==="courses" && <CoursesTab  course={course} setCourse={setCourse}/>}
        {tab==="map"     && <MapTab       course={course}/>}
        {tab==="setup"   && <SetupTab    game={game} setGame={handleSetGame} course={course} setTab={setTab}/>}
        {tab==="cards"   && <ScorecardTab game={game} setGame={setGame}/>}
        {tab==="board"   && <LeaderboardTab game={game} setGame={setGame}/>}
        {tab==="history" && <HistoryTab  history={history} onReopen={reopenGame}/>}
      </div>

      <Nav tab={tab} setTab={setTab}/>
    </div>
  );
}
