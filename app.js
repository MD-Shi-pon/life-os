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

document.getElementById("todayDate").textContent = today();

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

/* Analyze Chart */
let chart;
document.getElementById("timeRange").onchange=generateChart;

async function generateChart(){
  const snapshot=await getDocs(collection(db,"global_master/history/dates"));
  let labels=[];
  let values=[];

  snapshot.forEach(doc=>{
    let total=0;
    const data=doc.data();
    if(data.s_s){
      data.s_s.forEach(s=>total+=s.hours||0);
    }
    labels.push(doc.id);
    values.push(total);
  });

  const ctx=document.getElementById("mainChart");
  if(chart)chart.destroy();

  chart=new Chart(ctx,{
    type:'line',
    data:{
      labels:labels,
      datasets:[{
        label:'Study Hours',
        data:values,
        borderColor:'#007aff',
        backgroundColor:'rgba(0,122,255,0.1)',
        tension:0.4
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
