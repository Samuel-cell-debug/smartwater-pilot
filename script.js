// Dark mode toggle
document.getElementById("darkToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Chart.js setup
const ctx = document.getElementById('waterChart').getContext('2d');
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

document.getElementById('darkModeToggle').addEventListener('change', function() {
  document.body.classList.toggle('dark-mode');
});

document.getElementById('feedbackForm').addEventListener('submit', function(e) {
  e.preventDefault();
  alert('Thank you for your feedback!');
});