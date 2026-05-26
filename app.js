let householdData = [];

const defaultHouseholds = [
  { name: 'Household A', usageHistory: [18, 22, 20, 24, 19, 23, 21], status: 'Normal', alert: 'None', size: 'Medium', monthlyQuota: 500, monthlyUsage: 0 },
  { name: 'Household B', usageHistory: [25, 28, 24, 30, 27, 29, 31], status: 'High Usage', alert: 'Review', size: 'Large', monthlyQuota: 700, monthlyUsage: 0 },
  { name: 'Household C', usageHistory: [12, 14, 13, 15, 14, 13, 16], status: 'Low Tank', alert: 'Low Level', size: 'Small', monthlyQuota: 300, monthlyUsage: 0 }
];

let systemAlertsHistory = [];
let feedbackHistory = [];
let leakEvents = [];  // Track active and historical leak events

const defaultAlerts = [
  'Leak detected in Bathroom of Household A',
  'High usage in Household B',
  'Low tank level at Household C',
  'Pressure spike detected in Household D',
  'Valve inspection recommended for Household E'
];

const dashboardAlerts = defaultAlerts;

// ============ Tiered Usage & Tariff Configuration ============

/**
 * Tariff rates based on usage tier (per gallon)
 * Tier 1 (0-100%): Standard rate
 * Tier 2 (100-150%): 1.5x multiplier (overage at 50%)
 * Tier 3 (150%+): 2.0x multiplier (overage at 100%)
 */
const tariffRates = {
  standard: 0.05,     // $0.05 per gallon
  tier2Multiplier: 1.5,
  tier3Multiplier: 2.0,
  warningThreshold: 0.80  // Alert at 80% of quota
};

/**
 * Household size to default quota mapping (gallons/month)
 */
const quotaBySize = {
  'Small': 300,
  'Medium': 500,
  'Large': 700,
  'Extra Large': 1000
};

/**
 * Calculate total usage from usage history (in liters, converted to gallons)
 * Note: 1 gallon ≈ 3.785 liters
 */
function calculateTotalUsage(usageHistory) {
  const totalLiters = usageHistory.reduce((sum, val) => sum + val, 0);
  return Math.round(totalLiters / 3.785);  // Convert to gallons
}

/**
 * Calculate monthly usage for a household
 */
function calculateMonthlyUsage(household) {
  return calculateTotalUsage(household.usageHistory);
}

/**
 * Get quota usage percentage (0-100+)
 */
function getQuotaPercentage(household) {
  if (household.monthlyQuota === 0) return 0;
  const usage = calculateMonthlyUsage(household);
  return Math.round((usage / household.monthlyQuota) * 100);
}

/**
 * Determine tariff tier and multiplier for a household
 */
function getTariffTier(household) {
  const percentage = getQuotaPercentage(household);
  if (percentage <= 100) {
    return { tier: 1, multiplier: 1.0, name: 'Standard' };
  } else if (percentage <= 150) {
    return { tier: 2, multiplier: tariffRates.tier2Multiplier, name: 'Overage Tier 1' };
  } else {
    return { tier: 3, multiplier: tariffRates.tier3Multiplier, name: 'Overage Tier 2' };
  }
}

/**
 * Calculate estimated monthly bill for a household
 */
function calculateMonthlyBill(household) {
  const usage = calculateMonthlyUsage(household);
  const percentage = getQuotaPercentage(household);
  
  if (percentage <= 100) {
    // All usage at standard rate
    return Math.round(usage * tariffRates.standard * 100) / 100;
  }
  
  // Split between standard and overage tiers
  const standardUsage = household.monthlyQuota;
  let overageUsage = usage - standardUsage;
  let bill = standardUsage * tariffRates.standard;
  
  if (percentage <= 150) {
    // Tier 2 overage
    bill += overageUsage * tariffRates.standard * tariffRates.tier2Multiplier;
  } else {
    // Tier 2 + Tier 3
    const tier2Limit = household.monthlyQuota * 0.5;  // 50% overage
    const tier2Usage = Math.min(overageUsage, tier2Limit);
    const tier3Usage = overageUsage - tier2Usage;
    
    bill += tier2Usage * tariffRates.standard * tariffRates.tier2Multiplier;
    bill += tier3Usage * tariffRates.standard * tariffRates.tier3Multiplier;
  }
  
  return Math.round(bill * 100) / 100;
}

/**
 * Get warning message if household is near or exceeds quota
 */
function getQuotaWarning(household) {
  const percentage = getQuotaPercentage(household);
  
  if (percentage >= 150) {
    return `⚠️ CRITICAL: ${percentage}% of quota exceeded (Tier 3 rates applied)`;
  } else if (percentage >= 100) {
    return `⚠️ WARNING: ${percentage}% of quota exceeded (Tier 2 rates applied)`;
  } else if (percentage >= tariffRates.warningThreshold * 100) {
    return `⚠️ CAUTION: ${percentage}% of quota used`;
  }
  return null;
}

/**
 * Adjust household quota (admin function)
 */
function adjustHouseholdQuota(householdIndex, newQuota) {
  if (householdIndex < 0 || householdIndex >= householdData.length) {
    console.error('Invalid household index');
    return false;
  }
  
  if (newQuota <= 0) {
    console.error('Quota must be positive');
    return false;
  }
  
  householdData[householdIndex].monthlyQuota = newQuota;
  saveHouseholds();
  return true;
}

/**
 * Adjust household size (admin function)
 */
function adjustHouseholdSize(householdIndex, newSize) {
  if (householdIndex < 0 || householdIndex >= householdData.length) {
    console.error('Invalid household index');
    return false;
  }
  
  if (!quotaBySize.hasOwnProperty(newSize)) {
    console.error('Invalid size. Choose from: ' + Object.keys(quotaBySize).join(', '));
    return false;
  }
  
  householdData[householdIndex].size = newSize;
  householdData[householdIndex].monthlyQuota = quotaBySize[newSize];
  saveHouseholds();
  return true;
}

// ============ End Tiered Usage Configuration ============

// ============ Leak Detection & Management ============

/**
 * Common leak locations for randomization
 */
const leakLocations = [
  'Bathroom',
  'Kitchen',
  'Toilet',
  'Washing Machine',
  'Garden Hose',
  'Water Meter',
  'Basement Pipe'
];

/**
 * Randomly trigger a leak event for a household
 * Returns leak event object or null if no leak triggered
 */
function detectLeakEvent() {
  // 30% chance to detect a leak in any cycle
  if (Math.random() > 0.30) return null;

  // Pick a random household
  if (householdData.length === 0) return null;
  
  const householdIndex = Math.floor(Math.random() * householdData.length);
  const randomHousehold = householdData[householdIndex];
  
  // Check if household already has active leak
  const existingLeak = getActiveLeakForHousehold(householdIndex);
  if (existingLeak) return null;  // Don't create duplicate
  
  // Create new leak event
  const leakLocation = leakLocations[Math.floor(Math.random() * leakLocations.length)];
  const leakEvent = {
    id: `leak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    householdIndex,
    householdName: randomHousehold.name,
    location: leakLocation,
    severity: ['Minor', 'Moderate', 'Severe'][Math.floor(Math.random() * 3)],
    detectedAt: new Date().toISOString(),
    detectedTime: formatTime(new Date()),
    resolved: false,
    resolvedAt: null
  };

  leakEvents.push(leakEvent);
  saveLeaks();
  
  // Update household status
  updateHouseholdLeakStatus(householdIndex, leakEvent);
  
  return leakEvent;
}

function displayLeakNotification(leakEvent) {
  if (!alertContent) return;
  alertContent.classList.remove('alert-clear');
  alertContent.classList.add('alert-warning');
  alertContent.innerHTML = `
    <p class="alert-state">🚨 ${leakEvent.severity.toUpperCase()} leak detected in ${leakEvent.householdName}</p>
    <p class="subtext">Location: ${leakEvent.location} | Detected at ${leakEvent.detectedTime}</p>
    <p class="subtext">Use the admin panel to resolve this leak.</p>
  `;
  const alertTimestamp = formatTime(new Date());
  systemAlertsHistory.push({
    message: `Leak: ${leakEvent.householdName} - ${leakEvent.location}`,
    timestamp: new Date().toISOString(),
    displayTime: alertTimestamp
  });
  saveAlerts();
}

function resolveLeakAndRefresh(leakId) {
  if (resolveLeakEvent(leakId)) {
    renderHouseholdList();
    simulateSystemAlerts();
    if (alertContent) {
      alertContent.classList.remove('alert-warning');
      alertContent.classList.add('alert-clear');
      alertContent.innerHTML = `
        <p class="alert-state">Leak resolved.</p>
        <p class="subtext">The dashboard has been updated.</p>
      `;
    }
  }
}

function runLeakCheck() {
  const leakEvent = detectLeakEvent();
  if (leakEvent) {
    displayLeakNotification(leakEvent);
    renderHouseholdList();
    simulateSystemAlerts();
  }
}

/**
 * Get active leak for a specific household (if any)
 */
function getActiveLeakForHousehold(householdIndex) {
  return leakEvents.find(
    leak => leak.householdIndex === householdIndex && !leak.resolved
  );
}

/**
 * Update household status based on leak
 */
function updateHouseholdLeakStatus(householdIndex, leakEvent) {
  if (householdIndex >= 0 && householdIndex < householdData.length) {
    const household = householdData[householdIndex];
    if (leakEvent && !leakEvent.resolved) {
      household.status = `🚨 Leak: ${leakEvent.location}`;
      household.alert = `${leakEvent.severity} leak`;
    }
    saveHouseholds();
  }
}

/**
 * Resolve/clear a leak event by ID
 */
function resolveLeakEvent(leakId) {
  const leak = leakEvents.find(l => l.id === leakId);
  if (!leak) {
    console.error('Leak not found:', leakId);
    return false;
  }

  leak.resolved = true;
  leak.resolvedAt = new Date().toISOString();
  saveLeaks();

  // Update household status back to normal
  if (leak.householdIndex >= 0 && leak.householdIndex < householdData.length) {
    const household = householdData[leak.householdIndex];
    household.status = 'Normal';
    household.alert = 'None';
    saveHouseholds();
  }

  return true;
}

/**
 * Get all active leaks across all households
 */
function getActiveLeaks() {
  return leakEvents.filter(leak => !leak.resolved);
}

/**
 * Get leak alert messages for dashboard
 */
function generateLeakAlerts() {
  const activeLeaks = getActiveLeaks();
  
  if (activeLeaks.length === 0) return null;

  // Show most recent/severe leak
  const sortedLeaks = activeLeaks.sort((a, b) => {
    const severityRank = { 'Severe': 3, 'Moderate': 2, 'Minor': 1 };
    return (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
  });

  const leak = sortedLeaks[0];
  return {
    message: `🚨 ${leak.severity.toUpperCase()} LEAK DETECTED in ${leak.householdName}`,
    details: `Location: ${leak.location} | Detected at ${leak.detectedTime}`,
    leakId: leak.id,
    householdIndex: leak.householdIndex
  };
}

// ============ End Leak Detection ============


const usageTimestampEl = document.getElementById('usageTimestamp');
const usageTrendEl = document.getElementById('usageTrend');
const alertContent = document.getElementById('alertContent');
const simulateLeakBtn = document.getElementById('simulateLeak');
const paymentBtn = document.getElementById('paymentBtn');
const feedbackForm = document.getElementById('feedbackForm');
const feedbackMessage = document.getElementById('feedbackMessage');

const addHouseholdBtn = document.getElementById('addHouseholdBtn');
const viewReportsBtn = document.getElementById('viewReportsBtn');
const refreshAlertsBtn = document.getElementById('refreshAlertsBtn');
const householdContainer = document.getElementById('householdContainer');
const householdReports = document.getElementById('householdReports');
const systemAlertsEl = document.getElementById('systemAlerts');

// ============ localStorage Persistence Functions ============

/**
 * Save households to localStorage
 */
function saveHouseholds() {
  try {
    localStorage.setItem('smartwater_households', JSON.stringify(householdData));
  } catch (error) {
    console.error('Error saving households to localStorage:', error);
  }
}

/**
 * Load households from localStorage
 * Returns true if data was loaded, false if using defaults
 */
function loadHouseholds() {
  try {
    const stored = localStorage.getItem('smartwater_households');
    if (stored) {
      householdData = JSON.parse(stored);
      return true;
    }
  } catch (error) {
    console.error('Error loading households from localStorage:', error);
  }
  // Use defaults if nothing is stored or on error
  householdData = JSON.parse(JSON.stringify(defaultHouseholds));
  return false;
}

/**
 * Save feedback to localStorage
 */
function saveFeedback(feedback) {
  try {
    feedbackHistory.push({
      ...feedback,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('smartwater_feedback', JSON.stringify(feedbackHistory));
  } catch (error) {
    console.error('Error saving feedback to localStorage:', error);
  }
}

/**
 * Load feedback from localStorage
 */
function loadFeedback() {
  try {
    const stored = localStorage.getItem('smartwater_feedback');
    if (stored) {
      feedbackHistory = JSON.parse(stored);
      return true;
    }
  } catch (error) {
    console.error('Error loading feedback from localStorage:', error);
  }
  feedbackHistory = [];
  return false;
}

/**
 * Save system alerts to localStorage
 */
function saveAlerts() {
  try {
    localStorage.setItem('smartwater_alerts', JSON.stringify(systemAlertsHistory));
  } catch (error) {
    console.error('Error saving alerts to localStorage:', error);
  }
}

/**
 * Load alerts from localStorage
 */
function loadAlerts() {
  try {
    const stored = localStorage.getItem('smartwater_alerts');
    if (stored) {
      systemAlertsHistory = JSON.parse(stored);
      return true;
    }
  } catch (error) {
    console.error('Error loading alerts from localStorage:', error);
  }
  systemAlertsHistory = [];
  return false;
}

/**
 * Save leak events to localStorage
 */
function saveLeaks() {
  try {
    localStorage.setItem('smartwater_leaks', JSON.stringify(leakEvents));
  } catch (error) {
    console.error('Error saving leaks to localStorage:', error);
  }
}

/**
 * Load leak events from localStorage
 */
function loadLeaks() {
  try {
    const stored = localStorage.getItem('smartwater_leaks');
    if (stored) {
      leakEvents = JSON.parse(stored);
      return true;
    }
  } catch (error) {
    console.error('Error loading leaks from localStorage:', error);
  }
  leakEvents = [];
  return false;
}

/**
 * Clear all persisted data (for testing/reset)
 */
function clearAllStoredData() {
  try {
    localStorage.removeItem('smartwater_households');
    localStorage.removeItem('smartwater_feedback');
    localStorage.removeItem('smartwater_alerts');
    localStorage.removeItem('smartwater_leaks');
    householdData = JSON.parse(JSON.stringify(defaultHouseholds));
    feedbackHistory = [];
    systemAlertsHistory = [];
    leakEvents = [];
    console.log('All stored data cleared.');
  } catch (error) {
    console.error('Error clearing stored data:', error);
  }
}

// ============ End localStorage Functions ============


function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updateDashboardUsage() {
  if (!currentUsageEl && !usageTrendEl && !usageTimestampEl) return;

  const latestValues = householdData.map(h => h.usageHistory[h.usageHistory.length - 1] || 0);
  const averageUsage = latestValues.length
    ? Math.round(latestValues.reduce((sum, value) => sum + value, 0) / latestValues.length)
    : 0;

  if (currentUsageEl) {
    currentUsageEl.innerText = `${averageUsage} L / hr`;
  }

  if (usageTimestampEl) {
    usageTimestampEl.innerText = formatTime(new Date());
  }

  if (!usageTrendEl) return;

  const trendHousehold = householdData[0] || { usageHistory: [] };
  usageTrendEl.innerHTML = trendHousehold.usageHistory
    .map((value, index) => `<li><span>Day ${index + 1}</span><strong>${value} L</strong></li>`)
    .join('');
}

function triggerLeakAlert() {
  const leakEvent = detectLeakEvent();
  if (leakEvent) {
    displayLeakNotification(leakEvent);
    renderHouseholdList();
    simulateSystemAlerts();
    return;
  }

  if (!alertContent) return;
  const randomHouse = householdData[Math.floor(Math.random() * householdData.length)] || { name: 'Household', status: 'Unknown' };
  alertContent.classList.remove('alert-clear');
  alertContent.classList.add('alert-warning');
  alertContent.innerHTML = `
    <p class="alert-state">Leak detected in ${randomHouse.name}. Flow spike detected at ${formatTime(new Date())}.</p>
    <p class="subtext">An alert has been sent to the community support team for verification.</p>
  `;
}

function payWithMomo() {
  window.alert('Mobile Money payment placeholder: Mobile Money integration will be added soon.');
}

function handleFeedback(event) {
  event.preventDefault();
  const nameInput = document.getElementById('name');
  const messageInput = document.getElementById('message');
  const name = nameInput ? nameInput.value.trim() : 'Pilot user';
  const message = messageInput ? messageInput.value.trim() : '';

  // Save feedback to localStorage
  saveFeedback({
    name: name || 'Pilot user',
    message: message,
    date: new Date().toLocaleDateString()
  });

  if (feedbackMessage) {
    feedbackMessage.innerText = `Thank you, ${name || 'pilot user'}! Your feedback has been recorded.`;
    feedbackMessage.classList.remove('hidden');
  }

  if (feedbackForm) {
    feedbackForm.reset();
  }
}

function renderHouseholdList() {
  if (!householdContainer) return;

  if (householdData.length === 0) {
    householdContainer.innerHTML = '<p>No households have been added yet.</p>';
    return;
  }

  householdContainer.innerHTML = householdData
    .map((h, index) => {
      const quotaPercentage = getQuotaPercentage(h);
      const warning = getQuotaWarning(h);
      const tariff = getTariffTier(h);
      const monthlyUsage = calculateMonthlyUsage(h);
      const monthlyBill = calculateMonthlyBill(h);
      const activeLeak = getActiveLeakForHousehold(index);
      
      const quotaBar = `
        <div style="margin-top: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; height: 8px;">
          <div style="width: ${Math.min(quotaPercentage, 100)}%; background: ${quotaPercentage > 100 ? '#d32f2f' : '#4caf50'}; height: 100%;"></div>
        </div>
      `;

      const leakSection = activeLeak ? `
        <div style="margin-top: 12px; padding: 10px; background: #ffebee; border: 2px solid #d32f2f; border-radius: 4px;">
          <p style="color: #d32f2f; margin: 0 0 8px 0; font-weight: bold;">🚨 ${activeLeak.severity.toUpperCase()} LEAK DETECTED</p>
          <p style="color: #d32f2f; margin: 0 0 8px 0;">Location: ${activeLeak.location}</p>
          <p style="color: #d32f2f; margin: 0 0 8px 0; font-size: 0.9em;">Detected at ${activeLeak.detectedTime}</p>
          <button onclick="resolveLeakAndRefresh('${activeLeak.id}')" style="padding: 6px 12px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
            ✓ Resolve Leak
          </button>
        </div>
      ` : '';
      
      return `
        <div class="placeholder-box" style="margin-bottom: 12px; padding: 12px; border-left: 4px solid ${activeLeak ? '#d32f2f' : (quotaPercentage > 100 ? '#d32f2f' : '#4caf50')};">
          <strong>${h.name}</strong>
          <p class="subtext">Status: ${h.status} • Size: ${h.size} • Latest usage: ${h.usageHistory.slice(-1)[0]} L</p>
          <p class="subtext">Usage: ${monthlyUsage} / ${h.monthlyQuota} gallons (${quotaPercentage}%) | Tier: ${tariff.name}</p>
          <p class="subtext">Est. Bill: $${monthlyBill}</p>
          ${quotaBar}
          ${warning ? `<p style="color: #d32f2f; margin-top: 8px; font-weight: bold;">${warning}</p>` : ''}
          ${leakSection}
        </div>
      `;
    })
    .join('');
}

function viewReports() {
  if (!householdReports) return;

  if (householdData.length === 0) {
    householdReports.innerHTML = '<p>No households available for reports.</p>';
    return;
  }

  householdReports.innerHTML = householdData
    .map((h, index) => {
      const average = Math.round(h.usageHistory.reduce((sum, value) => sum + value, 0) / h.usageHistory.length);
      const monthlyUsage = calculateMonthlyUsage(h);
      const quotaPercentage = getQuotaPercentage(h);
      const tariff = getTariffTier(h);
      const monthlyBill = calculateMonthlyBill(h);
      const warning = getQuotaWarning(h);
      
      return `
        <div class="placeholder-box" style="margin-bottom: 12px;">
          <strong>${h.name} (${h.size})</strong>
          <p class="subtext">Average daily usage: ${average} L • History: ${h.usageHistory.join(' L, ')} L</p>
          <p class="subtext"><strong>Monthly Quota:</strong> ${h.monthlyQuota} gallons</p>
          <p class="subtext"><strong>Monthly Usage:</strong> ${monthlyUsage} gallons (${quotaPercentage}%)</p>
          <p class="subtext"><strong>Tariff Tier:</strong> ${tariff.name} (${tariff.multiplier}x rate)</p>
          <p class="subtext"><strong>Est. Monthly Bill:</strong> $${monthlyBill}</p>
          <p class="subtext">
            <button onclick="promptAdjustQuota(${index})" style="padding: 4px 8px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Adjust Quota
            </button>
            <button onclick="promptAdjustSize(${index})" style="padding: 4px 8px; margin-left: 8px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Adjust Size
            </button>
          </p>
          ${warning ? `<p style="color: #d32f2f; margin-top: 8px;"><strong>${warning}</strong></p>` : ''}
        </div>
      `;
    })
    .join('');
}

function getRandomAlert() {
  return dashboardAlerts[Math.floor(Math.random() * dashboardAlerts.length)];
}

function simulateSystemAlerts() {
  if (!systemAlertsEl) return;

  // Check for active leak alerts first
  const leakInfo = generateLeakAlerts();
  if (leakInfo) {
    const alertTimestamp = formatTime(new Date());
    const alertText = `${leakInfo.message} — ${leakInfo.details}`;
    systemAlertsHistory.push({
      message: alertText,
      timestamp: new Date().toISOString(),
      displayTime: alertTimestamp
    });
    saveAlerts();

    systemAlertsEl.innerHTML = `
      <p class="alert-state">${leakInfo.message}</p>
      <p class="subtext">${leakInfo.details}</p>
      <p class="subtext">Updated at ${alertTimestamp}</p>
    `;
    return;
  }

  // Check for quota warnings from any household
  let quotaWarningAlert = null;
  for (let h of householdData) {
    const warning = getQuotaWarning(h);
    if (warning) {
      quotaWarningAlert = warning;
      break;  // Show first critical/warning
    }
  }

  // Prioritize quota warnings, otherwise show random alert
  const alertText = quotaWarningAlert || getRandomAlert();
  const alertTimestamp = formatTime(new Date());
  
  // Save alert to localStorage
  systemAlertsHistory.push({
    message: alertText,
    timestamp: new Date().toISOString(),
    displayTime: alertTimestamp
  });
  saveAlerts();

  systemAlertsEl.innerHTML = `
    <p class="alert-state">${alertText}</p>
    <p class="subtext">Updated at ${alertTimestamp}</p>
  `;
}

function addHousehold() {
  const name = window.prompt('Enter the new household name:');
  if (!name) return;

  const sizeOptions = Object.keys(quotaBySize).join(', ');
  const size = window.prompt(`Enter household size (${sizeOptions}):`, 'Medium');
  if (!size || !quotaBySize.hasOwnProperty(size)) {
    window.alert('Invalid size. Please try again.');
    return;
  }

  const baseUsage = Math.round(10 + Math.random() * 35);
  householdData.push({
    name: name.trim(),
    usageHistory: [baseUsage, baseUsage + 7, baseUsage + 3, baseUsage + 10, baseUsage + 6, baseUsage + 8, baseUsage + 5],
    status: 'Normal',
    alert: 'None',
    size: size,
    monthlyQuota: quotaBySize[size],
    monthlyUsage: 0
  });

  // Save households to localStorage
  saveHouseholds();

  renderHouseholdList();
  viewReports();
  updateDashboardUsage();
}

/**
 * Admin function: Adjust quota for a household
 */
function promptAdjustQuota(householdIndex) {
  const household = householdData[householdIndex];
  const newQuota = window.prompt(
    `Adjust quota for ${household.name} (current: ${household.monthlyQuota} gallons):`,
    household.monthlyQuota
  );
  
  if (newQuota === null) return;
  
  const quotaValue = parseInt(newQuota);
  if (isNaN(quotaValue) || quotaValue <= 0) {
    window.alert('Please enter a valid positive number.');
    return;
  }
  
  if (adjustHouseholdQuota(householdIndex, quotaValue)) {
    window.alert(`Quota updated to ${quotaValue} gallons.`);
    renderHouseholdList();
    viewReports();
  }
}

/**
 * Admin function: Adjust size for a household
 */
function promptAdjustSize(householdIndex) {
  const household = householdData[householdIndex];
  const sizeOptions = Object.keys(quotaBySize).join(', ');
  const newSize = window.prompt(
    `Adjust size for ${household.name} (current: ${household.size})\nOptions: ${sizeOptions}`,
    household.size
  );
  
  if (newSize === null) return;
  
  if (adjustHouseholdSize(householdIndex, newSize)) {
    window.alert(`Size updated to ${newSize}. Quota adjusted to ${quotaBySize[newSize]} gallons.`);
    renderHouseholdList();
    viewReports();
  } else {
    window.alert(`Invalid size. Choose from: ${sizeOptions}`);
  }
}

function simulateUsageTick() {
  householdData.forEach(household => {
    const last = household.usageHistory[household.usageHistory.length - 1] || 0;
    const next = Math.max(5, Math.round(last + (Math.random() * 8 - 4)));
    household.usageHistory.push(next);
    if (household.usageHistory.length > 7) {
      household.usageHistory.shift();
    }
  });
  // Save updated household data
  saveHouseholds();
  updateDashboardUsage();
}

if (simulateLeakBtn) {
  simulateLeakBtn.addEventListener('click', triggerLeakAlert);
}

if (paymentBtn) {
  paymentBtn.addEventListener('click', payWithMomo);
}

if (feedbackForm) {
  feedbackForm.addEventListener('submit', handleFeedback);
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

// Initialize on DOMContentLoaded to restore persisted data
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already loaded
  initializeApp();
}

function initializeApp() {
  // Load persisted data from localStorage
  loadHouseholds();
  loadFeedback();
  loadAlerts();
  loadLeaks();

  // Render all data
  updateDashboardUsage();
  renderHouseholdList();
  
  // Display the most recent alert if any exist
  if (systemAlertsHistory.length > 0) {
    const lastAlert = systemAlertsHistory[systemAlertsHistory.length - 1];
    if (systemAlertsEl) {
      systemAlertsEl.innerHTML = `
        <p class="alert-state">${lastAlert.message}</p>
        <p class="subtext">Updated at ${lastAlert.displayTime}</p>
      `;
    }
  } else {
    simulateSystemAlerts();
  }

  // Render any existing active leaks
  renderHouseholdList();
}

setInterval(simulateUsageTick, 5000);
setInterval(simulateSystemAlerts, 10000);
setInterval(runLeakCheck, 12000);
setTimeout(triggerLeakAlert, 9000);
