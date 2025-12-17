// --- 1. OOP & Design Pattern: Transaction Factory ---
class Transaction {
    constructor(id, desc, amount, type, category, date) {
        this.id = id;
        this.desc = desc;
        this.amount = parseFloat(amount);
        this.type = type; // 'income' or 'expense'
        this.category = category;
        this.date = date;
    }
}

// Factory Pattern: Centralized creation of objects
class TransactionFactory {
    static create(desc, amount, type, category) {
        const id = Date.now();
        const date = new Date().toLocaleDateString();
        return new Transaction(id, desc, amount, type, category, date);
    }
}

// --- 2. Main Application Class (Singleton Logic) ---
class ExpenseTrackerApp {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.chartInstance = null;
        this.currentUser = sessionStorage.getItem('user');
        
        // Router: Check if on login page or dashboard
        if (document.getElementById('loginForm')) {
            this.initLogin();
        } else if (document.getElementById('transactionForm')) {
            if (!this.currentUser) window.location.href = 'index.html'; // Protect route
            this.initDashboard();
        }
    }

    // --- Login Logic ---
    initLogin() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;
            const role = document.querySelector('input[name="role"]:checked').value;

            // Simple validation simulation
            if (pass.length > 0) {
                sessionStorage.setItem('user', user);
                sessionStorage.setItem('role', role);
                window.location.href = 'dashboard.html';
            } else {
                document.getElementById('errorMsg').innerText = "Invalid credentials";
            }
        });
    }

    // --- Dashboard Logic ---
    initDashboard() {
        document.getElementById('userDisplay').innerText = `Hi, ${this.currentUser}`;
        this.updateUI();

        // Add Transaction Event
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const desc = document.getElementById('desc').value;
            const amount = document.getElementById('amount').value;
            const type = document.getElementById('type').value;
            const category = document.getElementById('category').value;

            // Use Factory to create object
            const newTrans = TransactionFactory.create(desc, amount, type, category);
            this.transactions.push(newTrans);
            this.saveData();
            this.updateUI();
            e.target.reset();
        });

        // Dark Mode Toggle
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'index.html';
        });
    }

    saveData() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveData();
        this.updateUI();
    }

    // --- UI Updates & Calculations ---
    updateUI() {
        const list = document.getElementById('transactionList');
        list.innerHTML = '';
        
        let income = 0, expense = 0;

        this.transactions.forEach(t => {
            const item = document.createElement('li');
            item.classList.add(t.type === 'income' ? 'plus' : 'minus');
            item.innerHTML = `
                ${t.desc} <small>(${t.category})</small> 
                <span>${t.type === 'income' ? '+' : '-'}$${Math.abs(t.amount)}</span>
                <button onclick="app.deleteTransaction(${t.id})" style="background:none; color:red; width:auto;"><i class="fas fa-trash"></i></button>
            `;
            list.appendChild(item);

            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });

        document.getElementById('totalIncome').innerText = `$${income.toFixed(2)}`;
        document.getElementById('totalExpense').innerText = `$${expense.toFixed(2)}`;
        document.getElementById('netBalance').innerText = `$${(income - expense).toFixed(2)}`;

        this.renderChart(income, expense);
    }

    renderChart(income, expense) {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        if (this.chartInstance) this.chartInstance.destroy();
        
        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Income', 'Expense'],
                datasets: [{
                    data: [income, expense],
                    backgroundColor: ['#2ecc71', '#e74c3c']
                }]
            }
        });
    }

    // --- Feature: Export CSV ---
    exportCSV() {
        let csvContent = "data:text/csv;charset=utf-8,ID,Description,Amount,Type,Date\n";
        this.transactions.forEach(t => {
            csvContent += `${t.id},${t.desc},${t.amount},${t.type},${t.date}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "expenses.csv");
        document.body.appendChild(link);
        link.click();
    }

    // --- Feature: Notification Simulation ---
    simulateNotify(method) {
        alert(`Request sent! Your ${method} report is being generated and sent to ${this.currentUser}@example.com`);
    }
}

// Initialize App
const app = new ExpenseTrackerApp();
