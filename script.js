function showTrends() {
  alert("Usage trends coming soon!");
}

function viewLeakTips() {
  alert("Check pipes, taps, and report to support.");
}

// Simulate dynamic tank level
const tankFill = document.getElementById("tankFill");
const tankPercent = document.getElementById("tankPercent");

let level = 60;
tankFill.style.width = level + "%";
tankPercent.textContent = level + "% Full";

function simulateUsage() {
  const tankLevel = Math.floor(Math.random() * 100); // %
  const leakDetected = Math.random() < 0.1; // 10% chance

  document.getElementById("tankLevel").innerText = tankLevel + "%";
  document.getElementById("leakAlert").innerText = leakDetected ? "🚨 Leak Detected!" : "✅ No Leak";
}
setInterval(simulateUsage, 5000); // updates every 5 seconds
