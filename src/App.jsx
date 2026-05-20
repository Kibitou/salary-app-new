import { useState, useMemo } from "react";

const DARK = {
  bg0:"#020617", bg1:"#0f172a", bg2:"#1e293b", bg3:"#0a0f1e",
  border:"#1e293b", borderMid:"#334155",
  t0:"#f1f5f9", t1:"#cbd5e1", t2:"#64748b", t3:"#334155",
  green:"#4ade80", greenDim:"#052e16", greenBorder:"#166534", greenText:"#86efac",
  blue:"#60a5fa", purple:"#a78bfa", yellow:"#fbbf24", orange:"#fb923c",
  red:"#f87171", redDim:"#450a0a", redBorder:"#7f1d1d", redText:"#fca5a5",
  inBg:"#0f172a", inColor:"#f1f5f9",
  navBg:"#080e1d",
  segBg:"#0f172a", segBorder:"#1e293b", segText:"#475569",
  segABg:"#172554", segABorder:"#1d4ed8", segAText:"#93c5fd",
  calBg:"#1e293b", calBorder:"#0f172a",
  calTodayBg:"#172554", calTodayBorder:"#2563eb",
  calShiftBg:"#052e16", calShiftBorder:"#166534",
  modBg:"#1e293b",
  shadow:"0 0 0 1px #1e293b, 0 25px 60px rgba(0,0,0,.8)",
};
const LIGHT = {
  bg0:"#f0f4f8", bg1:"#ffffff", bg2:"#f8fafc", bg3:"#f1f5f9",
  border:"#e8edf2", borderMid:"#cbd5e1",
  t0:"#0f172a", t1:"#334155", t2:"#64748b", t3:"#94a3b8",
  green:"#16a34a", greenDim:"#f0fdf4", greenBorder:"#bbf7d0", greenText:"#15803d",
  blue:"#2563eb", purple:"#7c3aed", yellow:"#d97706", orange:"#ea580c",
  red:"#dc2626", redDim:"#fef2f2", redBorder:"#fecaca", redText:"#dc2626",
  inBg:"#f1f5f9", inColor:"#0f172a",
  navBg:"#ffffff",
  segBg:"#f1f5f9", segBorder:"#e2e8f0", segText:"#64748b",
  segABg:"#eff6ff", segABorder:"#bfdbfe", segAText:"#1d4ed8",
  calBg:"#f8fafc", calBorder:"#e8edf2",
  calTodayBg:"#eff6ff", calTodayBorder:"#93c5fd",
  calShiftBg:"#f0fdf4", calShiftBorder:"#86efac",
  modBg:"#ffffff",
  shadow:"0 0 0 1px #e2e8f0, 0 20px 50px rgba(0,0,0,.15)",
};

const NOW = new Date();
const fmtDate = (d) =>
  d.getFullYear() + "-" +
  String(d.getMonth() + 1).padStart(2, "0") + "-" +
  String(d.getDate()).padStart(2, "0");
const TODAY = fmtDate(NOW);
const DOW = ["日","月","火","水","木","金","土"];

const parseMin = (t) => { if (!t) return null; const [h,m]=t.split(":"); return +h*60 + +m; };
const roundM = (m,u,mode) => { if(!u||m<=0)return m; return mode==="up"?Math.ceil(m/u)*u:Math.floor(m/u)*u; };
const rawMins = (e) => { const s=parseMin(e.start),en=parseMin(e.end),b=parseMin(e.break)||0; if(s===null||en===null)return 0; return Math.max(en-s-b,0); };
const monthTotal = (entries,cfg) => {
  if(cfg.calcMode==="daily") return entries.reduce((s,e)=>s+roundM(rawMins(e),cfg.roundUnit,cfg.roundMode),0);
  return roundM(entries.reduce((s,e)=>s+rawMins(e),0),cfg.roundUnit,cfg.roundMode);
};
const commuteAmt = (days,cfg) => {
  const sorted=[...(cfg.passes||[])].sort((a,b)=>a.threshold-b.threshold);
  for(const p of sorted) if(days>=p.threshold)return p.amount;
  return days*(cfg.commuteDaily||0);
};
const payoffCalc = (bal,rate,mo) => {
  if(!bal||!mo)return null;
  if(!rate)return{months:Math.ceil(bal/mo),interest:0};
  const r=rate/100/12; let b=bal,months=0,interest=0;
  while(b>0&&months<600){const i=b*r;interest+=i;const p=mo-i;if(p<=0)return null;b-=p;months++;}
  return{months,interest};
};
const daysTo = (day) => {
  const now=new Date(), pay=new Date(now.getFullYear(),now.getMonth(),day);
  if(pay<=now)pay.setMonth(pay.getMonth()+1);
  return Math.ceil((pay-now)/86400000);
};
const yen  = (n) => "¥"+Math.floor(Math.max(n,0)).toLocaleString();
const yenS = (n) => n<0?"-¥"+Math.floor(Math.abs(n)).toLocaleString():"¥"+Math.floor(n).toLocaleString();
const hm   = (m) => !m?"0h00m":Math.floor(m/60)+"h"+String(m%60).padStart(2,"0")+"m";
const mDayKeys = (y,m) => { const last=new Date(y,m+1,0).getDate(), mk=y+"-"+String(m+1).padStart(2,"0"); return Array.from({length:last},(_,i)=>mk+"-"+String(i+1).padStart(2,"0")); };
const calCells = (y,m) => { const out=[],sd=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate(); for(let i=0;i<sd;i++)out.push(null); for(let d=1;d<=last;d++)out.push(d); return out; };

const DEF_CFG = { wage:1100, roundUnit:15, roundMode:"down", calcMode:"daily", commuteDaily:0, passes:[], payday:25, taxRate:10, catTaxName:"税・社会保険", catOtherName:"その他支払い" };
const DEF_PRESETS = [
  {id:1,label:"早番",start:"08:00",end:"16:00",brk:"01:00"},
  {id:2,label:"日勤",start:"09:00",end:"18:00",brk:"01:00"},
  {id:3,label:"遅番",start:"13:00",end:"22:00",brk:"01:00"},
  {id:4,label:"夜勤",start:"22:00",end:"07:00",brk:"01:00"},
];

const css = {
  card:  (T,accent) => ({ background:T.bg2, border:"1px solid "+T.border, borderLeft:"3px solid "+accent, borderRadius:14, padding:"12px 14px", marginBottom:10 }),
  inp:   (T) => ({ width:"100%", boxSizing:"border-box", background:T.inBg, border:"1px solid "+T.borderMid, borderRadius:10, padding:"9px 12px", color:T.inColor, fontSize:14, outline:"none" }),
  seg:   (T,on) => ({ background:on?T.segABg:T.segBg, border:"1px solid "+(on?T.segABorder:T.segBorder), borderRadius:8, padding:"6px 12px", color:on?T.segAText:T.segText, fontSize:13, cursor:"pointer", fontWeight:on?700:400 }),
  btn:   () => ({ width:"100%", background:"linear-gradient(135deg,#4ade80,#22d3ee)", border:"none", borderRadius:12, padding:"13px", color:"#0f172a", fontWeight:800, fontSize:15, cursor:"pointer" }),
  rmBtn: (T) => ({ background:T.redDim, border:"1px solid "+T.redBorder, borderRadius:8, color:T.redText, width:30, height:30, cursor:"pointer", fontSize:12, fontWeight:700, flexShrink:0 }),
};

function Inp({ T, value, onChange, type="text", placeholder="" }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} style={css.inp(T)} />;
}
function NumInp({ T, value, onChange, placeholder="" }) {
  const [focused, setFocused] = useState(false);
  const [local, setLocal] = useState("");
  const show = focused ? local : (value === 0 || value === "" ? "" : String(value));
  return (
    <input type="number" inputMode="numeric" value={show} placeholder={placeholder || "0"}
      onFocus={() => { setFocused(true); setLocal(value === 0 ? "" : String(value)); }}
      onBlur={() => { setFocused(false); const n = Number(local); onChange(isNaN(n) ? 0 : n); }}
      onChange={e => setLocal(e.target.value)}
      style={{...css.inp(T), fontSize:16}}
    />
  );
}
function TimeBtn({ T, label, value, onChange, accent }) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
      <span style={{ fontSize:11, color:accent, fontWeight:700, textAlign:"center", letterSpacing:1 }}>{label}</span>
      <input type="time" value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", boxSizing:"border-box", background:T.inBg, border:"2px solid "+(value?accent:T.borderMid), borderRadius:12, padding:"12px 4px", color:T.inColor, fontSize:16, textAlign:"center", outline:"none", fontFamily:"monospace", fontWeight:700, touchAction:"manipulation" }} />
    </div>
  );
}
function SegRow({ T, opts, val, onChange }) {
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {opts.map(({v,l})=>(<button key={String(v)} onClick={
