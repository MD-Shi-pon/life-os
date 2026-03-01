import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// HELPERS
window.toggleTheme = () => document.body.classList.toggle('light-mode');
const format12 = (t) => {
    if(!t) return ""; let [h, m] = t.split(':');
    let a = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return `${h}:${m} ${a}`;
};

// SYNC
window.syncData = async (date) => {
    const data = {
        tasks: JSON.parse(localStorage.getItem('s_t'))?.[date] || [],
        study: JSON.parse(localStorage.getItem('s_s'))?.[date] || [],
        dayLog: JSON.parse(localStorage.getItem('s_dayLog'))?.[date] || [],
        subs: JSON.parse(localStorage.getItem('s_subs')) || ["English", "Marketing"]
    };
    await setDoc(doc(db, "global_master", "history", "dates", date), data);
};

onSnapshot(collection(db, "global_master", "history", "dates"), (snap) => {
    let s_s = {}, s_t = {}, s_d = {}, subs = ["English", "Marketing"];
    snap.forEach(d => {
        const data = d.data();
        s_s[d.id] = data.study || []; s_t[d.id] = data.tasks || []; s_d[d.id] = data.dayLog || [];
        if(data.subs) subs = data.subs;
    });
    localStorage.setItem('s_s', JSON.stringify(s_s));
    localStorage.setItem('s_t', JSON.stringify(s_t));
    localStorage.setItem('s_dayLog', JSON.stringify(s_d));
    localStorage.setItem('s_subs', JSON.stringify(subs));
    window.refresh();
});

// NAVIGATION
window.nav = (id, el) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.getElementById(id).classList.add('active-page');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active'); window.refresh();
};

window.refresh = () => {
    const d = document.getElementById('mainDate').value || new Date().toISOString().split('T')[0];
    const sDB = JSON.parse(localStorage.getItem('s_s')) || {}, tDB = JSON.parse(localStorage.getItem('s_t')) || {};
    const dLogDB = JSON.parse(localStorage.getItem('s_dayLog')) || {}, subs = JSON.parse(localStorage.getItem('s_subs')) || [];

    document.getElementById('homeDay').innerText = new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
    let total = 0; Object.values(sDB).forEach(day => (day || []).forEach(e => total += parseFloat(e.hours || 0)));
    document.getElementById('lifeH').innerText = total.toFixed(1);

    // FIX: Rebuild Dropdown
    const sSel = document.getElementById('sSub'); 
    if(sSel) {
        sSel.innerHTML = ''; 
        subs.forEach(s => sSel.innerHTML += `<option value="${s}">${s}</option>`);
    }

    renderTasks(document.getElementById('taskDate').value || d, tDB);
    renderStudy(document.getElementById('studyDate').value || d, sDB);
    renderLog(document.getElementById('todayDate').value || d, dLogDB);
    renderSubManage(subs);
    updateChart(sDB);
};

// SUBJECT MANAGEMENT (FIXED)
window.addNewSub = () => {
    const v = document.getElementById('newSubIn').value.trim();
    let subs = JSON.parse(localStorage.getItem('s_subs')) || ["English", "Marketing"];
    if(v && !subs.includes(v)) {
        subs.push(v);
        localStorage.setItem('s_subs', JSON.stringify(subs));
        document.getElementById('newSubIn').value = '';
        window.syncData(new Date().toISOString().split('T')[0]);
        window.refresh(); // Force UI update
    }
};

const renderSubManage = (subs) => {
    const l = document.getElementById('subManageList'); if(!l) return; l.innerHTML = '';
    subs.forEach((s, i) => { 
        l.innerHTML += `<div class="list-item"><span class="item-label">${s}</span><span onclick="window.remSub(${i})" class="del-btn">REMOVE</span></div>`; 
    });
};

window.remSub = (i) => {
    let subs = JSON.parse(localStorage.getItem('s_subs'));
    subs.splice(i, 1);
    localStorage.setItem('s_subs', JSON.stringify(subs));
    window.syncData(new Date().toISOString().split('T')[0]);
    window.refresh();
};

// STUDY LOGIC
window.addS = () => {
    const d = document.getElementById('studyDate').value, h = parseFloat(document.getElementById('sHr').value), sub = document.getElementById('sSub').value;
    if(!h || !sub) return; let db = JSON.parse(localStorage.getItem('s_s')) || {};
    if(!db[d]) db[d] = []; db[d].push({subject: sub, hours: h, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})});
    localStorage.setItem('s_s', JSON.stringify(db)); window.syncData(d); document.getElementById('sHr').value=''; window.refresh();
};

const renderStudy = (d, db) => {
    const l = document.getElementById('sLog'); l.innerHTML = '';
    (db[d] || []).forEach((s, i) => {
        l.innerHTML += `<div class="list-item"><span class="item-label"><small>${s.time}</small> <b>${s.subject}</b>: ${s.hours}h</span><span onclick="window.delS('${d}',${i})" class="del-btn">DEL</span></div>`;
    });
};
window.delS = (d, i) => { let db = JSON.parse(localStorage.getItem('s_s')); db[d].splice(i, 1); localStorage.setItem('s_s', JSON.stringify(db)); window.syncData(d); window.refresh(); };

// TASKS & LOGS (KEEPING CLEAN)
window.addT = () => {
    const d = document.getElementById('taskDate').value, v = document.getElementById('tIn').value;
    if(!v) return; let db = JSON.parse(localStorage.getItem('s_t')) || {};
    if(!db[d]) db[d] = []; db[d].push({text: v, done: false});
    localStorage.setItem('s_t', JSON.stringify(db)); window.syncData(d); document.getElementById('tIn').value=''; window.refresh();
};
const renderTasks = (d, db) => {
    const l = document.getElementById('tList'); l.innerHTML = '';
    (db[d] || []).forEach((t, i) => {
        l.innerHTML += `<div class="list-item"><input type="checkbox" ${t.done?'checked':''} onchange="window.toggleT('${d}',${i})"><span class="item-label ${t.done?'motivation-line':''}">${t.text}</span><span onclick="window.delT('${d}',${i})" class="del-btn">DEL</span></div>`;
    });
};
window.toggleT = (d, i) => { let db = JSON.parse(localStorage.getItem('s_t')); db[d][i].done = !db[d][i].done; localStorage.setItem('s_t', JSON.stringify(db)); window.syncData(d); window.refresh(); };
window.delT = (d, i) => { let db = JSON.parse(localStorage.getItem('s_t')); db[d].splice(i, 1); localStorage.setItem('s_t', JSON.stringify(db)); window.syncData(d); window.refresh(); };

window.addLog = () => {
    const d = document.getElementById('todayDate').value, s = document.getElementById('startTime').value, e = document.getElementById('endTime').value, a = document.getElementById('logAct').value;
    if(!s || !e || !a) return; let db = JSON.parse(localStorage.getItem('s_dayLog')) || {};
    if(!db[d]) db[d] = []; db[d].push({start: s, end: e, act: a});
    localStorage.setItem('s_dayLog', JSON.stringify(db)); window.syncData(d); document.getElementById('logAct').value=''; window.refresh();
};
const renderLog = (d, db) => {
    const l = document.getElementById('logList'); l.innerHTML = '';
    (db[d] || []).forEach((item, i) => {
        l.innerHTML += `<div class="list-item"><span style="font-weight:800; color:var(--p); font-size:0.75rem; min-width:115px;">${format12(item.start)} — ${format12(item.end)}</span><span class="item-label">${item.act}</span><span onclick="window.delLog('${d}',${i})" class="del-btn">DEL</span></div>`;
    });
};
window.delLog = (d, i) => { let db = JSON.parse(localStorage.getItem('s_dayLog')); db[d].splice(i, 1); localStorage.setItem('s_dayLog', JSON.stringify(db)); window.syncData(d); window.refresh(); };

const updateChart = (sDB) => {
    const canvas = document.getElementById('mainChart'); if(!canvas) return;
    let labels = [], data = []; for(let i=6; i>=0; i--) {
        const d = new Date(); d.setDate(d.getDate()-i); const s = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString([],{weekday:'short'}));
        let h = 0; (sDB[s]||[]).forEach(x => h += parseFloat(x.hours || 0)); data.push(h);
    }
    if(window.chartO) window.chartO.destroy();
    window.chartO = new Chart(canvas.getContext('2d'), {
        type: 'bar', data: { labels, datasets: [{ label: 'Hours', data, backgroundColor: '#6366f1', borderRadius: 8 }] },
        options: { maintainAspectRatio: false }
    });
};

// INIT
const today = new Date().toISOString().split('T')[0];
['taskDate', 'todayDate', 'mainDate', 'studyDate'].forEach(id => document.getElementById(id).value = today);
window.refresh();
