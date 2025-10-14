// Dark mode toggle

const darkToggleBtn = document.getElementById("darkToggle");
if (darkToggleBtn) {
  darkToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
  });
}

// Chart.js setup

const chartCanvas = document.getElementById('waterChart');
if (chartCanvas && window.Chart) {
  const ctx = chartCanvas.getContext('2d');
  const waterChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Water Usage (Liters)',
        data: [120, 90, 150, 80, 130, 100, 110],
        borderColor: '#0077cc',
        backgroundColor: 'rgba(0, 119, 204, 0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}


const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
  darkModeToggle.addEventListener('change', function() {
    document.body.classList.toggle('dark-mode');
  });
}


const feedbackForm = document.getElementById('feedbackForm');
if (feedbackForm) {
  feedbackForm.addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Thank you for your feedback!');
  });
}