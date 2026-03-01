import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ===== FIREBASE CONFIG ===== */
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "shipon-life-os.firebaseapp.com",
  projectId: "shipon-life-os",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ===== UTIL ===== */
function today() {
  return new Date().toISOString().split("T")[0];
}

document.getElementById("todayDate").textContent = today();

let selectedDate = today();
let tasks = [];
let studies = [];
let subjects = [];

/* ===== FIRESTORE REFS ===== */
function dateRef(date) {
  return doc(db, "global_master/history/dates", date);
}

function subjectRef() {
  return doc(db, "global_master/config", "subjects");
}

/* ===== PUSH STUDY DATA ===== */
async function pushStudy(date) {
  await setDoc(dateRef(date), {
    s_s: studies
  }, { merge: true });
}

/* ===== SUBJECT SYSTEM ===== */
async function loadSubjects() {
  onSnapshot(subjectRef(), (snap) => {
    if (snap.exists()) {
      subjects = snap.data().list || [];
    } else {
      subjects = [];
    }
    renderSubjects();
  });
}

async function saveSubjects() {
  await setDoc(subjectRef(), { list: subjects });
}

function renderSubjects() {
  const subjectList = document.getElementById("subjectList");
  const subjectSelect = document.getElementById("subjectInput");
  const analyzeSelect = document.getElementById("analyzeSubject");

  subjectList.innerHTML = "";
  subjectSelect.innerHTML = `<option value="">Select Subject</option>`;
  analyzeSelect.innerHTML = `<option value="all">All Subjects</option>`;

  subjects.forEach((sub, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${sub} <button onclick="deleteSubject(${i})">Delete</button>`;
    subjectList.appendChild(li);

    subjectSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    analyzeSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
  });
}

window.deleteSubject = function(index) {
  subjects.splice(index, 1);
  saveSubjects();
};

/* ===== ADD SUBJECT ===== */
document.getElementById("addSubjectBtn").onclick = () => {
  const val = document.getElementById("newSubjectInput").value.trim();
  if (!val) return;
  if (!subjects.includes(val)) {
    subjects.push(val);
    saveSubjects();
  }
  document.getElementById("newSubjectInput").value = "";
};

/* ===== ADD STUDY ===== */
document.getElementById("addStudy").onclick = async () => {
  const subject = document.getElementById("subjectInput").value;
  const hours = parseFloat(document.getElementById("hoursInput").value);
  const date = document.getElementById("studyDate").value || today();

  if (!subject || !hours) return;

  const ref = dateRef(date);
  const snap = await getDocs(collection(db, "global_master/history/dates"));
  
  let existing = [];
  snap.forEach(doc => {
    if (doc.id === date) {
      existing = doc.data().s_s || [];
    }
  });

  existing.push({ subject, hours });

  await setDoc(ref, { s_s: existing }, { merge: true });

  document.getElementById("hoursInput").value = "";
};

/* ===== ANALYZE SYSTEM ===== */
let chart;

document.getElementById("timeRange").onchange = generateChart;
document.getElementById("analyzeSubject").onchange = generateChart;
document.getElementById("startDate").onchange = generateChart;
document.getElementById("endDate").onchange = generateChart;

async function generateChart() {

  const range = document.getElementById("timeRange").value;
  const subjectFilter = document.getElementById("analyzeSubject").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  const snapshot = await getDocs(collection(db, "global_master/history/dates"));

  let map = {};

  snapshot.forEach(doc => {
    const date = doc.id;

    if (startDate && date < startDate) return;
    if (endDate && date > endDate) return;

    const data = doc.data();
    let total = 0;

    if (data.s_s) {
      data.s_s.forEach(s => {
        if (subjectFilter === "all" || s.subject === subjectFilter) {
          total += s.hours || 0;
        }
      });
    }

    const d = new Date(date);
    let key;

    if (range === "daily") {
      key = date;
    } else if (range === "weekly") {
      const week = Math.ceil(d.getDate() / 7);
      key = `${d.getFullYear()}-W${week}`;
    } else if (range === "monthly") {
      key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    } else {
      key = `${d.getFullYear()}`;
    }

    if (!map[key]) map[key] = 0;
    map[key] += total;
  });

  const labels = Object.keys(map).sort();
  const values = labels.map(k => map[k]);

  const ctx = document.getElementById("mainChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: subjectFilter === "all" ? "All Subjects" : subjectFilter,
        data: values,
        backgroundColor: '#007aff'
      }]
    }
  });
}

/* ===== INIT ===== */
loadSubjects();
