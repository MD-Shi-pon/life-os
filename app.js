import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAskdYkHhoxKH52icAEeqYaq2XRrmCcdBs",
  authDomain: "shipon-life-os.firebaseapp.com",
  projectId: "shipon-life-os",
  appId: "1:957123699373:web:b3c579ad5c2604cf6b5c24"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function today() {
  return new Date().toISOString().split("T")[0];
}

let tasks = [];
let studies = [];
let selectedDate = today();

document.getElementById("todayDate").textContent = selectedDate;

function dateRef(date) {
  return doc(db, "global_master/history/dates", date);
}

async function push(date) {
  await setDoc(dateRef(date), {
    s_t: tasks,
    s_s: studies,
    updated: new Date()
  }, { merge: true });
}

function listen(date) {
  onSnapshot(dateRef(date), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      tasks = data.s_t || [];
      studies = data.s_s || [];
      render();
    }
  });
}

function render() {
  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "";

  tasks.forEach((task, i) => {
    const li = document.createElement("li");
    li.textContent = task.text;
    if (task.completed) li.classList.add("completed");

    li.onclick = () => {
      tasks[i].completed = !tasks[i].completed;
      push(selectedDate);
    };

    taskList.appendChild(li);
  });

  const studyList = document.getElementById("studyList");
  studyList.innerHTML = "";

  studies.forEach(study => {
    const li = document.createElement("li");
    li.textContent = `${study.subject} - ${study.hours}h`;
    studyList.appendChild(li);
  });

  calculateLifetime();
}

document.getElementById("addTask").onclick = () => {
  const val = document.getElementById("taskInput").value;
  if (!val) return;
  tasks.push({ text: val, completed: false });
  document.getElementById("taskInput").value = "";
  push(selectedDate);
};

document.getElementById("addStudy").onclick = () => {
  const subject = document.getElementById("subjectInput").value;
  const hours = parseFloat(document.getElementById("hoursInput").value);
  if (!subject || !hours) return;
  studies.push({ subject, hours });
  push(selectedDate);
};

async function calculateLifetime() {
  const snapshot = await getDocs(collection(db, "global_master/history/dates"));
  let total = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.s_s) {
      data.s_s.forEach(s => total += s.hours || 0);
    }
  });

  document.getElementById("lifetimeHours").textContent = total.toFixed(1);
}

// Sync Indicator
const syncDot = document.getElementById("syncDot");
const syncText = document.getElementById("syncText");
const manualSyncBtn = document.getElementById("manualSync");

function updateSyncStatus() {
  if (navigator.onLine) {
    syncDot.style.background = "#10b981";
    syncText.textContent = "Live Sync Active";
  } else {
    syncDot.style.background = "#ef4444";
    syncText.textContent = "Offline Mode";
  }
}

window.addEventListener("online", updateSyncStatus);
window.addEventListener("offline", updateSyncStatus);
updateSyncStatus();

manualSyncBtn.onclick = async () => {
  syncText.textContent = "Syncing...";
  await calculateLifetime();
  setTimeout(updateSyncStatus, 800);
};

document.querySelectorAll(".bottom-nav button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

listen(selectedDate);
