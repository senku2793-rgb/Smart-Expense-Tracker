// =======================
// OOP: Expense Class
// =======================
class Expense {
  constructor(date, amount, category) {
    this.date = date;
    this.amount = amount;
    this.category = category;
  }
}

// =======================
// Model
// =======================
let expenses = [];
let chart;

// =======================
// Controller Functions
// =======================
function addExpense() {
  const date = document.getElementById("date").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const category = document.getElementById("category").value;

  if (!date || !amount) {
    alert("Please enter date and amount");
    return;
  }

  const expense = new Expense(date, amount, category);
  expenses.push(expense);

  updateSummary();
  updateChart();
}

// =======================
// View Updates
// =======================
function updateSummary() {
  let total = 0;
  let categoryTotals = {};

  expenses.forEach(e => {
    total += e.amount;
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  document.getElementById("total").innerText = total.toFixed(2);

  const summary = document.getElementById("summary");
  summary.innerHTML = "";

  for (let cat in categoryTotals) {
    const percent = ((categoryTotals[cat] / total) * 100).toFixed(1);
    summary.innerHTML += `<li>${cat}: RM ${categoryTotals[cat].toFixed(2)} (${percent}%)</li>`;
  }
}

// =======================
// Chart (Visualization)
// =======================
function updateChart() {
  let categoryTotals = {};

  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("expenseChart"), {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data
      }]
    }
  });
}
