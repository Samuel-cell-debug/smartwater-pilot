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
