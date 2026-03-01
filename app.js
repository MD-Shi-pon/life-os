import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAskdYkHhoxKH52icAEeqYaq2XRrmCcdBs",
    authDomain: "shipon-life-os.firebaseapp.com",
    projectId: "shipon-life-os",
    storageBucket: "shipon-life-os.firebasestorage.app",
    messagingSenderId: "957123699373",
    appId: "1:957123699373:web:b3c579ad5c2604cf6b5c24"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// GLOBAL FUNCTIONS
window.toggleTheme = () => document.body.classList.toggle('light-mode');

window.syncData = async (date) => {
    const localData = {
        tasks: JSON.parse(localStorage.getItem('s_t'))?.[date] || [],
        study: JSON.parse(localStorage.getItem('s_s'))?.[date] || [],
        dayLog: JSON.parse(localStorage.getItem('s_dayLog'))?.[date] || [],
        subs: JSON.parse(localStorage.getItem('s_subs')) || ["English", "Marketing"]
    };
    try { await setDoc(doc(db, "global_master", "history", "dates", date), localData); } 
    catch (e) { console.error("Sync Error", e); }
};

onSnapshot(collection(db, "global_master", "history", "dates"), (snap) => {
    let s_s = {}, s_t = {}, s_d = {};
    snap.forEach(d => {
        const data = d.data();
        s_s[d.id] = data.study || [];
        s_t[d.id] = data.tasks || [];
        s_d[d.id] = data.dayLog || [];
    });
    localStorage.setItem('s_s', JSON.stringify(s_s));
    localStorage.setItem('s_t', JSON.stringify(s_t));
    localStorage.setItem('s_dayLog', JSON.stringify(s_d));
    window.refresh();
});

window.refresh = function() {
    const mDate = document.getElementById('mainDate').value || new Date().toISOString().split('T')[0];
    const tDate = document.getElementById('taskDate').value;
    const lDate = document.getElementById('todayDate').value;
    const sDate = document.getElementById('studyDate').value;

    document.getElementById('homeDay').innerText = new Date(mDate).toLocaleDateString('en-US', { weekday: 'long' });

    const sDB = JSON.parse(localStorage.getItem('s_s')) || {};
    const tDB = JSON.parse(localStorage.getItem('s_t')) || {};
    const dLogDB = JSON.parse(localStorage.getItem('s_dayLog')) || {};
    const subs = JSON.parse(localStorage.getItem('s_subs')) || ["English", "Marketing"];

    let total = 0; Object.values(sDB).forEach(day => (day || []).forEach(e => total += parseFloat(e.hours || 0)));
    document.getElementById('lifeH').innerText = total.toFixed(1);

    const sSel = document.getElementById('sSub'); sSel.innerHTML = '';
    subs.forEach(s => sSel.innerHTML += `<option>${s}</option>`);

    renderT(tDate, tDB); renderS(sDate, sDB); renderLog(lDate, dLogDB); renderSubM(subs);
    updateChart(sDB);
};

window.nav = (id, el) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.getElementById(id).classList.add('active-page');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active'); window.refresh();
};

// --- LOGIC HELPERS ---
function format12(t) {
    if(!t) return ""; let [h, m] = t.split(':');
    let a = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return `${h}:${m} ${a}`;
}

// Global scope logic for buttons
window.addT = () => {
    let d = document.getElementById('taskDate').value, v = document.getElementById('tIn').value;
    if(!v) return; let db = JSON.parse(localStorage.getItem('s_t')) || {};
    if(!db[d]) db[d] = []; db[d].push({text: v, done: false});
    localStorage.setItem('s_t', JSON.stringify(db)); window.syncData(d); document.getElementById('tIn').value='';
};
function renderT(d, db) {
    const l = document.getElementById('tList'); l.innerHTML = '';
    (db[d] || []).forEach((t, i) => { 
        l.innerHTML += `<div class="list-item"><input type="checkbox" ${t.done?'checked':''} onchange="toggleT('${d}',${i})"><span class="item-label ${t.done?'motivation-line':''}">${t.text}</span><span onclick="delT('${d}',${i})" class="del-btn">DEL</span></div>`; 
    });
}
window.toggleT = (d, i) => { let db = JSON.parse(localStorage.getItem('s_t')); db[d][i].done = !db[d][i].done; localStorage.setItem('s_t', JSON.stringify(db)); window.syncData(d); };
window.delT = (d, i) => { let db = JSON.parse(localStorage.getItem('s_t')); db[d].splice(i, 1); localStorage.setItem('s_t', JSON.stringify(db)); window.syncData(d); };

window.addS = () => {
    let d = document.getElementById('studyDate').value, h = parseFloat(document.getElementById('sHr').value), sub = document.getElementById('sSub').value;
    if(!h) return; let db = JSON.parse(localStorage.getItem('s_s')) || {};
    if(!db[d]) db[d] = []; let ex = db[d].find(x => x.subject === sub);
    if(ex) ex.hours += h; else db[d].push({subject: sub, hours: h});
    localStorage.setItem('s_s', JSON.stringify(db)); window.syncData(d); document.getElementById('sHr').value='';
};
function renderS(d, db) {
    const l = document.getElementById('sLog'); l.innerHTML = '';
    (db[d] || []).forEach((s, i) => { l.innerHTML += `<div class="list-item"><span class="item-label"><b>${s.subject}</b>: ${s.hours}h</span><span onclick="delS('${d}',${i})" class="del-btn">DEL</span></div>`; });
}
window.delS = (d, i) => { let db = JSON.parse(localStorage.getItem('s_s')); db[d].splice(i, 1); localStorage.setItem('s_s', JSON.stringify(db)); window.syncData(d); };

window.addNewSub = () => {
    const v = document.getElementById('newSubIn').value; 
    let subs = JSON.parse(localStorage.getItem('s_subs')) || ["English", "Marketing"];
    if(v && !subs.includes(v)) { subs.push(v); localStorage.setItem('s_subs', JSON.stringify(subs)); document.getElementById('newSubIn').value=''; window.refresh(); }
};
function renderSubM(subs) {
    const l = document.getElementById('subManageList'); l.innerHTML = '';
    subs.forEach((s, i) => { l.innerHTML += `<div class="list-item"><span class="item-label">${s}</span><span onclick="remSub(${i})" class="del-btn">REMOVE</span></div>`; });
}
window.remSub = (i) => { let subs = JSON.parse(localStorage.getItem('s_subs')); subs.splice(i, 1); localStorage.setItem('s_subs', JSON.stringify(subs)); window.refresh(); };

window.addLog = () => {
    let d = document.getElementById('todayDate').value, s = document.getElementById('startTime').value, e = document.getElementById('endTime').value, a = document.getElementById('logAct').value;
    if(!s || !e || !a) return; let db = JSON.parse(localStorage.getItem('s_dayLog')) || {};
    if(!db[d]) db[d] = []; db[d].push({start: s, end: e, act: a});
    localStorage.setItem('s_dayLog', JSON.stringify(db)); window.syncData(d); document.getElementById('logAct').value='';
};
function renderLog(d, db) {
    const l = document.getElementById('logList'); l.innerHTML = '';
    (db[d] || []).forEach(item => { l.innerHTML += `<div class="list-item"><span style="font-weight:800; color:var(--p); font-size:0.7rem; min-width:110px;">${format12(item.start)}-${format12(item.end)}</span><span class="item-label">${item.act}</span></div>`; });
}

function updateChart(sDB) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    let labels = [], data = [];
    for(let i=6; i>=0; i--) {
        const d = new Date(); d.setDate(d.getDate()-i);
        const s = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString([],{weekday:'short'}));
        let h = 0; (sDB[s]||[]).forEach(x => h += parseFloat(x.hours || 0));
        data.push(h);
    }
    if(window.chartO) window.chartO.destroy();
    window.chartO = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Hours', data, backgroundColor: '#6366f1', borderRadius: 8 }] }, options: { maintainAspectRatio: false } });
}

// INIT
document.getElementById('taskDate').valueAsDate = new Date();
document.getElementById('todayDate').valueAsDate = new Date();
document.getElementById('mainDate').valueAsDate = new Date();
document.getElementById('studyDate').valueAsDate = new Date();
window.refresh();
