const households = [
  { name: "House 1", usage: 120, status: "Normal", alert: "None" },
  { name: "House 2", usage: 200, status: "Leak", alert: "Leak Detected" },
  { name: "House 3", usage: 90, status: "Low Tank", alert: "Low Level" }
];

function loadHouseholds() {
  const table = document.getElementById("householdTable");
  households.forEach(h => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${h.name}</td>
      <td>${h.usage}</td>
      <td>${h.status}</td>
      <td>${h.alert}</td>
    `;
    table.appendChild(row);
  });
}

function scheduleRelease() {
  alert("Water release scheduled for House 2 at 6am.");
}

function triggerValve() {
  alert("Shutoff valve triggered for House 2.");
}

loadHouseholds();
