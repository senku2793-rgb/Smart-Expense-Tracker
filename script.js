class Expense {
  constructor(date, amount, category) {
    this.date = date;
    this.amount = amount;
    this.category = category;
  }
}

function hash(p){ return btoa(p); }
function getUsers(){ return JSON.parse(localStorage.getItem("users")) || {}; }
function saveUsers(u){ localStorage.setItem("users", JSON.stringify(u)); }

function isStrongPassword(p){
  return p.length>=8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);
}

/* REGISTER */
function register(){
  if(!isStrongPassword(regPassword.value)){
    strengthMsg.innerText="Weak password!";
    return;
  }
  let users=getUsers();
  if(users[regUsername.value]) return alert("User exists");

  users[regUsername.value]={
    password:hash(regPassword.value),
    role:regRole.value,
    expenses:[],
    categories:["Food","Transport","Education","Entertainment","Other"],
    activity:[]
  };
  saveUsers(users);
  alert("Registered!");
}

/* LOGIN */
function login(){
  let users=getUsers();
  let u=loginUsername.value;
  if(!users[u]||users[u].password!==hash(loginPassword.value))
    return alert("Invalid login");
  localStorage.setItem("currentUser",u);
  window.location="dashboard.html";
}

/* RESET */
function resetPassword(){
  let users=getUsers();
  if(!users[resetUsername.value]) return alert("User not found");
  users[resetUsername.value].password=hash(newPassword.value);
  saveUsers(users);
  alert("Password reset!");
}

function logout(){
  localStorage.removeItem("currentUser");
  window.location="index.html";
}

/* DASHBOARD */
let currentUser,userData,chart,activeMonth=null;

function loadDashboard(){
  currentUser=localStorage.getItem("currentUser");
  if(!currentUser) return logout();

  let users=getUsers();
  userData=users[currentUser];

  if(userData.role==="admin"){
    customerPanel.style.display="none";
    adminPanel.style.display="block";
    loadAdminView();
  }

  loadCategories();
  loadActivityLog();
  updateSummary();
  updateChart();

  if(localStorage.getItem("dark")==="true")
    document.body.classList.add("dark");
}

/* EXPENSE */
function addExpense(){
  userData.expenses.push(new Expense(dateInput.value,parseFloat(amountInput.value),categorySelect.value));
  userData.activity.push({action:"Add expense",time:new Date().toLocaleString()});
  let users=getUsers(); users[currentUser]=userData; saveUsers(users);
  updateSummary(); updateChart(); loadActivityLog();
}

/* CATEGORY */
function loadCategories(){
  categorySelect.innerHTML="";
  categoryList.innerHTML="";
  userData.categories.forEach(c=>{
    categorySelect.innerHTML+=`<option>${c}</option>`;
    categoryList.innerHTML+=`<li>${c}</li>`;
  });
}

function addCategory(){
  if(!userData.categories.includes(newCategory.value)){
    userData.categories.push(newCategory.value);
    let users=getUsers(); users[currentUser]=userData; saveUsers(users);
    loadCategories();
  }
}

/* FILTER */
function applyMonthFilter(){
  activeMonth=monthFilter.value;
  updateSummary(); updateChart();
}

function filtered(){
  if(!activeMonth) return userData.expenses;
  return userData.expenses.filter(e=>e.date.startsWith(activeMonth));
}

/* SUMMARY */
function updateSummary(){
  let total=0,cats={};
  filtered().forEach(e=>{
    total+=e.amount;
    cats[e.category]=(cats[e.category]||0)+e.amount;
  });
  totalSpan.innerText=total.toFixed(2);
  summary.innerHTML="";
  for(let c in cats){
    summary.innerHTML+=`<li>${c}: RM ${cats[c]}</li>`;
  }
}

/* CHART */
function updateChart(){
  let cats={};
  filtered().forEach(e=>cats[e.category]=(cats[e.category]||0)+e.amount);
  if(chart) chart.destroy();
  chart=new Chart(expenseChart,{
    type:"pie",
    data:{labels:Object.keys(cats),datasets:[{data:Object.values(cats)}]},
    options:{animation:{duration:1200}}
  });
}

/* ACTIVITY */
function loadActivityLog(){
  activityLog.innerHTML="";
  (userData.activity||[]).slice().reverse().forEach(a=>{
    activityLog.innerHTML+=`<li>${a.time} – ${a.action}</li>`;
  });
}

/* ADMIN */
function loadAdminView(){
  let users=getUsers();
  adminData.innerHTML="";
  for(let u in users){
    let t=users[u].expenses.reduce((s,e)=>s+e.amount,0);
    adminData.innerHTML+=`<p>${u} (${users[u].role}) – RM ${t}</p>`;
  }
}

/* EXPORT */
function exportCSV(){
  let csv="Date,Category,Amount\n";
  userData.expenses.forEach(e=>csv+=`${e.date},${e.category},${e.amount}\n`);
  let a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv]));
  a.download="expenses.csv";
  a.click();
}
function exportPDF(){ window.print(); }

/* DARK MODE */
function toggleDarkMode(){
  document.body.classList.toggle("dark");
  localStorage.setItem("dark",document.body.classList.contains("dark"));
}
