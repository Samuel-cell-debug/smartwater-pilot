function updateTankLevel(level) {
  try {
    const fill = document.getElementById("tankFill");
    const label = document.getElementById("tankPercent");

    fill.style.height = `${level}%`;
    label.textContent = `${level}% Full`;
  } catch (error) {
    console.error("Tank update failed:", error);
  }
}

function simulateLeak() {
  const leakDetected = Math.random() < 0.2;
  const alertBox = document.getElementById("leakAlert");

  alertBox.classList.toggle("hidden", !leakDetected);
}

function simulateUpdate() {
  const randomLevel = Math.floor(Math.random() * 101);
  updateTankLevel(randomLevel);
  simulateLeak();
}
