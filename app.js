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

function today(){
  return new Date().toISOString().split("T")[0];
}

document.getElementById("todayDate").textContent=today();

let tasks=[];
let studies=[];
let selectedDate=today();

function dateRef(date){
  return doc(db,"global_master/history/dates",date);
}

async function push(){
  await setDoc(dateRef(selectedDate),{
    s_t:tasks,
    s_s:studies
  },{merge:true});
}

function listen(){
  onSnapshot(dateRef(selectedDate),(snap)=>{
    if(snap.exists()){
      const data=snap.data();
      tasks=data.s_t||[];
      studies=data.s_s||[];
      render();
    }
  });
}

function render(){
  const taskList=document.getElementById("taskList");
  taskList.innerHTML="";
  tasks.forEach((t,i)=>{
    const li=document.createElement("li");
    li.textContent=t.text;
    if(t.completed)li.classList.add("completed");
    li.onclick=()=>{
      tasks[i].completed=!tasks[i].completed;
      push();
    };
    taskList.appendChild(li);
  });

  const studyList=document.getElementById("studyList");
  studyList.innerHTML="";
  studies.forEach(s=>{
    const li=document.createElement("li");
    li.textContent=`${s.subject} - ${s.hours}h`;
    studyList.appendChild(li);
  });

  calculateLifetime();
}

document.getElementById("addTask").onclick=()=>{
  const val=document.getElementById("taskInput").value;
  if(!val)return;
  tasks.push({text:val,completed:false});
  document.getElementById("taskInput").value="";
  push();
};

document.getElementById("addStudy").onclick=()=>{
  const subject=document.getElementById("subjectInput").value;
  const hours=parseFloat(document.getElementById("hoursInput").value);
  if(!subject||!hours)return;
  studies.push({subject,hours});
  push();
};

async function calculateLifetime(){
  const snapshot=await getDocs(collection(db,"global_master/history/dates"));
  let total=0;
  snapshot.forEach(doc=>{
    const data=doc.data();
    if(data.s_s){
      data.s_s.forEach(s=>total+=s.hours||0);
    }
  });
  document.getElementById("lifetimeHours").textContent=total.toFixed(1);
}

/* ===== ANALYZE SYSTEM ===== */
let chart;

document.getElementById("timeRange").onchange=generateChart;

async function generateChart(){
  const range=document.getElementById("timeRange").value;
  const snapshot=await getDocs(collection(db,"global_master/history/dates"));

  let map={};

  snapshot.forEach(doc=>{
    const data=doc.data();
    let total=0;
    if(data.s_s){
      data.s_s.forEach(s=>total+=s.hours||0);
    }

    const date=new Date(doc.id);

    let key;
    if(range==="daily"){
      key=doc.id;
    }else if(range==="weekly"){
      const week=Math.ceil(date.getDate()/7);
      key=`${date.getFullYear()}-W${week}`;
    }else if(range==="monthly"){
      key=`${date.getFullYear()}-${date.getMonth()+1}`;
    }else{
      key=`${date.getFullYear()}`;
    }

    if(!map[key])map[key]=0;
    map[key]+=total;
  });

  const labels=Object.keys(map).sort();
  const values=labels.map(k=>map[k]);

  const ctx=document.getElementById("mainChart");
  if(chart)chart.destroy();

  chart=new Chart(ctx,{
    type:'bar',
    data:{
      labels:labels,
      datasets:[{
        label:'Study Hours',
        data:values,
        backgroundColor:'#007aff'
      }]
    }
  });
}

/* Navigation */
document.querySelectorAll(".bottom-nav button").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");
    if(btn.dataset.tab==="analyze")generateChart();
  };
});

listen();
