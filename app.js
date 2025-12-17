// Smart Expense Tracker - client-side single-file app
// LocalStorage keys
const LS_USERS = 'se_users';
const LS_TX = 'se_transactions';
const LS_CATS = 'se_categories';
const LS_ACT = 'se_activity';
const LS_SESSION = 'se_session';
const LS_THEME = 'se_theme';

// Basic helpers
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ---------- UTIL: crypto hash (SHA-256) for demo password hashing ---------- */
async function hashString(str){
  const enc = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

/* ---------- Storage helpers ---------- */
function read(key, fallback){
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}
function write(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

/* ---------- Init seed data ---------- */
function seed(){
  if(!read(LS_USERS, null)){
    const admin = {username:'admin', passHash: null, role:'admin', created:new Date().toISOString()};
    // default admin password: admin123 (hashed)
    hashString('admin123').then(h => {
      admin.passHash = h;
      write(LS_USERS, [admin]);
    });
  }
  if(!read(LS_CATS, null)){
    write(LS_CATS, ['Food','Transport','Bills','Shopping','Other']);
  }
  if(!read(LS_TX, null)){
    write(LS_TX, []);
  }
  if(!read(LS_ACT, null)){
    write(LS_ACT, []);
  }
}

/* ---------- Activity log ---------- */
function logActivity(msg){
  const list = read(LS_ACT, []);
  list.unshift({t:new Date().toISOString(), msg});
  write(LS_ACT, list.slice(0,200));
  renderActivity();
}

/* ---------- Auth & UI ---------- */
const session = {
  user:null,
  async login(username, password){
    const users = read(LS_USERS, []);
    const h = await hashString(password);
    const u = users.find(x => x.username === username && x.passHash === h);
    if(u){ this.user = u; write(LS_SESSION, {username:u.username}); logActivity(`User logged in: ${u.username}`); return true; }
    return false;
  },
  logout(){
    this.user = null;
    localStorage.removeItem(LS_SESSION);
    logActivity('User logged out');
  },
  restore(){
    const s = read(LS_SESSION, null);
    if(s){
      const users = read(LS_USERS, []);
      const u = users.find(x => x.username === s.username);
      if(u) this.user = u;
    }
  }
};

/* ---------- UI Renderers ---------- */
function setView(v){
  // hide all pages
  $$('.page, #view-content > div').forEach(el => el.hidden = true);
  if(v === 'auth'){
    $('#view-auth').hidden = false;
    $('#view-dashboard').hidden = true;
  } else {
    $('#view-auth').hidden = true;
    $('#view-dashboard').hidden = false;
    // show specific inner view
    $$('#view-content > div').forEach(el => el.hidden = true);
    const inner = $(`#${v}`);
    if(inner) inner.hidden = false;
  }
}

function renderActivity(){
  const list = read(LS_ACT, []);
  const ul = $('#activityList');
  ul.innerHTML = list.slice(0,50).map(a => `<li><small class="muted">${new Date(a.t).toLocaleString()}</small><br/>${a.msg}</li>`).join('');
}

function renderCategories(){
  const cats = read(LS_CATS, []);
  const sel = $('#txCategory');
  sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  const list = $('#categoryList');
  list.innerHTML = cats.map((c, i) => `<li>${c} <button data-i="${i}" class="small">Delete</button></li>`).join('');
}

function renderUsersAdmin(){
  const users = read(LS_USERS, []);
  const html = `<tr><th>Username</th><th>Role</th><th>Created</th></tr>` + users.map(u => `<tr><td>${u.username}</td><td>${u.role}</td><td>${new Date(u.created).toLocaleString()}</td></tr>`).join('');
  $('#adminUsers').innerHTML = html;
}

function renderTransactions(filterMonth){
  const txs = read(LS_TX, []);
  let filtered = txs;
  if(filterMonth){
    const [y,m] = filterMonth.split('-');
    filtered = txs.filter(t => {
      const d = new Date(t.date);
      return (d.getFullYear() === parseInt(y) && (d.getMonth()+1) === parseInt(m));
    });
  }
  const table = $('#txTable');
  const rows = filtered.map(t => `<tr><td>${new Date(t.date).toLocaleDateString()}</td><td>${t.category}</td><td>${t.desc||''}</td><td>${t.amount.toFixed(2)}</td><td><button data-id="${t.id}" class="small">Del</button></td></tr>`).join('');
  table.innerHTML = `<tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th></th></tr>` + rows;
  renderChart(filtered);
}

/* ---------- Chart ---------- */
let chart = null;
function renderChart(txs){
  const cats = read(LS_CATS, []);
  // aggregate by category
  const sums = {};
  (txs || read(LS_TX, [])).forEach(t => sums[t.category] = (sums[t.category]||0) + Math.abs(t.amount));
  const labels = Object.keys(sums);
  const data = labels.map(l => sums[l]);
  const ctx = document.getElementById('chartSpending').getContext('2d');
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {labels, datasets:[{data}]},
    options: {animation:{duration:700}}
  });
}

/* ---------- CSV & PDF Export ---------- */
function exportCSV(txs){
  const rows = [['Date','Category','Description','Amount']];
  txs.forEach(t => rows.push([t.date, t.category, `"${(t.desc||'').replace(/"/g,'""')}"`, t.amount]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  logActivity('Exported CSV');
}

function exportPDF(txs){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text('Transactions', 14, 20);
  let y = 28;
  doc.setFontSize(10);
  txs.forEach(t => {
    doc.text(`${new Date(t.date).toLocaleDateString()} | ${t.category} | ${t.desc || ''} | ${t.amount.toFixed(2)}`, 14, y);
    y += 6; if(y>280){ doc.addPage(); y=20; }
  });
  doc.save(`transactions_${new Date().toISOString().slice(0,10)}.pdf`);
  logActivity('Exported PDF');
}

/* ---------- Event wiring ---------- */
function setupEvents(){
  // Auth forms
  $('#formRegister').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = $('#regUser').value.trim();
    const p = $('#regPass').value;
    const role = $('#regRole').value;
    if(!u || !p) return alert('username & password required');
    const users = read(LS_USERS, []);
    if(users.find(x=>x.username===u)) return alert('username exists');
    const h = await hashString(p);
    users.push({username:u, passHash:h, role, created:new Date().toISOString()});
    write(LS_USERS, users);
    logActivity(`User registered: ${u} (${role})`);
    alert('Created. You can login now.');
    $('#regUser').value=''; $('#regPass').value='';
  });

  $('#formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = $('#loginUser').value.trim();
    const p = $('#loginPass').value;
    const ok = await session.login(u,p);
    if(ok){ afterLogin(); } else alert('Invalid credentials');
  });

  $('#btnShowRegister').addEventListener('click', () => {
    document.getElementById('regUser').focus();
  });

  // password strength feedback
  $('#regPass').addEventListener('input', (e) => {
    const s = strength(e.target.value);
    $('#pwStrength').textContent = s;
  });

  // logout
  $('#btnLogout').addEventListener('click', () => {
    session.logout();
    updateUI();
    setView('auth');
  });

  // navigation
  $$('.nav-btn').forEach(b => b.addEventListener('click', () => {
    const view = b.getAttribute('data-view');
    setView(view === 'dashboard-home' ? 'dashboard-home' : view);
    if(view === 'transactions') renderTransactions($('#filterMonth').value);
  }));

  // add transaction
  $('#formAddTx').addEventListener('submit', (e) => {
    e.preventDefault();
    const amt = parseFloat($('#txAmount').value);
    const cat = $('#txCategory').value;
    const date = $('#txDate').value;
    const desc = $('#txDesc').value;
    if(!amt || !date) return alert('amount & date required');
    const txs = read(LS_TX, []);
    const tx = {id:crypto.randomUUID(), amount:amt, category:cat, date, desc};
    txs.push(tx); write(LS_TX, txs);
    logActivity(`Added tx ${amt} to ${cat}`);
    renderTransactions($('#filterMonth').value);
    $('#formAddTx').reset();
  });

  // delete transaction
  $('#txTable').addEventListener('click', (e) => {
    if(e.target.matches('button[data-id]')){
      const id = e.target.getAttribute('data-id');
      let txs = read(LS_TX, []);
      txs = txs.filter(t=>t.id!==id);
      write(LS_TX, txs);
      logActivity('Transaction deleted');
      renderTransactions($('#filterMonth').value);
    }
  });

  // filters & export buttons
  $('#btnFilter').addEventListener('click', () => renderTransactions($('#filterMonth').value));
  $('#btnClearFilter').addEventListener('click', () => { $('#filterMonth').value = ''; renderTransactions(); });

  $('#btnExportCSV').addEventListener('click', () => exportCSV(read(LS_TX, [])));
  $('#btnExportPDF').addEventListener('click', () => exportPDF(read(LS_TX, [])));

  // categories
  $('#formCategory').addEventListener('submit', (e) => {
    e.preventDefault();
    const cat = $('#newCategory').value.trim();
    if(!cat) return;
    const cats = read(LS_CATS, []);
    if(cats.includes(cat)) return alert('exists');
    cats.push(cat); write(LS_CATS, cats);
    logActivity(`Category added: ${cat}`);
    $('#newCategory').value='';
    renderCategories();
  });

  $('#categoryList').addEventListener('click', (e) => {
    if(e.target.matches('button[data-i]')){
      const i = parseInt(e.target.getAttribute('data-i'));
      const cats = read(LS_CATS, []);
      const removed = cats.splice(i,1);
      write(LS_CATS, cats);
      logActivity(`Category removed: ${removed[0]}`);
      renderCategories();
    }
  });

  // admin nav visibility
  $('#navAdmin').addEventListener('click', () => { renderUsersAdmin(); setView('admin'); });

  // toggle theme
  $('#btnToggleTheme').addEventListener('click', toggleTheme);
}

/* ---------- Password strength (very basic) ---------- */
function strength(pw){
  if(!pw) return '';
  const score = (pw.length>7) + (/[A-Z]/.test(pw)) + (/[0-9]/.test(pw)) + (/[^A-Za-z0-9]/.test(pw));
  return ['Very weak','Weak','Okay','Good','Strong'][score];
}

/* ---------- Theme ---------- */
function toggleTheme(){
  const cur = read(LS_THEME, 'light');
  const next = cur === 'light' ? 'dark' : 'light';
  applyTheme(next);
  write(LS_THEME, next);
}
function applyTheme(t){
  if(t === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
}

/* ---------- After login UI update ---------- */
function updateUI(){
  const label = $('#currentUserLabel');
  if(session.user){
    label.textContent = `${session.user.username} (${session.user.role})`;
    $('#btnLogout').hidden = false;
    // admin nav show/hide
    $('#navAdmin').style.display = session.user.role === 'admin' ? 'inline-block' : 'none';
  } else {
    label.textContent = '';
    $('#btnLogout').hidden = true;
    $('#navAdmin').style.display = 'none';
  }
}

function afterLogin(){
  updateUI();
  renderCategories();
  renderTransactions();
  renderActivity();
  setView('dashboard-home');
}

/* ---------- Boot ---------- */
(async function boot(){
  seed();
  setupEvents();
  // apply saved theme
  applyTheme(read(LS_THEME, 'light'));
  // restore session
  session.restore();
  updateUI();
  if(session.user){
    afterLogin();
  } else {
    setView('auth');
  }
})();
