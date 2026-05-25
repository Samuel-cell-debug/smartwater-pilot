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
