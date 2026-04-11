import { useState, useEffect, useCallback, useRef } from “react”;

const SUBJECTS = [
{ id: “design”, name: “建築計畫與設計”, shortName: “計畫設計”, color: “#C8956C”, icon: “✏️”,
topics: [“設計問題釐清與界定”,“課題分析與構想”,“建築法規綜整”,“無障礙設施安全規範”,“人文及生態觀念”,“空間定性及定量”,“建築設計理論與方法”,“平面配置與空間組織”,“量體構造與交通動線”,“結構材料表現”] },
{ id: “urban”, name: “敷地計畫與都市設計”, shortName: “敷地申論”, color: “#6B8F71”, icon: “🏙️”,
topics: [“敷地調查理論與應用”,“都市設計相關理論”,“土地使用計畫”,“交通動線計畫”,“建築配置與景觀設施”,“都市計畫宗旨”,“都市更新理論及應用”,“景觀、保存維護”,“永續發展與民眾參與”,“設計審議相關”] },
{ id: “law”, name: “營建法規與實務”, shortName: “營建法規”, color: “#8B7355”, icon: “📋”,
topics: [“建築法及其子法”,“建築師法及其子法”,“建築技術規則”,“都市計畫法及其子法”,“都市更新條例及其子法”,“國土計畫法及區域計畫法”,“公寓大廈管理條例”,“營造業法及其子法”,“政府採購法、契約與規範”,“無障礙設施相關法規”] },
{ id: “structure”, name: “建築結構”, shortName: “建築結構”, color: “#7B8FA1”, icon: “🏗️”,
topics: [“建築結構系統觀念”,“梁、柱、牆、版、基礎”,“結構穩定性與靜不定”,“桁架與剛性構架”,“鋼骨、RC、木造、磚造”,“抗風結構與耐震結構”,“消能隔震技術”,“結構分析計算”,“RC結構設計”,“鋼結構設計”] },
{ id: “construction”, name: “建築構造與施工”, shortName: “構造施工”, color: “#A0826D”, icon: “🔨”,
topics: [“建築材料性能”,“綠建材特性”,“基礎構造”,“RC、S、SRC主要構造”,“屋頂與外牆構造”,“室內裝修構造”,“建築工法與防護措施”,“建築詳圖”,“施工規範與無障礙設計”,“永續、防災、生態性能”] },
{ id: “environment”, name: “建築環境控制”, shortName: “環境控制”, color: “#5B8A8B”, icon: “🌿”,
topics: [“建築熱環境”,“通風換氣環境”,“建築光環境”,“建築音環境”,“給排水衛生設備”,“消防設備系統”,“空調設備系統”,“建築輸送設備”,“電氣及照明設備”,“永續與智慧建築”] },
];

const BUILTIN_BOOKS = window.__BUILTIN_BOOKS || [];

function getDaysUntilExam(examDateStr) {
const exam = new Date(examDateStr || “2025-11-01”);
exam.setHours(0,0,0,0);
const now = new Date(); now.setHours(0,0,0,0);
const diff = exam - now;
return Math.max(0, Math.ceil(diff / (1000*60*60*24)));
}
function getTodayKey() { return new Date().toISOString().split(“T”)[0]; }
function defaultState() { return {topicProgress:{},studyLog:{},weeklyGoalHours:20,notes:{},bookProgress:{},examDate:“2025-11-01”,customBooks:[],drawingLog:{}}; }

function countBookDone(book, bookProgress) {
let done=0, total=0;
for(const ch of book.chapters) for(const sec of ch.sections) {
if(sec.subsections&&sec.subsections.length>0) { for(const sub of sec.subsections){total++;if(bookProgress[`${book.id}__${sub.id}`])done++;} }
else { total++;if(bookProgress[`${book.id}__${sec.id}`])done++; }
}
return {done,total};
}

export default function App() {
const [tab, setTab] = useState(“dashboard”);
const [data, setData] = useState(()=>defaultState());
const [dataLoaded, setDataLoaded] = useState(false);
const [selectedSubject, setSelectedSubject] = useState(null);
const [subTab, setSubTab] = useState(“topics”);
const [expandedChapters, setExpandedChapters] = useState({});
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const [logHours, setLogHours] = useState(””);
const [logSubject, setLogSubject] = useState(SUBJECTS[0].id);
const [noteText, setNoteText] = useState(””);
const [editingNote, setEditingNote] = useState(null);
const [editingExamDate, setEditingExamDate] = useState(false);
const [examDateInput, setExamDateInput] = useState(””);
// Book editor modal state
const [bookModal, setBookModal] = useState(null); // null | {mode:“add”|“edit”, book?:{…}}
const [bTitle, setBTitle] = useState(””);
const [bChapters, setBChapters] = useState([]); // [{title, sections:[{title, subsections:[{title}]}]}]
const [editingBookId, setEditingBookId] = useState(null);
// Drawing practice state
const [drawNote, setDrawNote] = useState(””);
const [drawImg, setDrawImg] = useState(null); // base64
const [drawMood, setDrawMood] = useState(3); // 1-5 satisfaction
const [drawViewDate, setDrawViewDate] = useState(null); // for lightbox
// ── Timer / Pomodoro state ──
const [timerMode, setTimerMode] = useState(“stopwatch”); // “stopwatch” | “pomodoro”
const [timerRunning, setTimerRunning] = useState(false);
const [timerSeconds, setTimerSeconds] = useState(0);       // stopwatch elapsed
const [pomodoroPhase, setPomodoroPhase] = useState(“work”); // “work”|“break”|“longbreak”
const [pomodoroCount, setPomodoroCount] = useState(0);      // completed pomodoros
const [pomodoroLeft, setPomodoroLeft] = useState(25*60);    // seconds remaining
const [pomodoroSubject, setPomodoroSubject] = useState(SUBJECTS[0].id);
const [showTimerSaveModal, setShowTimerSaveModal] = useState(false);
const [timerSaveSubject, setTimerSaveSubject] = useState(SUBJECTS[0].id);
const timerRef = useRef(null);
const sessionSecsRef = useRef(0); // seconds accumulated this session (stopwatch)

const examDate = data.examDate || “2025-11-01”;
const daysLeft = getDaysUntilExam(examDate);
const today = getTodayKey();
const _fbSaveTimer = useRef(null);
useEffect(()=>{
if(!dataLoaded) return;
clearTimeout(_fbSaveTimer.current);
_fbSaveTimer.current = setTimeout(()=>{ if(window.__fbSave) window.__fbSave(data); }, 800);
},[data, dataLoaded]);

useEffect(()=>{
if(window.__fbLoad){
window.__fbLoad().then(saved=>{ if(saved) setData(d=>({…defaultState(),…saved})); setDataLoaded(true); }).catch(()=>setDataLoaded(true));
} else { setDataLoaded(true); }
},[]);

// ── Timer effects ──
useEffect(()=>{
if(timerRunning){
timerRef.current = setInterval(()=>{
if(timerMode===“stopwatch”){
setTimerSeconds(s=>s+1);
sessionSecsRef.current += 1;
} else {
setPomodoroLeft(prev=>{
if(prev<=1){
// phase complete
clearInterval(timerRef.current);
setTimerRunning(false);
if(pomodoroPhase===“work”){
const newCount = pomodoroCount+1;
setPomodoroCount(newCount);
// auto-save pomodoro session
const hrs = 25/60;
setData(p=>{const tl=p.studyLog[today]||{};return{…p,studyLog:{…p.studyLog,[today]:{…tl,[pomodoroSubject]:(tl[pomodoroSubject]||0)+hrs}}};});
if(newCount%4===0){ setPomodoroPhase(“longbreak”); return 15*60; }
else { setPomodoroPhase(“break”); return 5*60; }
} else {
setPomodoroPhase(“work”); return 25*60;
}
}
return prev-1;
});
}
},1000);
} else {
clearInterval(timerRef.current);
}
return ()=>clearInterval(timerRef.current);
},[timerRunning, timerMode, pomodoroPhase, pomodoroCount, pomodoroSubject, today]);

const fmtTime = (secs) => {
const h=Math.floor(secs/3600), m=Math.floor((secs%3600)/60), s=secs%60;
if(h>0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};

const stopwatchStart = () => { setTimerRunning(true); };
const stopwatchPause = () => { setTimerRunning(false); };
const stopwatchStop = () => {
setTimerRunning(false);
if(sessionSecsRef.current>60){ setTimerSaveSubject(SUBJECTS[0].id); setShowTimerSaveModal(true); }
else { setTimerSeconds(0); sessionSecsRef.current=0; }
};
const saveTimerSession = () => {
const hrs = sessionSecsRef.current/3600;
setData(p=>{const tl=p.studyLog[today]||{};return{…p,studyLog:{…p.studyLog,[today]:{…tl,[timerSaveSubject]:(tl[timerSaveSubject]||0)+hrs}}};});
setTimerSeconds(0); sessionSecsRef.current=0; setShowTimerSaveModal(false);
};
const discardTimerSession = () => { setTimerSeconds(0); sessionSecsRef.current=0; setShowTimerSaveModal(false); };
const pomodoroReset = () => { setTimerRunning(false); setPomodoroLeft(25*60); setPomodoroPhase(“work”); };
const pomodoroSkip = () => {
setTimerRunning(false);
if(pomodoroPhase===“work”){ const nc=pomodoroCount+1; setPomodoroCount(nc); setPomodoroPhase(nc%4===0?“longbreak”:“break”); setPomodoroLeft(nc%4===0?15*60:5*60); }
else { setPomodoroPhase(“work”); setPomodoroLeft(25*60); }
};
const pomodoroSetDuration = (phase) => {
if(phase===“work”) return 25*60;
if(phase===“break”) return 5*60;
return 15*60;
};
const pomodoroProgress = 1 - pomodoroLeft / pomodoroSetDuration(pomodoroPhase);
const POMODORO_COLORS = {work:”#C8956C”, break:”#6B8F71”, longbreak:”#5B8A8B”};
const POMODORO_LABELS = {work:“專注時間”, break:“短休息”, longbreak:“長休息”};

const toggleTopic = useCallback((subjectId,topicIdx)=>{
setData(prev=>{ const key=`${subjectId}_${topicIdx}`; const cur=prev.topicProgress[key]||0; return{…prev,topicProgress:{…prev.topicProgress,[key]:cur===0?1:cur===1?2:0}}; });
},[]);

const toggleBookItem = useCallback((bookId,itemId)=>{
const key=`${bookId}__${itemId}`;
setData(prev=>({…prev,bookProgress:{…prev.bookProgress,[key]:!prev.bookProgress[key]}}));
},[]);

const toggleChapterAll = useCallback((book,chapter,allDone)=>{
setData(prev=>{
const bp={…prev.bookProgress};
for(const sec of chapter.sections){
if(sec.subsections&&sec.subsections.length>0){for(const sub of sec.subsections)bp[`${book.id}__${sub.id}`]=!allDone;}
else bp[`${book.id}__${sec.id}`]=!allDone;
}
return{…prev,bookProgress:bp};
});
},[]);

const addStudyLog = useCallback(()=>{
const h=parseFloat(logHours); if(!h||h<=0)return;
setData(prev=>{const tl=prev.studyLog[today]||{};return{…prev,studyLog:{…prev.studyLog,[today]:{…tl,[logSubject]:(tl[logSubject]||0)+h}}};});
setLogHours(””);
},[logHours,logSubject,today]);

const saveNote = useCallback((subjectId)=>{
if(!noteText.trim())return;
setData(prev=>{
const sn=prev.notes[subjectId]||[];
if(editingNote!==null){const u=[…sn];u[editingNote]={…u[editingNote],text:noteText,updated:new Date().toLocaleString(“zh-TW”)};return{…prev,notes:{…prev.notes,[subjectId]:u}};}
return{…prev,notes:{…prev.notes,[subjectId]:[…sn,{text:noteText,created:new Date().toLocaleString(“zh-TW”),updated:null}]}};
});
setNoteText(””);setEditingNote(null);
},[noteText,editingNote]);

const deleteNote = useCallback((subjectId,idx)=>{
setData(prev=>({…prev,notes:{…prev.notes,[subjectId]:(prev.notes[subjectId]||[]).filter((_,i)=>i!==idx)}}));
},[]);

const totalTopics=SUBJECTS.reduce((s,sub)=>s+sub.topics.length,0);
const masteredTopics=Object.values(data.topicProgress).filter(v=>v===2).length;
const reviewingTopics=Object.values(data.topicProgress).filter(v=>v===1).length;

const totalHoursThisWeek=(()=>{let t=0;const now=new Date();for(let i=0;i<7;i++){const d=new Date(now);d.setDate(d.getDate()-i);const k=d.toISOString().split(“T”)[0];const dl=data.studyLog[k]||{};t+=Object.values(dl).reduce((s,v)=>s+v,0);}return t;})();
const todayHours=(()=>{const dl=data.studyLog[today]||{};return Object.values(dl).reduce((s,v)=>s+v,0);})();

const getSubjectProgress=(subjectId)=>{
const sub=SUBJECTS.find(s=>s.id===subjectId); if(!sub)return{mastered:0,reviewing:0,total:0};
let mastered=0,reviewing=0;
sub.topics.forEach((_,i)=>{const v=data.topicProgress[`${subjectId}_${i}`]||0;if(v===2)mastered++;else if(v===1)reviewing++;});
return{mastered,reviewing,total:sub.topics.length};
};

const last7Days=Array.from({length:7},(_,i)=>{
const d=new Date();d.setDate(d.getDate()-(6-i));
const k=d.toISOString().split(“T”)[0];
const dl=data.studyLog[k]||{};const hrs=Object.values(dl).reduce((s,v)=>s+v,0);
return{key:k,hrs,label:d.toLocaleDateString(“zh-TW”,{weekday:“short”})};
});
const maxHrs=Math.max(…last7Days.map(d=>d.hrs),1);

const totalBookProgress=[…BUILTIN_BOOKS,…(data.customBooks||[])].reduce((acc,b)=>{const{done,total}=countBookDone(b,data.bookProgress);return{done:acc.done+done,total:acc.total+total};},{done:0,total:0});
const allBooks = […BUILTIN_BOOKS, …(data.customBooks||[])];
const subjectBooks=selectedSubject?allBooks.filter(b=>b.subjectId===selectedSubject):[];
const toggleChapter=(key)=>setExpandedChapters(prev=>({…prev,[key]:!prev[key]}));

// ── Custom Book helpers ──
const openAddBook = (subjectId) => {
setBTitle(””); setBChapters([]); setEditingBookId(null);
setBookModal({mode:“add”, subjectId});
};
const openEditBook = (book) => {
setBTitle(book.title);
// Convert stored chapters to editable format
const chaps = book.chapters.map(ch=>({
id: ch.id, title: ch.title,
sections: ch.sections.map(sec=>({
id: sec.id, title: sec.title,
subsections: (sec.subsections||[]).map(sub=>({id:sub.id, title:sub.title}))
}))
}));
setBChapters(chaps);
setEditingBookId(book.id);
setBookModal({mode:“edit”, subjectId: book.subjectId});
};
const closeBookModal = () => { setBookModal(null); setBTitle(””); setBChapters([]); setEditingBookId(null); };
const saveBook = () => {
if(!bTitle.trim() || bChapters.length===0) return;
const subjectId = bookModal.subjectId;
const makeId = (prefix) => prefix + “*” + Math.random().toString(36).slice(2,8);
const chapters = bChapters.map((ch,ci)=>({
id: ch.id || makeId(“ch”+ci),
title: ch.title,
sections: ch.sections.map((sec,si)=>({
id: sec.id || makeId(“s”+ci+si),
title: sec.title,
subsections: sec.subsections && sec.subsections.length>0
? sec.subsections.map((sub,ui)=>({id: sub.id || makeId(“u”+ci+si+ui), title: sub.title}))
: undefined
}))
}));
if(editingBookId) {
setData(prev=>({…prev, customBooks: prev.customBooks.map(b=> b.id===editingBookId ? {…b,title:bTitle,chapters} : b)}));
} else {
const newBook = { id: makeId(“book”), subjectId, title: bTitle, chapters, custom: true };
setData(prev=>({…prev, customBooks:[…prev.customBooks, newBook]}));
}
closeBookModal();
};
const deleteBook = (bookId) => {
if(!window.confirm(“確定要刪除這本書嗎？閱讀進度也會一併清除。”)) return;
setData(prev=>{
const bp = {…prev.bookProgress};
Object.keys(bp).forEach(k=>{ if(k.startsWith(bookId+”__”)) delete bp[k]; });
return {…prev, customBooks: prev.customBooks.filter(b=>b.id!==bookId), bookProgress:bp};
});
};
// Chapter editor helpers
const addChapter = () => setBChapters(prev=>[…prev,{title:””,sections:[]}]);
const updateChapterTitle = (ci,v) => setBChapters(prev=>prev.map((c,i)=>i===ci?{…c,title:v}:c));
const removeChapter = (ci) => setBChapters(prev=>prev.filter((*,i)=>i!==ci));
const addSection = (ci) => setBChapters(prev=>prev.map((c,i)=>i===ci?{…c,sections:[…c.sections,{title:””,subsections:[]}]}:c));
const updateSectionTitle = (ci,si,v) => setBChapters(prev=>prev.map((c,i)=>i===ci?{…c,sections:c.sections.map((s,j)=>j===si?{…s,title:v}:s)}:c));
const removeSection = (ci,si) => setBChapters(prev=>prev.map((c,i)=>i===ci?{…c,sections:c.sections.filter((*,j)=>j!==si)}:c));
const addSubsection = (ci,si) => setBChapters(prev=>prev.map((c,i)=>i===ci?{…c,sections:c.sections.map((s,j)=>j===si?{…s,subsections:[…(s.subsections||[]),{title:””}]}:s)}:c));
const updateSubsectionTitle = (ci,si,ui,v) => setBChapters(prev=>prev.map((c,i)=>i===ci?{…c,sections:c.sections.map((s,j)=>j===si?{…s,subsections:s.subsections.map((u,k)=>k===ui?{…u,title:v}:u)}:s)}:c));
const removeSubsection = (ci,si,ui) => setBChapters(prev=>prev.map((c,i)=>i===ci?{…c,sections:c.sections.map((s,j)=>j===si?{…s,subsections:s.subsections.filter((*,k)=>k!==ui)}:s)}:c));

// ── Drawing helpers ──
const drawingLog = data.drawingLog || {};
const todayDrawn = !!drawingLog[today];

// Streak calculation
const calcStreak = () => {
let streak = 0;
const d = new Date(); d.setHours(0,0,0,0);
while(true) {
const k = d.toISOString().split(“T”)[0];
if(drawingLog[k]) { streak++; d.setDate(d.getDate()-1); }
else break;
}
return streak;
};
const streak = calcStreak();
const longestStreak = (() => {
const keys = Object.keys(drawingLog).filter(k=>drawingLog[k]).sort();
if(!keys.length) return 0;
let max=1, cur=1;
for(let i=1;i<keys.length;i++){
const prev=new Date(keys[i-1]), curr=new Date(keys[i]);
const diff=(curr-prev)/(1000*60*60*24);
if(diff===1){cur++;max=Math.max(max,cur);}else cur=1;
}
return max;
})();
const totalDrawDays = Object.keys(drawingLog).filter(k=>drawingLog[k]).length;

// 12-week heatmap data
const heatmapWeeks = (() => {
const weeks = [];
const end = new Date(); end.setHours(0,0,0,0);
// go back to start of week (Mon)
const dayOfWeek = (end.getDay()+6)%7;
end.setDate(end.getDate() - dayOfWeek + 6); // last day of current week = Sun
for(let w=11;w>=0;w–){
const week=[];
for(let d=6;d>=0;d–){
const date=new Date(end); date.setDate(end.getDate()-(w*7+d));
const k=date.toISOString().split(“T”)[0];
const isFuture=date>new Date();
week.unshift({key:k, done:!!drawingLog[k], future:isFuture, date});
}
weeks.push(week);
}
return weeks;
})();

// Achievements
const ACHIEVEMENTS = [
{id:“first”,icon:“🌱”,label:“破冰”,desc:“第一次畫圖打卡”,cond:()=>totalDrawDays>=1},
{id:“week”,icon:“🔥”,label:“一週連續”,desc:“連續畫圖 7 天”,cond:()=>longestStreak>=7},
{id:“half_month”,icon:“⚡”,label:“半月不懈”,desc:“連續畫圖 15 天”,cond:()=>longestStreak>=15},
{id:“month”,icon:“🏆”,label:“一月達人”,desc:“連續畫圖 30 天”,cond:()=>longestStreak>=30},
{id:“fifty”,icon:“💎”,label:“五十天”,desc:“累計畫圖 50 天”,cond:()=>totalDrawDays>=50},
{id:“hundred”,icon:“👑”,label:“百日築夢”,desc:“累計畫圖 100 天”,cond:()=>totalDrawDays>=100},
];

const saveDrawing = () => {
if(!drawImg && !drawNote.trim()) return;
const entry = { note: drawNote.trim(), img: drawImg, mood: drawMood, time: new Date().toLocaleTimeString(“zh-TW”,{hour:“2-digit”,minute:“2-digit”}) };
setData(prev=>({…prev, drawingLog:{…prev.drawingLog,[today]:entry}}));
setDrawNote(””); setDrawImg(null); setDrawMood(3);
};

const handleImageUpload = (e) => {
const file = e.target.files[0]; if(!file) return;
const reader = new FileReader();
reader.onload = (ev) => setDrawImg(ev.target.result);
reader.readAsDataURL(file);
};

const MOOD_LABELS = [””,“😞 很差”,“😕 普通”,“😐 還行”,“😊 不錯”,“🤩 超棒”];
const STREAK_MESSAGES = [
“今天要開始畫圖了！每天一張圖，累積就是實力。”,
“好的開始！保持下去，習慣從第一天開始。”,
“連續 2 天！動力已經啟動 🚀”,
“第 3 天！研究顯示習慣需要 21 天，你已跨出關鍵第一步。”,
“4 天連續！你的大腦正在建立畫圖迴路 🧠”,
“第 5 天！距離一週目標只剩 2 天！”,
“第 6 天！明天就是一週連續，加油！”,
“🔥 整整一週！你已突破「瓶頸期」，繼續保持！”,
];
const streakMsg = streak === 0 ? STREAK_MESSAGES[0] : STREAK_MESSAGES[Math.min(streak, STREAK_MESSAGES.length-1)];

return (
<div style={s.root}>
<header style={s.header}>
<div style={s.headerInner}>
<div style={s.headerLeft}>
<span style={s.logoMark}>建</span>
<div>
<div style={s.headerTitle}>建築師考試備考計畫</div>
<div style={s.headerSub}>專門職業及技術人員高等考試</div>
</div>
</div>
<div style={s.countdown} onClick={()=>{setExamDateInput(examDate);setEditingExamDate(true);}} title=“點擊修改考試日期”>
{editingExamDate?(
<div style={{display:“flex”,flexDirection:“column”,alignItems:“center”,gap:6}} onClick={e=>e.stopPropagation()}>
<input type=“date” value={examDateInput} onChange={e=>setExamDateInput(e.target.value)}
style={{fontSize:13,border:“1px solid #C8956C”,borderRadius:6,padding:“3px 6px”,background:”#1a1a1a”,color:”#F9F7F4”,outline:“none”,fontFamily:“inherit”}}/>
<div style={{display:“flex”,gap:6}}>
<button onClick={()=>{if(examDateInput)setData(p=>({…p,examDate:examDateInput}));setEditingExamDate(false);}}
style={{fontSize:11,background:”#C8956C”,color:”#fff”,border:“none”,borderRadius:5,padding:“3px 10px”,cursor:“pointer”,fontFamily:“inherit”}}>確認</button>
<button onClick={()=>setEditingExamDate(false)}
style={{fontSize:11,background:“transparent”,color:”#aaa”,border:“1px solid #555”,borderRadius:5,padding:“3px 8px”,cursor:“pointer”,fontFamily:“inherit”}}>取消</button>
</div>
</div>
):(
<>
<span style={s.countdownNum}>{daysLeft}</span>
<span style={s.countdownLabel}>天後考試</span>
<span style={{fontSize:10,color:”#C8956C88”,marginTop:2}}>{examDate} ✎</span>
</>
)}
</div>
</div>
<nav style={s.nav}>
{[{id:“dashboard”,label:“總覽”},{id:“subjects”,label:“科目進度”},{id:“drawing”,label:“✏️ 畫圖練習”},{id:“log”,label:“讀書記錄”},{id:“notes”,label:“筆記”}].map(t=>(
<button key={t.id} onClick={()=>setTab(t.id)} style={{…s.navBtn,…(tab===t.id?s.navBtnActive:{})}}>{t.label}</button>
))}
</nav>
</header>

```
  <main style={s.main}>

    {/* DASHBOARD */}
    {tab==="dashboard"&&(
      <div>
        <div style={s.statsRow}>
          <StatCard label="主題進度" value={`${Math.round(((masteredTopics+reviewingTopics*0.5)/totalTopics)*100)}%`} sub={`精熟${masteredTopics}／複習${reviewingTopics}／共${totalTopics}`} accent="#C8956C" onClick={()=>setTab("subjects")}/>
          <StatCard label="✏️ 畫圖連續" value={`${streak}天`} sub={`累計${totalDrawDays}天｜最長${longestStreak}天`} accent="#6B8F71" badge={todayDrawn?"✓":""} onClick={()=>setTab("drawing")}/>
          <StatCard label="本週學習" value={`${totalHoursThisWeek.toFixed(1)}h`} sub={`目標${data.weeklyGoalHours}h｜差${Math.max(0,data.weeklyGoalHours-totalHoursThisWeek).toFixed(1)}h`} accent="#A0826D" onClick={()=>setTab("log")}/>
          <StatCard label="剩餘時間" value={`${daysLeft}天`} sub={`約${Math.round(daysLeft/7*data.weeklyGoalHours)}小時可用`} accent="#7B8FA1"/>
        </div>
        <div style={s.goalRow}>
          <span style={s.goalLabel}>每週學習目標：</span>
          <input type="number" value={data.weeklyGoalHours} min={1} max={80} onChange={e=>setData(p=>({...p,weeklyGoalHours:parseInt(e.target.value)||20}))} style={s.goalInput}/>
          <span style={s.goalLabel}>小時</span>
        </div>
        {/* ── Timer / Pomodoro Widget ── */}
        <div style={s.timerCard}>
          {/* Mode tabs */}
          <div style={s.timerModeTabs}>
            <button style={{...s.timerModeBtn,...(timerMode==="stopwatch"?s.timerModeBtnActive:{})}} onClick={()=>{setTimerRunning(false);setTimerMode("stopwatch");}}>⏱ 計時器</button>
            <button style={{...s.timerModeBtn,...(timerMode==="pomodoro"?{...s.timerModeBtnActive,color:"#C8956C",borderColor:"#C8956C"}:{})}} onClick={()=>{setTimerRunning(false);setTimerMode("pomodoro");}}>🍅 番茄鐘</button>
          </div>

          {timerMode==="stopwatch"&&(
            <div style={s.timerBody}>
              <div style={s.timerDisplay}>{fmtTime(timerSeconds)}</div>
              <div style={{fontSize:12,color:"#aaa",marginBottom:20,textAlign:"center"}}>
                {timerRunning?"計時中…":timerSeconds>0?"已暫停":"準備開始"}
              </div>
              <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                {!timerRunning?(
                  <button style={s.timerBtn} onClick={stopwatchStart}>{timerSeconds>0?"▶ 繼續":"▶ 開始"}</button>
                ):(
                  <button style={{...s.timerBtn,background:"#8B7355"}} onClick={stopwatchPause}>⏸ 暫停</button>
                )}
                {timerSeconds>0&&<button style={{...s.timerBtn,background:"#aaa"}} onClick={stopwatchStop}>⏹ 結束並儲存</button>}
              </div>
              {timerSeconds>0&&(
                <div style={{marginTop:14,fontSize:12,color:"#aaa",textAlign:"center"}}>
                  結束後可選擇歸屬科目自動記錄至讀書日誌
                </div>
              )}
            </div>
          )}

          {timerMode==="pomodoro"&&(
            <div style={s.timerBody}>
              {/* Phase indicator */}
              <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:16}}>
                {["work","break","longbreak"].map(ph=>(
                  <div key={ph} style={{fontSize:11,padding:"3px 10px",borderRadius:12,background:pomodoroPhase===ph?POMODORO_COLORS[ph]+"22":"#f0f0f0",color:pomodoroPhase===ph?POMODORO_COLORS[ph]:"#aaa",fontWeight:pomodoroPhase===ph?700:400,border:`1px solid ${pomodoroPhase===ph?POMODORO_COLORS[ph]+"44":"#eee"}`}}>
                    {POMODORO_LABELS[ph]}
                  </div>
                ))}
              </div>

              {/* SVG ring timer */}
              <div style={{position:"relative",width:180,height:180,margin:"0 auto 16px"}}>
                <svg width="180" height="180" style={{transform:"rotate(-90deg)"}}>
                  <circle cx="90" cy="90" r="80" fill="none" stroke="#f0f0f0" strokeWidth="10"/>
                  <circle cx="90" cy="90" r="80" fill="none" stroke={POMODORO_COLORS[pomodoroPhase]} strokeWidth="10"
                    strokeDasharray={`${2*Math.PI*80}`}
                    strokeDashoffset={`${2*Math.PI*80*(1-pomodoroProgress)}`}
                    strokeLinecap="round" style={{transition:"stroke-dashoffset 1s linear"}}/>
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:36,fontWeight:900,color:POMODORO_COLORS[pomodoroPhase],fontFamily:"Georgia,serif",letterSpacing:2}}>{fmtTime(pomodoroLeft)}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{POMODORO_LABELS[pomodoroPhase]}</div>
                </div>
              </div>

              {/* Pomodoro dots */}
              <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:16}}>
                {[0,1,2,3].map(i=>(
                  <div key={i} style={{width:10,height:10,borderRadius:"50%",background:i<(pomodoroCount%4)?"#C8956C":"#eee",transition:"background .3s"}}/>
                ))}
                <span style={{fontSize:11,color:"#aaa",marginLeft:4}}>×{Math.floor(pomodoroCount/4)+1} 輪</span>
              </div>

              {/* Subject selector for work phase */}
              {pomodoroPhase==="work"&&(
                <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center",marginBottom:14}}>
                  <span style={{fontSize:12,color:"#888"}}>科目</span>
                  <select value={pomodoroSubject} onChange={e=>setPomodoroSubject(e.target.value)} style={{...s.select,fontSize:12,padding:"4px 8px"}}>
                    {SUBJECTS.map(sub=><option key={sub.id} value={sub.id}>{sub.icon} {sub.shortName}</option>)}
                  </select>
                </div>
              )}

              <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                <button style={{...s.timerBtn,background:POMODORO_COLORS[pomodoroPhase]}} onClick={()=>setTimerRunning(r=>!r)}>
                  {timerRunning?"⏸ 暫停":"▶ 開始"}
                </button>
                <button style={{...s.timerBtn,background:"#aaa",padding:"10px 14px"}} onClick={pomodoroSkip} title="跳過此階段">⏭</button>
                <button style={{...s.timerBtn,background:"#ddd",color:"#888",padding:"10px 14px"}} onClick={pomodoroReset} title="重置">↺</button>
              </div>

              <div style={{marginTop:12,fontSize:11,color:"#aaa",textAlign:"center"}}>
                完成專注番茄後自動記錄 25 分鐘至讀書日誌｜累計 {pomodoroCount} 個番茄 🍅
              </div>
            </div>
          )}
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>近 7 日學習時數</div>
          <div style={s.barChart}>
            {last7Days.map(d=>(
              <div key={d.key} style={s.barCol}>
                <div style={s.barHrs}>{d.hrs>0?d.hrs.toFixed(1):""}</div>
                <div style={s.barTrack}><div style={{...s.barFill,height:`${(d.hrs/maxHrs)*100}%`,background:d.key===today?"#C8956C":"#6B8F71"}}/></div>
                <div style={s.barLabel}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>六科準備進度</div>
          <div style={s.subjectGrid}>
            {SUBJECTS.map(sub=>{
              const prog=getSubjectProgress(sub.id);
              const pct=Math.round(((prog.mastered+prog.reviewing*0.5)/prog.total)*100);
              const books=[...BUILTIN_BOOKS,...(data.customBooks||[])].filter(b=>b.subjectId===sub.id);
              const bp=books.reduce((acc,b)=>{const{done,total}=countBookDone(b,data.bookProgress);return{done:acc.done+done,total:acc.total+total};},{done:0,total:0});
              return (
                <div key={sub.id} style={s.subjectCard} onClick={()=>{setSelectedSubject(sub.id);setTab("subjects");setSubTab("topics");}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:20}}>{sub.icon}</span>
                    <span style={{...s.subjectName,color:sub.color}}>{sub.shortName}</span>
                    <span style={{marginLeft:"auto",fontWeight:700,color:sub.color}}>{pct}%</span>
                  </div>
                  <div style={s.progressTrack}><div style={{...s.progressFill,width:`${pct}%`,background:sub.color}}/></div>
                  <div style={s.progressLegend}>
                    <span>精熟{prog.mastered}</span><span>複習{prog.reviewing}</span>
                    {bp.total>0&&<span style={{color:sub.color}}>📖{bp.done}/{bp.total}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}

    {/* SUBJECTS */}
    {tab==="subjects"&&(
      <div style={{display:"flex",gap:0,alignItems:"flex-start"}}>
        {/* Collapsible sidebar */}
        <div style={{...s.sidebarWrapper,width:sidebarCollapsed?48:172,minWidth:sidebarCollapsed?48:172,transition:"width .25s,min-width .25s"}}>
          <button style={s.collapseBtn} onClick={()=>setSidebarCollapsed(v=>!v)} title={sidebarCollapsed?"展開側欄":"收折側欄"}>
            <span style={{transition:"transform .25s",display:"block",transform:sidebarCollapsed?"rotate(180deg)":"rotate(0deg)",fontSize:16,lineHeight:1}}>‹</span>
          </button>
          {sidebarCollapsed
            ?SUBJECTS.map(sub=>(
              <button key={sub.id} title={sub.shortName}
                style={{...s.sidebarIconBtn,...(selectedSubject===sub.id?{background:sub.color+"18",borderColor:sub.color}:{})}}
                onClick={()=>{setSelectedSubject(sub.id);setSubTab("topics");setSidebarCollapsed(false);}}>
                <span style={{fontSize:18}}>{sub.icon}</span>
              </button>
            ))
            :SUBJECTS.map(sub=>{
              const prog=getSubjectProgress(sub.id);
              const pct=Math.round(((prog.mastered+prog.reviewing*0.5)/prog.total)*100);
              const bookCount=[...BUILTIN_BOOKS,...(data.customBooks||[])].filter(b=>b.subjectId===sub.id).length;
              return (
                <button key={sub.id} style={{...s.sidebarBtn,...(selectedSubject===sub.id?{...s.sidebarBtnActive,borderColor:sub.color,color:sub.color}:{})}}
                  onClick={()=>{setSelectedSubject(sub.id);setSubTab("topics");}}>
                  <span style={{fontSize:16}}>{sub.icon}</span>
                  <div style={{flex:1,textAlign:"left"}}>
                    <div style={{fontSize:13,fontWeight:600}}>{sub.shortName}</div>
                    <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{pct}%｜{bookCount}本書</div>
                  </div>
                </button>
              );
            })
          }
        </div>

        <div style={{flex:1,minWidth:0,marginLeft:12,overflow:"auto"}}>
          {!selectedSubject?(<div style={s.placeholder}>← 請選擇科目</div>):(()=>{
            const sub=SUBJECTS.find(s=>s.id===selectedSubject);
            const prog=getSubjectProgress(sub.id);
            return (
              <div>
                <div style={s.subTabBar}>
                  <button style={{...s.subTabBtn,...(subTab==="topics"?{...s.subTabBtnActive,borderColor:sub.color,color:sub.color}:{})}} onClick={()=>setSubTab("topics")}>
                    📋 命題大綱主題
                  </button>
                  <button style={{...s.subTabBtn,...(subTab==="books"?{...s.subTabBtnActive,borderColor:sub.color,color:sub.color}:{})}} onClick={()=>setSubTab("books")}>
                    📚 書籍閱讀進度
                    {subjectBooks.length>0&&<span style={{...s.bookBadge,background:sub.color+"22",color:sub.color}}>{subjectBooks.length}</span>}
                  </button>
                </div>

                {subTab==="topics"&&(
                  <div style={s.card}>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                      <span style={{fontSize:24}}>{sub.icon}</span>
                      <div>
                        <div style={{...s.cardTitle,margin:0,color:sub.color}}>{sub.name}</div>
                        <div style={{fontSize:13,color:"#888",marginTop:3}}>精熟{prog.mastered}／複習{prog.reviewing}／未讀{prog.total-prog.mastered-prog.reviewing}</div>
                      </div>
                    </div>
                    <div style={s.legend}><LegendItem color="#ddd" label="未讀"/><LegendItem color="#F0C070" label="複習中"/><LegendItem color={sub.color} label="已精熟"/></div>
                    <div style={s.topicList}>
                      {sub.topics.map((topic,i)=>{
                        const v=data.topicProgress[`${sub.id}_${i}`]||0;
                        return (
                          <button key={i} style={{...s.topicBtn,background:v===2?sub.color+"22":v===1?"#F0C07022":"#f8f8f8",borderColor:v===2?sub.color:v===1?"#F0C070":"#e8e8e8"}}
                            onClick={()=>toggleTopic(sub.id,i)}>
                            <span style={{...s.topicDot,background:v===2?sub.color:v===1?"#F0C070":"#ddd"}}/>
                            <span style={s.topicText}>{topic}</span>
                            <span style={s.topicStatus}>{v===0?"未讀":v===1?"複習中":"已精熟"}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{marginTop:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                      <div style={{fontSize:12,color:"#aaa"}}>點擊主題切換狀態：未讀 → 複習中 → 已精熟</div>
                      <button style={{fontSize:12,background:sub.color+"18",color:sub.color,border:"1px solid "+sub.color+"44",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}
                        onClick={()=>setSubTab("books")}>
                        📚 管理書籍閱讀進度
                      </button>
                    </div>
                  </div>
                )}

                {subTab==="books"&&(
                  <div>
                    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
                      <button style={{...s.addBtn,display:"flex",alignItems:"center",gap:6,fontSize:13}} onClick={()=>openAddBook(sub.id)}>
                        ＋ 新增書籍
                      </button>
                    </div>
                    {subjectBooks.length===0?(
                      <div style={{...s.card,textAlign:"center",padding:40,color:"#bbb"}}>
                        <div style={{fontSize:32,marginBottom:8}}>📚</div>
                        <div style={{fontSize:14}}>尚未新增書籍</div>
                        <div style={{fontSize:12,marginTop:4}}>點擊上方「新增書籍」開始建立閱讀清單</div>
                      </div>
                    ):subjectBooks.map(book=>{
                      const{done,total}=countBookDone(book,data.bookProgress);
                      const pct=total>0?Math.round(done/total*100):0;
                      return (
                        <div key={book.id} style={s.card}>
                          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14,paddingBottom:14,borderBottom:"1px solid #f0f0f0"}}>
                            <div style={{...s.bookIconBox,background:sub.color+"18",color:sub.color}}>📖</div>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:800,fontSize:16,color:"#2C2C2C"}}>{book.title}
                                {book.custom&&<span style={{fontSize:10,marginLeft:6,padding:"1px 6px",borderRadius:10,background:sub.color+"22",color:sub.color,fontWeight:600}}>自訂</span>}
                              </div>
                              <div style={{fontSize:12,color:"#999",marginTop:3}}>共{book.chapters.length}章 ／ {total}節</div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{textAlign:"right",marginRight:8}}>
                                <div style={{fontSize:26,fontWeight:900,color:sub.color,lineHeight:1}}>{pct}%</div>
                                <div style={{fontSize:11,color:"#aaa"}}>{done}/{total}節已讀</div>
                              </div>
                              {book.custom&&(<>
                                <button style={s.iconBtn} title="編輯書籍" onClick={()=>openEditBook(book)}>✎</button>
                                <button style={{...s.iconBtn,color:"#e57373"}} title="刪除書籍" onClick={()=>deleteBook(book.id)}>✕</button>
                              </>)}
                            </div>
                          </div>
                          <div style={s.progressTrack}><div style={{...s.progressFill,width:`${pct}%`,background:sub.color,transition:"width .4s"}}/></div>

                          <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:6}}>
                            {book.chapters.map(ch=>{
                              const chKey=`${book.id}__${ch.id}`;
                              const isOpen=expandedChapters[chKey];
                              let chDone=0,chTotal=0;
                              for(const sec of ch.sections){
                                if(sec.subsections&&sec.subsections.length>0){for(const sub2 of sec.subsections){chTotal++;if(data.bookProgress[`${book.id}__${sub2.id}`])chDone++;}}
                                else{chTotal++;if(data.bookProgress[`${book.id}__${sec.id}`])chDone++;}
                              }
                              const chPct=chTotal>0?Math.round(chDone/chTotal*100):0;
                              const allDone=chDone===chTotal&&chTotal>0;
                              return (
                                <div key={ch.id} style={s.chapterBlock}>
                                  <div style={s.chapterHeader}>
                                    <button style={s.expandBtn} onClick={()=>toggleChapter(chKey)}>
                                      <span style={{...s.expandArrow,transform:isOpen?"rotate(90deg)":"rotate(0deg)"}}>▶</span>
                                    </button>
                                    <div style={{flex:1,cursor:"pointer"}} onClick={()=>toggleChapter(chKey)}>
                                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                                        <span style={{fontSize:13,fontWeight:700,color:allDone?sub.color:"#444"}}>{ch.title}</span>
                                        <span style={{fontSize:11,color:allDone?sub.color:"#bbb"}}>{chDone}/{chTotal}</span>
                                      </div>
                                      <div style={{...s.miniTrack,marginTop:4}}>
                                        <div style={{...s.miniFill,width:`${chPct}%`,background:allDone?sub.color:"#c8c0b8"}}/>
                                      </div>
                                    </div>
                                    <button style={{...s.chapterAllBtn,borderColor:sub.color+"44",color:allDone?sub.color:"#aaa",background:allDone?sub.color+"15":"transparent"}}
                                      onClick={()=>toggleChapterAll(book,ch,allDone)}>
                                      {allDone?"✓ 完成":"全選"}
                                    </button>
                                  </div>

                                  {isOpen&&(
                                    <div style={s.sectionList}>
                                      {ch.sections.map(sec=>{
                                        if(sec.subsections&&sec.subsections.length>0){
                                          const secDone=sec.subsections.filter(sub2=>data.bookProgress[`${book.id}__${sub2.id}`]).length;
                                          return (
                                            <div key={sec.id} style={s.sectionGroup}>
                                              <div style={s.sectionTitle}>
                                                <span style={{fontSize:12,fontWeight:600,color:"#666"}}>{sec.title}</span>
                                                <span style={{fontSize:11,color:"#ccc",marginLeft:6}}>{secDone}/{sec.subsections.length}</span>
                                              </div>
                                              {sec.subsections.map(sub2=>{
                                                const done2=data.bookProgress[`${book.id}__${sub2.id}`];
                                                return (
                                                  <button key={sub2.id} style={{...s.leafBtn,background:done2?sub.color+"12":"#fafafa",borderColor:done2?sub.color+"55":"#eee"}}
                                                    onClick={()=>toggleBookItem(book.id,sub2.id)}>
                                                    <span style={{...s.leafCheck,background:done2?sub.color:"#e0e0e0"}}>{done2?"✓":""}</span>
                                                    <span style={{fontSize:13,color:done2?sub.color:"#555",textDecoration:done2?"line-through":"none",flex:1,textAlign:"left"}}>{sub2.title}</span>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          );
                                        } else {
                                          const done2=data.bookProgress[`${book.id}__${sec.id}`];
                                          return (
                                            <button key={sec.id} style={{...s.leafBtn,background:done2?sub.color+"12":"#fafafa",borderColor:done2?sub.color+"55":"#eee"}}
                                              onClick={()=>toggleBookItem(book.id,sec.id)}>
                                              <span style={{...s.leafCheck,background:done2?sub.color:"#e0e0e0"}}>{done2?"✓":""}</span>
                                              <span style={{fontSize:13,color:done2?sub.color:"#555",textDecoration:done2?"line-through":"none",flex:1,textAlign:"left"}}>{sec.title}</span>
                                            </button>
                                          );
                                        }
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    )}


    {/* DRAWING PRACTICE */}
    {tab==="drawing"&&(
      <div>
        {/* Streak Banner */}
        <div style={{...s.streakBanner,background:streak>=7?"linear-gradient(135deg,#e8622a,#c8956c)":streak>=3?"linear-gradient(135deg,#a0826d,#c8a882)":"linear-gradient(135deg,#6B8F71,#8aad8f)"}}>
          <div style={{display:"flex",alignItems:"center",gap:16,flex:1}}>
            <div style={{fontSize:48,lineHeight:1}}>{streak===0?"🎯":streak>=30?"👑":streak>=15?"🏆":streak>=7?"🔥":"✏️"}</div>
            <div>
              <div style={{fontSize:28,fontWeight:900,color:"#fff",lineHeight:1}}>{streak} <span style={{fontSize:16,fontWeight:600}}>天連續畫圖</span></div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",marginTop:4}}>{streakMsg}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:20,flexShrink:0}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:"#fff"}}>{totalDrawDays}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>累計天數</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:"#fff"}}>{longestStreak}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>最長連續</div>
            </div>
          </div>
        </div>

        {/* Today check-in */}
        <div style={s.card}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <div style={{...s.todayDot,background:todayDrawn?"#6B8F71":"#ddd"}}/>
            <div style={{...s.cardTitle,margin:0}}>{todayDrawn?"✅ 今天已打卡！":"今日畫圖打卡"}</div>
            {todayDrawn&&<span style={{fontSize:12,color:"#6B8F71",fontWeight:600,marginLeft:"auto"}}>繼續保持 💪</span>}
          </div>

          {todayDrawn?(
            <div>
              {drawingLog[today].img&&(
                <img src={drawingLog[today].img} alt="今日圖稿"
                  style={{width:"100%",maxHeight:300,objectFit:"contain",borderRadius:10,border:"1px solid #eee",cursor:"pointer",background:"#fafafa"}}
                  onClick={()=>setDrawViewDate(today)}/>
              )}
              <div style={{display:"flex",alignItems:"center",gap:10,marginTop:12,padding:12,background:"#f9f7f4",borderRadius:8}}>
                <span style={{fontSize:20}}>{MOOD_LABELS[drawingLog[today].mood||3].split(" ")[0]}</span>
                <div>
                  <div style={{fontSize:13,color:"#555"}}>{drawingLog[today].note||"（無備註）"}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>打卡時間 {drawingLog[today].time}</div>
                </div>
                <button style={{marginLeft:"auto",fontSize:12,background:"none",border:"1px solid #ddd",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#999",fontFamily:"inherit"}}
                  onClick={()=>setData(prev=>({...prev,drawingLog:{...prev.drawingLog,[today]:null}}))}>重新打卡</button>
              </div>
            </div>
          ):(
            <div>
              {/* Image upload */}
              <div style={s.uploadArea} onClick={()=>document.getElementById("draw-upload").click()}>
                {drawImg?(
                  <img src={drawImg} alt="預覽" style={{maxWidth:"100%",maxHeight:240,objectFit:"contain",borderRadius:8}}/>
                ):(
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:36,marginBottom:8}}>📷</div>
                    <div style={{fontSize:14,color:"#aaa"}}>點擊上傳今日圖稿</div>
                    <div style={{fontSize:12,color:"#ccc",marginTop:4}}>支援 JPG、PNG（照片或掃描稿均可）</div>
                  </div>
                )}
                <input id="draw-upload" type="file" accept="image/*" style={{display:"none"}} onChange={handleImageUpload}/>
              </div>

              {/* Mood rating */}
              <div style={{marginTop:14}}>
                <div style={{fontSize:13,fontWeight:600,color:"#666",marginBottom:8}}>今日滿意度</div>
                <div style={{display:"flex",gap:8}}>
                  {[1,2,3,4,5].map(m=>(
                    <button key={m} style={{flex:1,padding:"8px 4px",border:"2px solid",borderColor:drawMood===m?"#C8956C":"#eee",borderRadius:8,cursor:"pointer",background:drawMood===m?"#C8956C18":"#fff",fontSize:18,fontFamily:"inherit",transition:"all .15s"}}
                      onClick={()=>setDrawMood(m)}>
                      {MOOD_LABELS[m].split(" ")[0]}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:12,color:"#C8956C",textAlign:"center",marginTop:6,fontWeight:600}}>{MOOD_LABELS[drawMood]}</div>
              </div>

              {/* Note */}
              <textarea value={drawNote} onChange={e=>setDrawNote(e.target.value)}
                placeholder="今天畫了什麼？練習重點、遇到的問題、心得…"
                style={{...s.textarea,marginTop:12}} rows={3}/>

              <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center"}}>
                {drawImg&&<button style={{fontSize:12,color:"#aaa",background:"none",border:"1px solid #eee",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontFamily:"inherit"}} onClick={()=>setDrawImg(null)}>移除圖片</button>}
                <button style={{...s.addBtn,marginLeft:"auto",padding:"10px 28px",fontSize:15}} onClick={saveDrawing}>
                  ✓ 完成今日打卡
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 12-week heatmap */}
        <div style={s.card}>
          <div style={s.cardTitle}>12 週練習熱力圖</div>
          <div style={{display:"flex",gap:3,alignItems:"flex-start",overflowX:"auto",paddingBottom:4}}>
            <div style={{display:"flex",flexDirection:"column",gap:3,marginRight:2,paddingTop:20}}>
              {["一","二","三","四","五","六","日"].map(d=><div key={d} style={{height:16,fontSize:10,color:"#ccc",lineHeight:"16px",textAlign:"right",paddingRight:4}}>{d}</div>)}
            </div>
            {heatmapWeeks.map((week,wi)=>(
              <div key={wi} style={{display:"flex",flexDirection:"column",gap:3}}>
                <div style={{fontSize:9,color:"#ccc",textAlign:"center",height:16,lineHeight:"16px"}}>
                  {(wi===0||week[0].date.getMonth()!==heatmapWeeks[wi-1][0].date.getMonth())?week[0].date.getMonth()+1+"月":""}
                </div>
                {week.map((day,di)=>(
                  <div key={di} title={day.key+(day.done?" ✓ 已畫圖":"")}
                    style={{width:16,height:16,borderRadius:3,background:day.future?"transparent":day.done?"#6B8F71":day.key===today?"#C8956C33":"#eee",border:day.key===today?"2px solid #C8956C":"2px solid transparent",cursor:day.done?"pointer":"default",transition:"transform .1s"}}
                    onClick={()=>day.done&&setDrawViewDate(day.key)}/>
                ))}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:12,marginTop:8,fontSize:11,color:"#aaa",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:2,background:"#eee"}}/> 未畫</div>
            <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:2,background:"#6B8F71"}}/> 已畫</div>
            <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:2,border:"2px solid #C8956C"}}/> 今日</div>
          </div>
        </div>

        {/* Achievements */}
        <div style={s.card}>
          <div style={s.cardTitle}>成就徽章</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {ACHIEVEMENTS.map(a=>{
              const unlocked=a.cond();
              return (
                <div key={a.id} style={{...s.achieveCard,background:unlocked?"#faf7f4":"#fafafa",borderColor:unlocked?"#C8956C55":"#eee",opacity:unlocked?1:0.5}}>
                  <div style={{fontSize:28}}>{unlocked?a.icon:"🔒"}</div>
                  <div style={{fontSize:13,fontWeight:700,color:unlocked?"#C8956C":"#aaa"}}>{a.label}</div>
                  <div style={{fontSize:11,color:"#aaa",textAlign:"center",marginTop:2}}>{a.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent drawings gallery */}
        {Object.keys(drawingLog).filter(k=>drawingLog[k]).length>0&&(
          <div style={s.card}>
            <div style={s.cardTitle}>練習紀錄</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {Object.entries(drawingLog).filter(([,v])=>v).sort(([a],[b])=>b.localeCompare(a)).slice(0,20).map(([date,entry])=>(
                <div key={date} style={{display:"flex",gap:12,alignItems:"flex-start",padding:12,background:"#fafafa",borderRadius:10,border:"1px solid #eee"}}>
                  {entry.img?(
                    <img src={entry.img} alt="圖稿縮圖" style={{width:64,height:64,objectFit:"cover",borderRadius:8,flexShrink:0,cursor:"pointer",border:"1px solid #eee"}}
                      onClick={()=>setDrawViewDate(date)}/>
                  ):(
                    <div style={{width:64,height:64,borderRadius:8,background:"#eee",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>✏️</div>
                  )}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:700,color:"#555"}}>{date}</span>
                      <span style={{fontSize:16}}>{MOOD_LABELS[entry.mood||3].split(" ")[0]}</span>
                      {date===today&&<span style={{fontSize:11,background:"#C8956C22",color:"#C8956C",padding:"1px 7px",borderRadius:10,fontWeight:600}}>今天</span>}
                    </div>
                    <div style={{fontSize:13,color:"#777",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entry.note||"（無備註）"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox */}
        {drawViewDate&&drawingLog[drawViewDate]?.img&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:20}}
            onClick={()=>setDrawViewDate(null)}>
            <div style={{maxWidth:800,maxHeight:"90vh",display:"flex",flexDirection:"column",alignItems:"center",gap:12}} onClick={e=>e.stopPropagation()}>
              <img src={drawingLog[drawViewDate].img} alt="圖稿" style={{maxWidth:"100%",maxHeight:"75vh",objectFit:"contain",borderRadius:10}}/>
              <div style={{color:"#fff",fontSize:14,textAlign:"center"}}>
                <span style={{opacity:.7}}>{drawViewDate}</span>
                {drawingLog[drawViewDate].note&&<span style={{marginLeft:12}}>{drawingLog[drawViewDate].note}</span>}
              </div>
              <button style={{color:"#fff",background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontSize:14,fontFamily:"inherit"}} onClick={()=>setDrawViewDate(null)}>關閉</button>
            </div>
          </div>
        )}
      </div>
    )}

    {/* LOG */}
    {tab==="log"&&(
      <div>
        <div style={s.card}>
          <div style={s.cardTitle}>新增今日讀書記錄</div>
          <div style={s.logForm}>
            <select value={logSubject} onChange={e=>setLogSubject(e.target.value)} style={s.select}>
              {SUBJECTS.map(sub=><option key={sub.id} value={sub.id}>{sub.icon} {sub.shortName}</option>)}
            </select>
            <input type="number" placeholder="時數" min="0.5" step="0.5" value={logHours} onChange={e=>setLogHours(e.target.value)} style={s.hoursInput}/>
            <span style={{color:"#888",fontSize:14}}>小時</span>
            <button onClick={addStudyLog} style={s.addBtn}>記錄</button>
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>讀書日誌</div>
          {Object.keys(data.studyLog).length===0?(<div style={s.placeholder}>尚無記錄，開始記錄你的讀書時間吧！</div>):
            Object.entries(data.studyLog).sort(([a],[b])=>b.localeCompare(a)).slice(0,30).map(([date,dayLog])=>{
              const total=Object.values(dayLog).reduce((s,v)=>s+v,0);
              return (
                <div key={date} style={s.logDay}>
                  <div style={s.logDayHeader}><span style={s.logDate}>{date}</span><span style={s.logTotal}>{total.toFixed(1)} 小時</span></div>
                  <div style={s.logEntries}>
                    {Object.entries(dayLog).map(([subId,hrs])=>{const sub=SUBJECTS.find(s=>s.id===subId);return <span key={subId} style={{...s.logTag,background:sub?.color+"22",color:sub?.color,borderColor:sub?.color+"44"}}>{sub?.icon}{sub?.shortName} {hrs.toFixed(1)}h</span>;})}
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    )}

    {/* NOTES */}
    {tab==="notes"&&(
      <div style={{display:"flex",gap:16,overflow:"hidden"}}>
        <div style={s.sidebar}>
          {SUBJECTS.map(sub=>{
            const count=(data.notes[sub.id]||[]).length;
            return (
              <button key={sub.id} style={{...s.sidebarBtn,...(selectedSubject===sub.id?{...s.sidebarBtnActive,borderColor:sub.color,color:sub.color}:{})}}
                onClick={()=>{setSelectedSubject(sub.id);setNoteText("");setEditingNote(null);}}>
                <span style={{fontSize:16}}>{sub.icon}</span>
                <div style={{flex:1,textAlign:"left"}}>
                  <div style={{fontSize:13,fontWeight:600}}>{sub.shortName}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{count}則筆記</div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{flex:1}}>
          {!selectedSubject?(<div style={s.placeholder}>← 請選擇科目</div>):(()=>{
            const sub=SUBJECTS.find(s=>s.id===selectedSubject);
            const notes=data.notes[sub.id]||[];
            return (
              <div>
                <div style={s.card}>
                  <div style={{...s.cardTitle,color:sub.color}}>{sub.icon} {sub.name} 筆記</div>
                  <textarea placeholder="輸入重點筆記..." value={noteText} onChange={e=>setNoteText(e.target.value)} style={s.textarea} rows={4}/>
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <button onClick={()=>saveNote(sub.id)} style={{...s.addBtn,background:sub.color}}>{editingNote!==null?"更新筆記":"新增筆記"}</button>
                    {editingNote!==null&&<button onClick={()=>{setEditingNote(null);setNoteText("");}} style={s.cancelBtn}>取消</button>}
                  </div>
                </div>
                {notes.length===0?(<div style={s.placeholder}>尚無筆記，開始記錄重點吧！</div>):
                  notes.map((note,i)=>(
                    <div key={i} style={{...s.noteCard,borderLeftColor:sub.color}}>
                      <div style={s.noteText}>{note.text}</div>
                      <div style={s.noteMeta}>
                        <span>{note.updated?`更新於${note.updated}`:`建立於${note.created}`}</span>
                        <div style={{display:"flex",gap:8}}>
                          <button style={s.noteBtn} onClick={()=>{setNoteText(note.text);setEditingNote(i);window.scrollTo(0,0);}}>編輯</button>
                          <button style={{...s.noteBtn,color:"#e57373"}} onClick={()=>deleteNote(sub.id,i)}>刪除</button>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            );
          })()}
        </div>
      </div>
    )}
  </main>

  {/* ═══ TIMER SAVE MODAL ═══ */}
  {showTimerSaveModal&&(
    <div style={s.modalOverlay} onClick={discardTimerSession}>
      <div style={{...s.modalBox,maxWidth:380}} onClick={e=>e.stopPropagation()}>
        <div style={s.modalHeader}>
          <span style={{fontWeight:800,fontSize:16}}>儲存本次學習記錄</span>
          <button style={s.modalClose} onClick={discardTimerSession}>✕</button>
        </div>
        <div style={s.modalSection}>
          <div style={{fontSize:28,fontWeight:900,color:"#C8956C",textAlign:"center",marginBottom:8,fontFamily:"Georgia,serif"}}>{fmtTime(timerSeconds)}</div>
          <div style={{fontSize:13,color:"#888",textAlign:"center",marginBottom:16}}>本次計時 {(timerSeconds/3600).toFixed(2)} 小時</div>
          <label style={s.modalLabel}>歸屬科目</label>
          <select value={timerSaveSubject} onChange={e=>setTimerSaveSubject(e.target.value)} style={{...s.select,width:"100%",marginTop:6}}>
            {SUBJECTS.map(sub=><option key={sub.id} value={sub.id}>{sub.icon} {sub.shortName}</option>)}
          </select>
        </div>
        <div style={s.modalFooter}>
          <button style={s.cancelBtn} onClick={discardTimerSession}>捨棄</button>
          <button style={s.addBtn} onClick={saveTimerSession}>✓ 儲存至日誌</button>
        </div>
      </div>
    </div>
  )}

  {/* ═══ BOOK EDITOR MODAL ═══ */}
  {bookModal&&(
    <div style={s.modalOverlay} onClick={closeBookModal}>
      <div style={s.modalBox} onClick={e=>e.stopPropagation()}>
        <div style={s.modalHeader}>
          <span style={{fontWeight:800,fontSize:16}}>{bookModal.mode==="add"?"新增書籍":"編輯書籍"}</span>
          <button style={s.modalClose} onClick={closeBookModal}>✕</button>
        </div>

        {/* Book title */}
        <div style={s.modalSection}>
          <label style={s.modalLabel}>書名</label>
          <input value={bTitle} onChange={e=>setBTitle(e.target.value)} placeholder="例：營造法與施工（下）"
            style={s.modalInput}/>
        </div>

        {/* Chapters */}
        <div style={s.modalSection}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <label style={s.modalLabel}>章節目錄</label>
            <button style={s.smallBtn} onClick={addChapter}>＋ 新增章</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:420,overflowY:"auto",paddingRight:4}}>
            {bChapters.length===0&&(
              <div style={{textAlign:"center",color:"#ccc",fontSize:13,padding:"20px 0"}}>尚未新增章節，請點擊「＋ 新增章」</div>
            )}
            {bChapters.map((ch,ci)=>(
              <div key={ci} style={s.chapterEditorBlock}>
                {/* Chapter title row */}
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#888",flexShrink:0}}>第{ci+1}章</span>
                  <input value={ch.title} onChange={e=>updateChapterTitle(ci,e.target.value)} placeholder={`第${ci+1}章 章節名稱`}
                    style={{...s.modalInput,flex:1,fontSize:13,marginBottom:0}}/>
                  <button style={{...s.smallBtn,background:"#fee",color:"#e57373",border:"1px solid #fcc"}} onClick={()=>removeChapter(ci)}>✕</button>
                </div>
                {/* Sections */}
                <div style={{paddingLeft:16,display:"flex",flexDirection:"column",gap:6}}>
                  {ch.sections.map((sec,si)=>(
                    <div key={si} style={s.sectionEditorBlock}>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:11,color:"#aaa",flexShrink:0}}>§</span>
                        <input value={sec.title} onChange={e=>updateSectionTitle(ci,si,e.target.value)} placeholder="節標題"
                          style={{...s.modalInput,flex:1,fontSize:12,padding:"5px 8px",marginBottom:0}}/>
                        <button style={{...s.smallBtn,padding:"2px 7px",fontSize:11,background:"#f5f5f5",color:"#aaa",border:"1px solid #eee"}}
                          onClick={()=>addSubsection(ci,si)} title="新增小節">＋小節</button>
                        <button style={{...s.smallBtn,padding:"2px 7px",fontSize:11,background:"#fee",color:"#e57373",border:"1px solid #fcc"}}
                          onClick={()=>removeSection(ci,si)}>✕</button>
                      </div>
                      {/* Subsections */}
                      {sec.subsections&&sec.subsections.map((sub,ui)=>(
                        <div key={ui} style={{display:"flex",gap:6,alignItems:"center",paddingLeft:16,marginTop:3}}>
                          <span style={{fontSize:10,color:"#ccc",flexShrink:0}}>–</span>
                          <input value={sub.title} onChange={e=>updateSubsectionTitle(ci,si,ui,e.target.value)} placeholder="小節標題"
                            style={{...s.modalInput,flex:1,fontSize:11,padding:"4px 8px",marginBottom:0}}/>
                          <button style={{...s.smallBtn,padding:"2px 6px",fontSize:10,background:"#fee",color:"#e57373",border:"1px solid #fcc"}}
                            onClick={()=>removeSubsection(ci,si,ui)}>✕</button>
                        </div>
                      ))}
                    </div>
                  ))}
                  <button style={{...s.smallBtn,alignSelf:"flex-start",fontSize:11}} onClick={()=>addSection(ci)}>＋ 新增節</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={s.modalFooter}>
          <button style={s.cancelBtn} onClick={closeBookModal}>取消</button>
          <button style={{...s.addBtn,opacity:(!bTitle.trim()||bChapters.length===0)?0.5:1}}
            onClick={saveBook} disabled={!bTitle.trim()||bChapters.length===0}>
            {bookModal.mode==="add"?"建立書籍":"儲存變更"}
          </button>
        </div>
      </div>
    </div>
  )}
</div>
```

);
}

function StatCard({label,value,sub,accent,badge,onClick}) {
return (
<div style={{…s.statCard,borderTopColor:accent,cursor:onClick?“pointer”:“default”,position:“relative”}} onClick={onClick}>
{badge&&<div style={{position:“absolute”,top:8,right:10,fontSize:11,fontWeight:700,color:”#fff”,background:accent,borderRadius:10,padding:“1px 7px”}}>{badge}</div>}
<div style={{fontSize:26,fontWeight:800,color:accent,fontFamily:“Georgia,serif”}}>{value}</div>
<div style={{fontSize:13,fontWeight:600,color:”#555”,margin:“4px 0”}}>{label}</div>
<div style={{fontSize:11,color:”#aaa”}}>{sub}</div>
</div>
);
}
function LegendItem({color,label}) {
return <div style={{display:“flex”,alignItems:“center”,gap:6,fontSize:12,color:”#666”}}><div style={{width:12,height:12,borderRadius:3,background:color}}/>{label}</div>;
}

const s = {
root:{minHeight:“100vh”,background:”#F9F7F4”,fontFamily:”‘Noto Serif TC’,Georgia,serif”,color:”#2C2C2C”},
header:{background:”#2C2C2C”,color:”#F9F7F4”,boxShadow:“0 2px 12px rgba(0,0,0,.15)”},
headerInner:{display:“flex”,alignItems:“center”,justifyContent:“space-between”,padding:“16px 24px 8px”},
headerLeft:{display:“flex”,alignItems:“center”,gap:14},
logoMark:{width:44,height:44,background:”#C8956C”,color:”#fff”,display:“flex”,alignItems:“center”,justifyContent:“center”,fontSize:22,fontWeight:900,borderRadius:6,flexShrink:0},
headerTitle:{fontSize:18,fontWeight:800,letterSpacing:1},
headerSub:{fontSize:11,color:”#aaa”,marginTop:2,letterSpacing:1},
countdown:{display:“flex”,flexDirection:“column”,alignItems:“center”,background:“rgba(200,149,108,.15)”,border:“1px solid #C8956C44”,borderRadius:8,padding:“8px 18px”},
countdownNum:{fontSize:28,fontWeight:900,color:”#C8956C”,lineHeight:1},
countdownLabel:{fontSize:11,color:”#C8956C”,marginTop:2},
nav:{display:“flex”,padding:“0 24px”,gap:2,borderTop:“1px solid #3C3C3C”},
navBtn:{background:“none”,border:“none”,color:”#aaa”,padding:“10px 18px”,cursor:“pointer”,fontSize:14,fontFamily:”‘Noto Serif TC’,Georgia,serif”,borderBottom:“2px solid transparent”},
navBtnActive:{color:”#C8956C”,borderBottom:“2px solid #C8956C”},
main:{maxWidth:“100%”,margin:“0 auto”,padding:“24px 16px”,boxSizing:“border-box”},
statsRow:{display:“grid”,gridTemplateColumns:“repeat(4,1fr)”,gap:12,marginBottom:16},
statCard:{background:”#fff”,borderRadius:10,padding:16,borderTop:“3px solid #ccc”,boxShadow:“0 1px 6px rgba(0,0,0,.06)”},
goalRow:{display:“flex”,alignItems:“center”,gap:8,marginBottom:16,background:”#fff”,borderRadius:10,padding:“12px 16px”,boxShadow:“0 1px 6px rgba(0,0,0,.06)”},
goalLabel:{fontSize:14,color:”#555”},
goalInput:{width:64,border:“1px solid #ddd”,borderRadius:6,padding:“4px 8px”,fontSize:16,fontWeight:700,color:”#C8956C”,textAlign:“center”,outline:“none”,fontFamily:“inherit”},
card:{background:”#fff”,borderRadius:12,padding:20,marginBottom:16,boxShadow:“0 1px 8px rgba(0,0,0,.07)”},
cardTitle:{fontSize:16,fontWeight:800,color:”#2C2C2C”,marginBottom:16,letterSpacing:.5},
barChart:{display:“flex”,alignItems:“flex-end”,gap:8,height:120},
barCol:{flex:1,display:“flex”,flexDirection:“column”,alignItems:“center”,height:“100%”},
barHrs:{fontSize:10,color:”#888”,height:16,lineHeight:“16px”},
barTrack:{flex:1,width:“70%”,background:”#f0f0f0”,borderRadius:4,display:“flex”,flexDirection:“column”,justifyContent:“flex-end”,overflow:“hidden”},
barFill:{width:“100%”,borderRadius:“4px 4px 0 0”},
barLabel:{fontSize:11,color:”#888”,marginTop:4},
subjectGrid:{display:“grid”,gridTemplateColumns:“repeat(3,1fr)”,gap:12},
subjectCard:{border:“1px solid #eee”,borderRadius:10,padding:14,cursor:“pointer”,background:”#fafafa”},
subjectName:{fontSize:13,fontWeight:700},
progressTrack:{height:6,background:”#eee”,borderRadius:3,overflow:“hidden”,marginBottom:6},
progressFill:{height:“100%”,borderRadius:3},
progressLegend:{display:“flex”,justifyContent:“space-between”,fontSize:11,color:”#aaa”},
sidebar:{width:164,flexShrink:0,display:“flex”,flexDirection:“column”,gap:6},
sidebarWrapper:{flexShrink:0,display:“flex”,flexDirection:“column”,gap:6,overflow:“hidden”},
collapseBtn:{background:”#fff”,border:“1px solid #eee”,borderRadius:8,padding:“8px”,cursor:“pointer”,display:“flex”,alignItems:“center”,justifyContent:“center”,marginBottom:2,width:“100%”,color:”#888”,fontSize:16,fontFamily:“inherit”,flexShrink:0},
sidebarIconBtn:{background:”#fff”,border:“1px solid #eee”,borderRadius:8,padding:“8px”,cursor:“pointer”,display:“flex”,alignItems:“center”,justifyContent:“center”,width:“100%”,transition:“all .2s”},
sidebarBtn:{display:“flex”,alignItems:“center”,gap:8,background:”#fff”,border:“1px solid #eee”,borderRadius:8,padding:“10px”,cursor:“pointer”,color:”#555”,fontFamily:“inherit”},
sidebarBtnActive:{background:”#fafafa”,borderWidth:2},
placeholder:{color:”#bbb”,fontSize:14,textAlign:“center”,padding:40},
legend:{display:“flex”,gap:16,marginBottom:16},
topicList:{display:“flex”,flexDirection:“column”,gap:6},
topicBtn:{display:“flex”,alignItems:“center”,gap:10,padding:“10px 14px”,border:“1px solid”,borderRadius:8,cursor:“pointer”,textAlign:“left”,fontFamily:“inherit”},
topicDot:{width:10,height:10,borderRadius:“50%”,flexShrink:0},
topicText:{flex:1,fontSize:14,color:”#333”},
topicStatus:{fontSize:12,color:”#888”,flexShrink:0},
subTabBar:{display:“flex”,gap:8,marginBottom:14},
subTabBtn:{display:“flex”,alignItems:“center”,gap:6,background:”#fff”,border:“1px solid #ddd”,borderRadius:8,padding:“8px 16px”,cursor:“pointer”,fontSize:14,fontFamily:“inherit”,color:”#888”},
subTabBtnActive:{borderWidth:2,fontWeight:700},
bookBadge:{fontSize:11,fontWeight:700,padding:“1px 7px”,borderRadius:20,marginLeft:4},
bookIconBox:{width:40,height:40,borderRadius:8,display:“flex”,alignItems:“center”,justifyContent:“center”,fontSize:20,flexShrink:0},
miniTrack:{height:4,background:”#eee”,borderRadius:2,overflow:“hidden”},
miniFill:{height:“100%”,borderRadius:2,transition:“width .3s”},
chapterBlock:{border:“1px solid #eee”,borderRadius:10,overflow:“hidden”,marginBottom:2},
chapterHeader:{display:“flex”,alignItems:“center”,gap:8,padding:“10px 14px”,background:”#FAFAF8”},
expandBtn:{background:“none”,border:“none”,cursor:“pointer”,padding:“0 2px”},
expandArrow:{display:“inline-block”,transition:“transform .2s”,fontSize:10,color:”#bbb”},
chapterAllBtn:{fontSize:11,border:“1px solid”,borderRadius:16,padding:“3px 10px”,cursor:“pointer”,fontFamily:“inherit”,flexShrink:0,transition:“all .2s”},
sectionList:{padding:“8px 14px 12px”,display:“flex”,flexDirection:“column”,gap:3,background:”#fff”},
sectionGroup:{marginBottom:6},
sectionTitle:{display:“flex”,alignItems:“center”,padding:“4px 0 3px 4px”,borderBottom:“1px solid #f5f5f5”,marginBottom:4},
leafBtn:{display:“flex”,alignItems:“center”,gap:10,padding:“7px 10px”,border:“1px solid”,borderRadius:7,cursor:“pointer”,width:“100%”,fontFamily:“inherit”,marginBottom:3,transition:“all .15s”},
leafCheck:{width:18,height:18,borderRadius:4,display:“flex”,alignItems:“center”,justifyContent:“center”,fontSize:11,fontWeight:700,flexShrink:0,color:”#fff”,transition:“background .2s”},
logForm:{display:“flex”,alignItems:“center”,gap:10,flexWrap:“wrap”},
select:{border:“1px solid #ddd”,borderRadius:8,padding:“8px 12px”,fontSize:14,fontFamily:“inherit”,color:”#333”,outline:“none”,background:”#fafafa”},
hoursInput:{width:80,border:“1px solid #ddd”,borderRadius:8,padding:“8px 12px”,fontSize:16,fontFamily:“inherit”,outline:“none”},
addBtn:{background:”#C8956C”,color:”#fff”,border:“none”,borderRadius:8,padding:“8px 20px”,fontSize:14,cursor:“pointer”,fontFamily:“inherit”,fontWeight:700},
cancelBtn:{background:”#f0f0f0”,color:”#666”,border:“none”,borderRadius:8,padding:“8px 16px”,fontSize:14,cursor:“pointer”,fontFamily:“inherit”},
logDay:{borderBottom:“1px solid #f0f0f0”,paddingBottom:12,marginBottom:12},
logDayHeader:{display:“flex”,justifyContent:“space-between”,marginBottom:8},
logDate:{fontSize:14,fontWeight:700,color:”#444”},
logTotal:{fontSize:14,fontWeight:700,color:”#C8956C”},
logEntries:{display:“flex”,flexWrap:“wrap”,gap:6},
logTag:{fontSize:12,padding:“3px 10px”,borderRadius:20,border:“1px solid”,fontWeight:600},
textarea:{width:“100%”,border:“1px solid #ddd”,borderRadius:8,padding:“10px 12px”,fontSize:14,fontFamily:“inherit”,resize:“vertical”,outline:“none”,lineHeight:1.6,boxSizing:“border-box”},
noteCard:{background:”#fff”,borderRadius:10,padding:16,marginBottom:10,boxShadow:“0 1px 6px rgba(0,0,0,.06)”,borderLeft:“3px solid”},
noteText:{fontSize:14,lineHeight:1.7,color:”#333”,whiteSpace:“pre-wrap”},
noteMeta:{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginTop:10,fontSize:11,color:”#bbb”},
noteBtn:{background:“none”,border:“none”,cursor:“pointer”,fontSize:12,color:”#888”,fontFamily:“inherit”,padding:“2px 6px”},
// icon button for edit/delete in book card
iconBtn:{background:”#f5f5f5”,border:“1px solid #eee”,borderRadius:6,width:28,height:28,cursor:“pointer”,fontSize:14,display:“flex”,alignItems:“center”,justifyContent:“center”,color:”#888”,flexShrink:0},
// Modal styles
modalOverlay:{position:“fixed”,inset:0,background:“rgba(0,0,0,0.45)”,display:“flex”,alignItems:“center”,justifyContent:“center”,zIndex:1000,padding:16},
modalBox:{background:”#fff”,borderRadius:14,width:“100%”,maxWidth:620,maxHeight:“90vh”,display:“flex”,flexDirection:“column”,boxShadow:“0 8px 40px rgba(0,0,0,0.2)”},
modalHeader:{display:“flex”,justifyContent:“space-between”,alignItems:“center”,padding:“16px 20px”,borderBottom:“1px solid #f0f0f0”},
modalClose:{background:“none”,border:“none”,fontSize:18,cursor:“pointer”,color:”#aaa”,lineHeight:1,padding:4},
modalSection:{padding:“14px 20px”,borderBottom:“1px solid #f5f5f5”},
modalLabel:{fontSize:12,fontWeight:700,color:”#888”,letterSpacing:0.5,textTransform:“uppercase”,display:“block”,marginBottom:6},
modalInput:{width:“100%”,border:“1px solid #ddd”,borderRadius:7,padding:“8px 10px”,fontSize:14,fontFamily:“inherit”,outline:“none”,boxSizing:“border-box”,marginBottom:0},
modalFooter:{display:“flex”,justifyContent:“flex-end”,gap:10,padding:“14px 20px”},
smallBtn:{background:”#f0f0f0”,border:“1px solid #ddd”,borderRadius:6,padding:“4px 10px”,fontSize:12,cursor:“pointer”,fontFamily:“inherit”,color:”#555”,display:“flex”,alignItems:“center”,gap:3},
chapterEditorBlock:{background:”#fafaf8”,border:“1px solid #eee”,borderRadius:10,padding:12},
sectionEditorBlock:{background:”#fff”,border:“1px solid #f0f0f0”,borderRadius:7,padding:“7px 10px”},
// Drawing tab styles
streakBanner:{borderRadius:14,padding:“20px 24px”,marginBottom:16,display:“flex”,alignItems:“center”,gap:16,flexWrap:“wrap”},
todayDot:{width:12,height:12,borderRadius:“50%”,flexShrink:0,transition:“background .3s”},
uploadArea:{border:“2px dashed #ddd”,borderRadius:12,padding:24,cursor:“pointer”,display:“flex”,alignItems:“center”,justifyContent:“center”,minHeight:160,background:”#fafafa”,transition:“border-color .2s”},
achieveCard:{borderRadius:12,border:“1px solid”,padding:“14px 10px”,display:“flex”,flexDirection:“column”,alignItems:“center”,gap:4,transition:“all .2s”},
// Timer widget
timerCard:{background:”#fff”,borderRadius:12,padding:20,marginBottom:16,boxShadow:“0 1px 8px rgba(0,0,0,.07)”,border:“1px solid #f0e8e0”},
timerModeTabs:{display:“flex”,gap:6,marginBottom:20,background:”#f5f5f5”,borderRadius:10,padding:4},
timerModeBtn:{flex:1,background:“none”,border:“2px solid transparent”,borderRadius:8,padding:“8px”,cursor:“pointer”,fontSize:14,fontFamily:“inherit”,color:”#888”,fontWeight:600,transition:“all .2s”},
timerModeBtnActive:{background:”#fff”,color:”#2C2C2C”,boxShadow:“0 1px 4px rgba(0,0,0,.1)”},
timerBody:{display:“flex”,flexDirection:“column”,alignItems:“center”},
timerDisplay:{fontSize:64,fontWeight:900,color:”#2C2C2C”,fontFamily:“Georgia,serif”,letterSpacing:4,lineHeight:1,marginBottom:4},
timerBtn:{background:”#C8956C”,color:”#fff”,border:“none”,borderRadius:10,padding:“12px 24px”,fontSize:15,cursor:“pointer”,fontFamily:“inherit”,fontWeight:700,transition:“opacity .2s”},
};