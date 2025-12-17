// --- 1. OOP & Design Pattern: Transaction Factory ---
class Transaction {
    constructor(id, desc, amount, type, category, date) {
        this.id = id;
        this.desc = desc;
        this.amount = parseFloat(amount);
        this.type = type; 
        this.category = category;
        this.date = date;
    }
}

class TransactionFactory {
    static create(desc, amount, type, category) {
        const id = Date.now();
        const date = new Date().toLocaleDateString();
        return new Transaction(id, desc, amount, type, category, date);
    }
}

// --- 2. Main Application Class ---
class ExpenseTrackerApp {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.chartInstance = null;
        this.currentUser = sessionStorage.getItem('user') || 'Guest';

        // Icon Mapping based on Category
        this.categoryIcons = {
            'Food': 'fa-utensils',
            'Transport': 'fa-car',
            'Shopping': 'fa-shopping-bag',
            'Bills': 'fa-file-invoice-dollar',
            'Salary': 'fa-money-bill-wave',
            'Health': 'fa-heartbeat',
            'Other': 'fa-circle'
        };

        // Initialize UI if on Dashboard
        if (document.getElementById('transactionList')) {
            this.initDashboard();
        }
    }

    initDashboard() {
        document.getElementById('userDisplay').innerText = this.currentUser;
        this.updateUI();

        // Handle Form Submit
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const desc = document.getElementById('desc').value;
            const amount = document.getElementById('amount').value;
            const category = document.getElementById('category').value;
            
            // Get Radio Value
            const type = document.querySelector('input[name="type"]:checked').value;

            if(amount <= 0) {
                this.showToast('Please enter a valid amount');
                return;
            }

            const newTrans = TransactionFactory.create(desc, amount, type, category);
            this.transactions.unshift(newTrans); // Add to top of list
            this.saveData();
            this.updateUI();
            
            e.target.reset();
            this.toggleModal(false);
            this.showToast('Transaction added successfully!');
        });

        // Dark Mode
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }

    saveData() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    deleteTransaction(id) {
        if(confirm("Delete this transaction?")) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveData();
            this.updateUI();
            this.showToast('Transaction deleted');
        }
    }

    toggleModal(show) {
        const modal = document.getElementById('transactionModal');
        if(show) modal.classList.add('active');
        else modal.classList.remove('active');
    }

    showToast(message) {
        const box = document.getElementById('toastBox');
        const toast = document.createElement('div');
        toast.classList.add('toast');
        toast.innerText = message;
        box.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    updateUI() {
        const list = document.getElementById('transactionList');
        list.innerHTML = '';
        
        let income = 0, expense = 0;
        let categoryData = {};

        this.transactions.forEach(t => {
            // Logic for totals
            if (t.type === 'income') income += t.amount;
            else {
                expense += t.amount;
                // Logic for Chart Data (Expenses only)
                categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
            }

            // Create List Item
            const item = document.createElement('li');
            const iconClass = this.categoryIcons[t.category] || 'fa-circle';
            
            item.innerHTML = `
                <div class="t-left">
                    <div class="cat-icon" style="color: ${t.type === 'income' ? '#00b894' : '#6C63FF'}">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="t-details">
                        <h4>${t.desc}</h4>
                        <small>${t.date} • ${t.category}</small>
                    </div>
                </div>
                <div class="t-right">
                    <span class="t-amount ${t.type === 'income' ? 'inc' : 'exp'}">
                        ${t.type === 'income' ? '+' : '-'}$${Math.abs(t.amount).toFixed(2)}
                    </span>
                    <i class="fas fa-trash" style="margin-left:10px; color:#ff7675; cursor:pointer;" onclick="app.deleteTransaction(${t.id})"></i>
                </div>
            `;
            list.appendChild(item);
        });

        // Update Balance Cards
        document.getElementById('totalIncome').innerText = `$${income.toFixed(2)}`;
        document.getElementById('totalExpense').innerText = `$${expense.toFixed(2)}`;
        document.getElementById('netBalance').innerText = `$${(income - expense).toFixed(2)}`;

        this.renderChart(categoryData);
    }

    renderChart(dataObj) {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        const labels = Object.keys(dataObj);
        const data = Object.values(dataObj);

        if (this.chartInstance) this.chartInstance.destroy();

        if(labels.length === 0) {
            // Empty State
            return; 
        }
        
        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#6C63FF', '#FF7675', '#FDCB6E', '#00b894', '#0984e3'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%', // Makes it look like the thin ring in your screenshot
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true } }
                }
            }
        });
    }

    exportCSV() {
        let csvContent = "data:text/csv;charset=utf-8,Date,Description,Category,Type,Amount\n";
        this.transactions.forEach(t => {
            csvContent += `${t.date},${t.desc},${t.category},${t.type},${t.amount}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "my_expenses.csv");
        document.body.appendChild(link);
        link.click();
    }
}

const app = new ExpenseTrackerApp();
