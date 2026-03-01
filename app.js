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

// ================= GLOBAL HELPERS =================
window.toggleTheme = () => document.body.classList.toggle('light-mode');

function format12(t) {
    if(!t) return ""; 
    let [h, m] = t.split(':');
    let a = h >= 12 ? 'PM' : 'AM'; 
    h = h % 12 || 12;
    return `${h}:${m} ${a}`;
}

// ================= UNIVERSAL SYNC =================
window.syncData = async (date) => {
    const localData = {
        tasks: JSON.parse(localStorage.getItem('s_t'))?.[date] || [],
        study: JSON.parse(localStorage.getItem('s_s'))?.[date] || [],
        dayLog: JSON.parse(localStorage.getItem('s_dayLog'))?.[date] || [],
        subs: JSON.parse(localStorage.getItem('s_subs')) || ["English", "Marketing"]
    };
    try { await setDoc(doc(db, "global_master", "history", "dates", date), localData); } 
    catch (e) { console.error("Cloud Error", e); }
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

// ================= NAVIGATION & REFRESH =================
window.nav = (id, el) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.getElementById(id).classList.add('active-page');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active'); 
    window.refresh();
};

window.refresh = function() {
    const mDate = document.getElementById('mainDate').value || new Date().toISOString().split('T')[0];
    const tDate = document.getElementById('taskDate').value || mDate;
    const logDate = document.getElementById('todayDate').value || mDate;
    const studyDate = document.getElementById('studyDate').value || mDate;

    document.getElementById('homeDay').innerText = new Date(mDate).toLocaleDateString('en-US', { weekday: 'long' });

    const sDB = JSON.parse(localStorage.getItem('s_s')) || {};
    const tDB = JSON.parse(localStorage.getItem('s_t')) || {};
    const dLogDB = JSON.parse(localStorage.getItem('s_dayLog')) || {};
    const subs = JSON.parse(localStorage.getItem('s_subs')) || ["English", "Marketing"];

    let total = 0; 
    Object.values(sDB).forEach(day => (day || []).forEach(e => total += parseFloat(e.hours || 0)));
    document.getElementById('lifeH').innerText = total.toFixed(1);

    const sSel = document.getElementById('sSub'); 
    if(sSel) {
        sSel.innerHTML = '';
        subs.forEach(s => sSel.innerHTML += `<option>${s}</option>`);
    }

    renderT(tDate, tDB); 
    renderS(studyDate, sDB); 
    renderLog(logDate, dLogDB);
    window.updateChart('weekly'); 
};

// ================= STATS ENGINE (NEW) =================
window.updateChart = (type) => {
    const canvas = document.getElementById('mainChart');
    if(!canvas) return;
    const sDB = JSON.parse(localStorage.getItem('s_s')) || {};
    let labels = [], data = [];
    let count = type === 'daily' ? 1 : type === 'weekly' ? 7 : type === 'monthly' ? 30 : 365;

    for(let i = count - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const s = d.toISOString().split('T')[0];
        if(type === 'daily') labels.push(new Date().toLocaleTimeString([], {hour:'2-digit'}));
        else labels.push(d.toLocaleDateString([],{day:'numeric', month:'short'}));
        let h = 0; (sDB[s] || []).forEach(x => h += parseFloat(x.hours || 0));
        data.push(h);
    }

    if(window.chartO) window.chartO.destroy();
    window.chartO = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels, datasets: [{ label: 'Hours', data, borderColor: '#6366f1', tension: 0.3, fill: true, backgroundColor: 'rgba(99, 102, 241, 0.1)' }] },
        options: { maintainAspectRatio: false }
    });
};

window.compareSubjects = () => {
    const sDB = JSON.parse(localStorage.getItem('s_s')) || {};
    const subTotals = {};
    Object.values(sDB).forEach(day => day.forEach(e => subTotals[e.subject] = (subTotals[e.subject] || 0) + parseFloat(e.hours)));
    
    if(window.chartO) window.chartO.destroy();
    window.chartO = new Chart(document.getElementById('mainChart').getContext('2d'), {
        type: 'doughnut',
        data: { labels: Object.keys(subTotals), datasets: [{ data: Object.values(subTotals), backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'] }] },
        options: { maintainAspectRatio: false }
    });
};

window.compareDates = () => {
    const d1 = document.getElementById('compDate1').value;
    const d2 = document.getElementById('compDate2').value;
    const sDB = JSON.parse(localStorage.getItem('s_s')) || {};
    const getH = (date) => { let t = 0; (sDB[date] || []).forEach(e => t += parseFloat(e.hours)); return t; };

    if(window.chartO) window.chartO.destroy();
    window.chartO = new Chart(document.getElementById('mainChart').getContext('2d'), {
        type: 'bar',
        data: { labels: [d1, d2], datasets: [{ label: 'Hours', data: [getH(d1), getH(d2)], backgroundColor: ['#6366f1', '#10b981'] }] },
        options: { maintainAspectRatio: false }
    });
};

// ================= TASKS LOGIC (LOCKED) =================
window.addT = () => {
    let d = document.getElementById('taskDate').value, v = document.getElementById('tIn').value;
    if(!v) return; 
    let db = JSON.parse(localStorage.getItem('s_t')) || {};
    if(!db[d]) db[d] = []; db[d].push({text: v, done: false});
    localStorage.setItem('s_t', JSON.stringify(db)); window.syncData(d); document.getElementById('tIn').value='';
    window.refresh();
};
function renderT(d, db) {
    const l = document.getElementById('tList'); if(!l) return; l.innerHTML = '';
    (db[d] || []).forEach((t, i) => { 
        l.innerHTML += `<div class="list-item"><input type="checkbox" ${t.done?'checked':''} onchange="window.toggleT('${d}',${i})" style="width:20px; height:20px; accent-color:var(--s);"><span class="item-label ${t.done?'motivation-line':''}">${t.text}</span><span onclick="window.delT('${d}',${i})" class="del-btn">DEL</span></div>`; 
    });
}
window.toggleT = (d, i) => { let db = JSON.parse(localStorage.getItem('s_t')); db[d][i].done = !db[d][i].done; localStorage.setItem('s_t', JSON.stringify(db)); window.syncData(d); window.refresh(); };
window.delT = (d, i) => { let db = JSON.parse(localStorage.getItem('s_t')); db[d].splice(i, 1); localStorage.setItem('s_t', JSON.stringify(db)); window.syncData(d); window.refresh(); };

// ================= TODAY LOGIC (LOCKED) =================
window.addLog = () => {
    let d = document.getElementById('todayDate').value, s = document.getElementById('startTime').value, e = document.getElementById('endTime').value, a = document.getElementById('logAct').value;
    if (!s || !e || !a) return; 
    let db = JSON.parse(localStorage.getItem('s_dayLog')) || {};
    if (!db[d]) db[d] = []; db[d].push({start: s, end: e, act: a});
    localStorage.setItem('s_dayLog', JSON.stringify(db)); window.syncData(d); 
    document.getElementById('logAct').value = ''; window.refresh();
};
function renderLog(d, db) {
    const l = document.getElementById('logList'); if(!l) return; l.innerHTML = '';
    (db[d] || []).forEach((item, i) => { 
        l.innerHTML += `<div class="list-item"><span style="font-weight:800; color:var(--p); font-size:0.75rem; min-width:115px; text-align:left;">${format12(item.start)} — ${format12(item.end)}</span><span class="item-label">${item.act}</span><span onclick="window.delLog('${d}',${i})" class="del-btn">DEL</span></div>`; 
    });
}
window.delLog = (d, i) => { let db = JSON.parse(localStorage.getItem('s_dayLog')); db[d].splice(i, 1); localStorage.setItem('s_dayLog', JSON.stringify(db)); window.syncData(d); window.refresh(); };

// ================= STUDY LOGIC (LOCKED) =================
window.addS = () => {
    let d = document.getElementById('studyDate').value, h = parseFloat(document.getElementById('sHr').value), sub = document.getElementById('sSub').value;
    let time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if(!h) return; let db = JSON.parse(localStorage.getItem('s_s')) || {};
    if(!db[d]) db[d] = []; db[d].push({ subject: sub, hours: h, time: time });
    localStorage.setItem('s_s', JSON.stringify(db)); window.syncData(d); document.getElementById('sHr').value = '';
    window.refresh();
};
function renderS(d, db) {
    const l = document.getElementById('sLog'); if(!l) return; l.innerHTML = '';
    (db[d] || []).forEach((s, i) => { l.innerHTML += `<div class="list-item"><span class="item-label"><small>${s.time}</small> <b>${s.subject}</b>: ${s.hours}h</span><span onclick="window.delS('${d}',${i})" class="del-btn">DEL</span></div>`; });
}
window.delS = (d, i) => { let db = JSON.parse(localStorage.getItem('s_s')); db[d].splice(i, 1); localStorage.setItem('s_s', JSON.stringify(db)); window.syncData(d); window.refresh(); };

// INIT
document.getElementById('taskDate').valueAsDate = new Date();
document.getElementById('todayDate').valueAsDate = new Date();
document.getElementById('mainDate').valueAsDate = new Date();
document.getElementById('studyDate').valueAsDate = new Date();
window.refresh();
