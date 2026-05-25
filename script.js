const currentUsageEl = document.getElementById('currentUsage');
const usageTimestampEl = document.getElementById('usageTimestamp');
const usageTrendEl = document.getElementById('usageTrend');
const alertContent = document.getElementById('alertContent');
const paymentBtn = document.getElementById('paymentBtn');
const simulateLeakBtn = document.getElementById('simulateLeak');
const feedbackForm = document.getElementById('feedbackForm');
const feedbackMessage = document.getElementById('feedbackMessage');

const trendData = [18, 22, 20, 24, 19, 23, 21];
const trendDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderTrend() {
  if (!usageTrendEl) return;
  usageTrendEl.innerHTML = trendDays.map((day, index) => {
    const value = trendData[index] || 0;
    return `<li><span>${day}</span><strong>${value} L</strong></li>`;
  }).join('');
}

function updateUsage() {
  const lastValue = trendData[trendData.length - 1];
  const nextValue = Math.max(8, Math.min(28, lastValue + (Math.random() * 6 - 3)));
  trendData.push(Math.round(nextValue));
  if (trendData.length > trendDays.length) {
    trendData.shift();
  }

  if (currentUsageEl) {
    currentUsageEl.textContent = `${nextValue.toFixed(1)} L / hr`;
  }
  if (usageTimestampEl) {
    usageTimestampEl.textContent = formatTime(new Date());
  }

  renderTrend();
}

function showLeakAlert() {
  if (!alertContent) return;
  alertContent.classList.remove('alert-clear');
  alertContent.classList.add('alert-warning');
  alertContent.innerHTML = `
    <p class="alert-state">Leak detected on household meter 04B7. Flow spike detected at ${formatTime(new Date())}.</p>
    <p class="subtext">An alert has been sent to the community support team for verification.</p>
  `;
}

if (simulateLeakBtn) {
  simulateLeakBtn.addEventListener('click', showLeakAlert);
}

if (paymentBtn) {
  paymentBtn.addEventListener('click', () => {
    window.alert('Mobile Money payment placeholder: integration is ready for the next step.');
  });
}

if (feedbackForm) {
  feedbackForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('name').value.trim();
    if (feedbackMessage) {
      feedbackMessage.textContent = `Thank you, ${name || 'pilot user'}! Your feedback has been received.`;
      feedbackMessage.classList.remove('hidden');
    }
    feedbackForm.reset();
  });
}

renderTrend();
updateUsage();
setInterval(updateUsage, 5000);
setTimeout(showLeakAlert, 9000);

const addHouseholdBtn = document.getElementById('addHouseholdBtn');
const viewReportsBtn = document.getElementById('viewReportsBtn');
const refreshAlertsBtn = document.getElementById('refreshAlertsBtn');
const householdContainer = document.getElementById('householdContainer');
const householdReports = document.getElementById('householdReports');
const systemAlertsEl = document.getElementById('systemAlerts');

const adminHouseholds = [
  { name: 'Household A', usageHistory: [120, 130, 115, 140], status: 'Normal', alert: 'None' },
  { name: 'Household B', usageHistory: [200, 215, 190, 230], status: 'High Usage', alert: 'Review' },
  { name: 'Household C', usageHistory: [85, 95, 88, 92], status: 'Low Tank', alert: 'Low Level' }
];

const adminAlerts = [
  'Leak detected in Bathroom of Household A',
  'High usage in Household B',
  'Low tank level at Household C',
  'Pressure spike detected in Household D',
  'Valve inspection recommended for Household E'
];

function renderHouseholdList() {
  if (!householdContainer) return;
  if (adminHouseholds.length === 0) {
    householdContainer.innerHTML = '<p>No households have been added yet.</p>';
    return;
  }

  const list = document.createElement('div');
  list.innerHTML = adminHouseholds.map(h => `
    <div class="placeholder-box" style="margin-bottom: 12px;">
      <strong>${h.name}</strong>
      <p class="subtext">Status: ${h.status} • Latest usage: ${h.usageHistory.slice(-1)[0]} L</p>
    </div>
  `).join('');

  householdContainer.innerHTML = '<p><strong>Household list</strong></p>';
  householdContainer.appendChild(list);
}

function viewReports() {
  if (!householdReports) return;
  if (adminHouseholds.length === 0) {
    householdReports.innerHTML = '<p>No households available for reports.</p>';
    return;
  }

  householdReports.innerHTML = adminHouseholds.map(h => {
    const average = Math.round(h.usageHistory.reduce((sum, value) => sum + value, 0) / h.usageHistory.length);
    return `
      <div class="placeholder-box" style="margin-bottom: 12px;">
        <strong>${h.name}</strong>
        <p class="subtext">Average usage: ${average} L • History: ${h.usageHistory.join(' L, ')} L</p>
      </div>
    `;
  }).join('');
}

function getRandomAlert() {
  return adminAlerts[Math.floor(Math.random() * adminAlerts.length)];
}

function simulateSystemAlerts() {
  if (!systemAlertsEl) return;
  const alertText = getRandomAlert();
  systemAlertsEl.innerHTML = `
    <p class="alert-state">${alertText}</p>
    <p class="subtext">Updated at ${formatTime(new Date())}</p>
  `;
}

function addHousehold() {
  const name = window.prompt('Enter new household name:');
  if (!name) return;

  const usageBase = Math.round(70 + Math.random() * 140);
  adminHouseholds.push({
    name: name.trim(),
    usageHistory: [usageBase, usageBase + 10, usageBase - 5, usageBase + 8],
    status: 'Normal',
    alert: 'None'
  });
  renderHouseholdList();
  viewReports();
}

if (addHouseholdBtn) {
  addHouseholdBtn.addEventListener('click', addHousehold);
}

if (viewReportsBtn) {
  viewReportsBtn.addEventListener('click', viewReports);
}

if (refreshAlertsBtn) {
  refreshAlertsBtn.addEventListener('click', simulateSystemAlerts);
}

renderHouseholdList();
simulateSystemAlerts();
setInterval(() => {
  simulateSystemAlerts();
}, 10000);
