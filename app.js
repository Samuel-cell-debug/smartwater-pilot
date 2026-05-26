let householdData = [];
let billingHistory = [];  // Track all billing records
let paymentHistory = [];  // Track all payments
let redistributionHistory = [];  // Track water redistribution events
let communityAreas = [];  // List of communities for redistribution
let gamificationData = {};  // Track badges, streaks, and scores
let streakHistory = [];  // Track streak events for each household

const badgeDefinitions = {
  'eco-warrior': {
    name: 'Eco Warrior',
    icon: '🌍',
    description: 'Stay under quota for 5 consecutive days',
    requirement: 'streak_5'
  },
  'water-sage': {
    name: 'Water Sage',
    icon: '💧',
    description: 'Stay under quota for 10 consecutive days',
    requirement: 'streak_10'
  },
  'conservation-hero': {
    name: 'Conservation Hero',
    icon: '🦸',
    description: 'Stay under quota for 20 consecutive days',
    requirement: 'streak_20'
  },
  'first-saver': {
    name: 'First Saver',
    icon: '⭐',
    description: 'First time staying under quota',
    requirement: 'first_under_quota'
  },
  'top-3-conservers': {
    name: 'Top 3 Conserver',
    icon: '🥇',
    description: 'Ranked in top 3 conserving households',
    requirement: 'top_3'
  },
  'power-saver': {
    name: 'Power Saver',
    icon: '⚡',
    description: 'Save 50+ gallons in a day',
    requirement: 'save_50_gallons'
  }
};

const defaultCommunities = [
  { id: 'area-1', name: 'Low-Supply District Alpha', priority: 'High', currentAllocation: 0 },
  { id: 'area-2', name: 'Underserved Zone Beta', priority: 'High', currentAllocation: 0 },
  { id: 'area-3', name: 'Seasonal Drought Area', priority: 'Medium', currentAllocation: 0 }
];

const defaultHouseholds = [
  { name: 'Household A', usageHistory: [18, 22, 20, 24, 19, 23, 21], status: 'Normal', alert: 'None', size: 'Medium', monthlyQuota: 500, monthlyUsage: 0, outstandingBalance: 0, badges: [], currentStreak: 0, maxStreak: 0, conservationScore: 0 },
  { name: 'Household B', usageHistory: [25, 28, 24, 30, 27, 29, 31], status: 'High Usage', alert: 'Review', size: 'Large', monthlyQuota: 700, monthlyUsage: 0, outstandingBalance: 0, badges: [], currentStreak: 0, maxStreak: 0, conservationScore: 0 },
  { name: 'Household C', usageHistory: [12, 14, 13, 15, 14, 13, 16], status: 'Low Tank', alert: 'Low Level', size: 'Small', monthlyQuota: 300, monthlyUsage: 0, outstandingBalance: 0, badges: [], currentStreak: 0, maxStreak: 0, conservationScore: 0 }
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

// ============ Billing & Payment Management ============

/**
 * Generate billing record for a household
 */
function generateBillingRecord(householdIndex, month = new Date().toISOString().slice(0, 7)) {
  if (householdIndex < 0 || householdIndex >= householdData.length) {
    console.error('Invalid household index');
    return null;
  }

  const household = householdData[householdIndex];
  const monthlyUsage = calculateMonthlyUsage(household);
  const monthlyBill = calculateMonthlyBill(household);
  const quotaPercentage = getQuotaPercentage(household);
  const tariff = getTariffTier(household);

  const billingRecord = {
    id: `bill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    householdIndex,
    householdName: household.name,
    month,
    usageInGallons: monthlyUsage,
    quota: household.monthlyQuota,
    quotaPercentage,
    tariffTier: tariff.tier,
    tariffName: tariff.name,
    amountDue: monthlyBill,
    outstandingBalance: monthlyBill,
    status: 'unpaid',
    generatedAt: new Date().toISOString(),
    paidAt: null,
    paymentMethod: null
  };

  billingHistory.push(billingRecord);
  saveBillingHistory();
  
  return billingRecord;
}

/**
 * Get outstanding balance for a household
 */
function getOutstandingBalance(householdIndex) {
  if (householdIndex < 0 || householdIndex >= householdData.length) {
    return 0;
  }
  
  const unpaidRecords = billingHistory.filter(
    bill => bill.householdIndex === householdIndex && bill.status === 'unpaid'
  );
  
  return unpaidRecords.reduce((sum, bill) => sum + bill.outstandingBalance, 0);
}

/**
 * Record a Mobile Money payment for a household
 */
function recordPayment(householdIndex, amount, phoneNumber = '', transactionId = '') {
  if (householdIndex < 0 || householdIndex >= householdData.length) {
    console.error('Invalid household index');
    return false;
  }

  if (amount <= 0) {
    console.error('Payment amount must be positive');
    return false;
  }

  const household = householdData[householdIndex];
  let remainingPayment = amount;

  // Apply payment to oldest unpaid bills first (FIFO)
  const unpaidBills = billingHistory.filter(
    bill => bill.householdIndex === householdIndex && bill.status === 'unpaid'
  ).sort((a, b) => new Date(a.generatedAt) - new Date(b.generatedAt));

  for (let bill of unpaidBills) {
    if (remainingPayment <= 0) break;

    const paymentTowardsBill = Math.min(remainingPayment, bill.outstandingBalance);
    bill.outstandingBalance -= paymentTowardsBill;
    remainingPayment -= paymentTowardsBill;

    if (bill.outstandingBalance <= 0) {
      bill.status = 'paid';
      bill.paidAt = new Date().toISOString();
      bill.paymentMethod = 'Mobile Money';
    }
  }

  // Record payment in payment history
  const payment = {
    id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    householdIndex,
    householdName: household.name,
    amount,
    phoneNumber,
    transactionId: transactionId || 'MANUAL_ENTRY',
    method: 'Mobile Money',
    processedAt: new Date().toISOString(),
    displayTime: formatTime(new Date())
  };

  paymentHistory.push(payment);
  savePaymentHistory();
  
  // Update household balance
  household.outstandingBalance = getOutstandingBalance(householdIndex);
  saveHouseholds();

  // Add to system alerts
  systemAlertsHistory.push({
    message: `✓ Payment received from ${household.name}: $${amount}`,
    timestamp: new Date().toISOString(),
    displayTime: formatTime(new Date())
  });
  saveAlerts();

  return true;
}

/**
 * Get total revenue collected (sum of all paid bills)
 */
function getTotalRevenueCollected() {
  return paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
}

/**
 * Get total outstanding revenue (sum of all unpaid bills)
 */
function getTotalOutstandingRevenue() {
  return billingHistory
    .filter(bill => bill.status === 'unpaid')
    .reduce((sum, bill) => sum + bill.outstandingBalance, 0);
}

/**
 * Get billing summary for all households
 */
function getBillingSummary() {
  return {
    totalHouseholds: householdData.length,
    totalRevenue: getTotalRevenueCollected(),
    totalOutstanding: getTotalOutstandingRevenue(),
    averageBillPerHousehold: householdData.length > 0
      ? Math.round((getTotalRevenueCollected() + getTotalOutstandingRevenue()) / householdData.length * 100) / 100
      : 0,
    householdDetails: householdData.map((h, index) => ({
      name: h.name,
      currentBalance: h.outstandingBalance,
      lastBill: calculateMonthlyBill(h),
      paymentStatus: h.outstandingBalance === 0 ? 'Paid' : 'Outstanding'
    }))
  };
}

/**
 * Get recent payment activity
 */
function getRecentPayments(limit = 5) {
  return paymentHistory.slice(-limit).reverse();
}

// ============ End Billing Management ============

// ============ Water Redistribution & Community Impact ============

/**
 * Calculate total water saved from reduced wastage (based on quota vs usage)
 * Households under their quota are considered as having "saved" water
 */
function calculateTotalWaterSaved() {
  return householdData.reduce((total, household) => {
    const monthlyUsage = calculateMonthlyUsage(household);
    const quota = household.monthlyQuota;
    const saved = Math.max(0, quota - monthlyUsage);
    return total + saved;
  }, 0);
}

/**
 * Get water savings status for a specific household
 */
function getHouseholdWaterSavings(householdIndex) {
  if (householdIndex < 0 || householdIndex >= householdData.length) {
    return { saved: 0, percentage: 0 };
  }
  
  const household = householdData[householdIndex];
  const monthlyUsage = calculateMonthlyUsage(household);
  const quota = household.monthlyQuota;
  const saved = Math.max(0, quota - monthlyUsage);
  const percentage = quota > 0 ? Math.round((saved / quota) * 100) : 0;
  
  return { saved, percentage, isConserving: saved > 0 };
}

/**
 * Allocate water from savings pool to a community area
 */
function allocateWaterToArea(areaId, gallons) {
  const totalSaved = calculateTotalWaterSaved();
  
  if (gallons > totalSaved) {
    console.error(`Insufficient water saved. Available: ${totalSaved}, Requested: ${gallons}`);
    return false;
  }

  const areaIndex = communityAreas.findIndex(a => a.id === areaId);
  if (areaIndex === -1) {
    console.error(`Area ${areaId} not found`);
    return false;
  }

  const redistRecord = {
    id: `redist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    areaId,
    areaName: communityAreas[areaIndex].name,
    gallonsAllocated: gallons,
    allocatedAt: new Date().toISOString(),
    displayTime: formatTime(new Date()),
    status: 'active'
  };

  redistributionHistory.push(redistRecord);
  communityAreas[areaIndex].currentAllocation += gallons;
  
  saveRedistributionHistory();
  saveCommunities();

  // Add to system alerts
  systemAlertsHistory.push({
    message: `✓ Water Redistribution: ${gallons} gallons allocated to ${communityAreas[areaIndex].name}`,
    timestamp: new Date().toISOString(),
    displayTime: formatTime(new Date())
  });
  saveAlerts();

  return true;
}

/**
 * Get total water allocated to all communities
 */
function getTotalWaterAllocated() {
  return communityAreas.reduce((sum, area) => sum + area.currentAllocation, 0);
}

/**
 * Get redistribution impact summary
 */
function getRedistributionImpact() {
  const totalSaved = calculateTotalWaterSaved();
  const totalAllocated = getTotalWaterAllocated();
  const conservingHouseholds = householdData.filter((h, i) => {
    const savings = getHouseholdWaterSavings(i);
    return savings.isConserving;
  }).length;

  return {
    totalWaterSaved: totalSaved,
    totalWaterAllocated: totalAllocated,
    remainingAvailable: totalSaved - totalAllocated,
    conservingHouseholds,
    totalHouseholds: householdData.length,
    conservationRate: householdData.length > 0 
      ? Math.round((conservingHouseholds / householdData.length) * 100) 
      : 0,
    redistributionRecords: redistributionHistory.filter(r => r.status === 'active'),
    communityDetails: communityAreas.map(area => ({
      name: area.name,
      priority: area.priority,
      allocated: area.currentAllocation
    }))
  };
}

/**
 * Get recent redistribution activity
 */
function getRecentRedistributions(limit = 5) {
  return redistributionHistory
    .filter(r => r.status === 'active')
    .slice(-limit)
    .reverse();
}

// ============ End Water Redistribution ============

// ============ Gamification & Badges ============

/**
 * Check if household stays under quota and update streaks
 */
function updateStreakAndBadges(householdIndex) {
  if (householdIndex < 0 || householdIndex >= householdData.length) {
    return;
  }

  const household = householdData[householdIndex];
  const monthlyUsage = calculateMonthlyUsage(household);
  const isUnderQuota = monthlyUsage < household.monthlyQuota;

  // Update streak
  if (isUnderQuota) {
    household.currentStreak = (household.currentStreak || 0) + 1;
    if (household.currentStreak > (household.maxStreak || 0)) {
      household.maxStreak = household.currentStreak;
    }
    
    // Award streak badges
    checkAndAwardStreakBadges(householdIndex, household.currentStreak);
  } else {
    // Reset streak if over quota
    if (household.currentStreak > 0) {
      streakHistory.push({
        householdIndex,
        householdName: household.name,
        streakLength: household.currentStreak,
        endedAt: new Date().toISOString(),
        displayTime: formatTime(new Date())
      });
      saveStreakHistory();
    }
    household.currentStreak = 0;
  }

  // Update conservation score (gallons saved * points)
  const waterSavings = getHouseholdWaterSavings(householdIndex);
  household.conservationScore = (household.conservationScore || 0) + waterSavings.saved;

  // Check for other badge criteria
  checkAndAwardBadges(householdIndex);

  saveHouseholds();
}

/**
 * Check and award streak-based badges
 */
function checkAndAwardStreakBadges(householdIndex, currentStreak) {
  const household = householdData[householdIndex];
  
  const streakBadges = [
    { id: 'eco-warrior', streakRequired: 5 },
    { id: 'water-sage', streakRequired: 10 },
    { id: 'conservation-hero', streakRequired: 20 }
  ];

  for (let badge of streakBadges) {
    if (currentStreak >= badge.streakRequired && !household.badges.includes(badge.id)) {
      awardBadge(householdIndex, badge.id);
    }
  }
}

/**
 * Check and award achievement-based badges
 */
function checkAndAwardBadges(householdIndex) {
  const household = householdData[householdIndex];
  const waterSavings = getHouseholdWaterSavings(householdIndex);

  // Power Saver badge (save 50+ gallons)
  if (waterSavings.saved >= 50 && !household.badges.includes('power-saver')) {
    awardBadge(householdIndex, 'power-saver');
  }

  // First Saver badge (first time under quota)
  if (waterSavings.isConserving && !household.badges.includes('first-saver')) {
    awardBadge(householdIndex, 'first-saver');
  }

  // Top 3 Conservers badge (checked separately via leaderboard)
}

/**
 * Award a badge to a household
 */
function awardBadge(householdIndex, badgeId) {
  if (householdIndex < 0 || householdIndex >= householdData.length) {
    return false;
  }

  const household = householdData[householdIndex];
  if (household.badges.includes(badgeId)) {
    return false;  // Already has badge
  }

  const badge = badgeDefinitions[badgeId];
  if (!badge) {
    return false;
  }

  household.badges.push(badgeId);
  saveHouseholds();

  // Add system alert
  systemAlertsHistory.push({
    message: `🎉 ${household.name} earned the "${badge.name}" ${badge.icon} badge!`,
    timestamp: new Date().toISOString(),
    displayTime: formatTime(new Date())
  });
  saveAlerts();

  return true;
}

/**
 * Get household's badges with full details
 */
function getHouseholdBadges(householdIndex) {
  if (householdIndex < 0 || householdIndex >= householdData.length) {
    return [];
  }

  const household = householdData[householdIndex];
  return household.badges.map(badgeId => badgeDefinitions[badgeId]);
}

/**
 * Generate leaderboard of top conserving households
 */
function getConservationLeaderboard() {
  const leaderboard = householdData.map((h, index) => ({
    rank: 0,  // Will be set after sorting
    householdIndex: index,
    name: h.name,
    conservationScore: h.conservationScore || 0,
    currentStreak: h.currentStreak || 0,
    maxStreak: h.maxStreak || 0,
    badges: h.badges.length,
    waterSaved: getHouseholdWaterSavings(index).saved,
    percentageSaved: getHouseholdWaterSavings(index).percentage
  }))
  .sort((a, b) => {
    // Sort by conservation score primarily, then max streak, then water saved
    if (b.conservationScore !== a.conservationScore) {
      return b.conservationScore - a.conservationScore;
    }
    if (b.maxStreak !== a.maxStreak) {
      return b.maxStreak - a.maxStreak;
    }
    return b.waterSaved - a.waterSaved;
  })
  .map((h, index) => ({ ...h, rank: index + 1 }));

  // Award top 3 badges
  for (let i = 0; i < Math.min(3, leaderboard.length); i++) {
    const household = householdData[leaderboard[i].householdIndex];
    if (!household.badges.includes('top-3-conservers')) {
      awardBadge(leaderboard[i].householdIndex, 'top-3-conservers');
    }
  }

  return leaderboard;
}

/**
 * Get summary statistics for gamification dashboard
 */
function getGamificationStats() {
  const leaderboard = getConservationLeaderboard();
  const totalBadgesAwarded = householdData.reduce((sum, h) => sum + h.badges.length, 0);
  const householdsWithStreaks = householdData.filter(h => h.currentStreak > 0).length;
  const avgConservationScore = householdData.length > 0
    ? Math.round(householdData.reduce((sum, h) => sum + (h.conservationScore || 0), 0) / householdData.length)
    : 0;

  return {
    totalBadgesAwarded,
    householdsWithStreaks,
    avgConservationScore,
    topConserver: leaderboard[0] || null,
    leaderboard
  };
}

// ============ End Gamification ============

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
const revenueContainer = document.getElementById('revenueContainer');
const redistributionContainer = document.getElementById('redistributionContainer');

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
 * Save billing history to localStorage
 */
function saveBillingHistory() {
  try {
    localStorage.setItem('smartwater_billing', JSON.stringify(billingHistory));
  } catch (error) {
    console.error('Error saving billing history to localStorage:', error);
  }
}

/**
 * Load billing history from localStorage
 */
function loadBillingHistory() {
  try {
    const stored = localStorage.getItem('smartwater_billing');
    if (stored) {
      billingHistory = JSON.parse(stored);
      return true;
    }
  } catch (error) {
    console.error('Error loading billing history from localStorage:', error);
  }
  billingHistory = [];
  return false;
}

/**
 * Save payment history to localStorage
 */
function savePaymentHistory() {
  try {
    localStorage.setItem('smartwater_payments', JSON.stringify(paymentHistory));
  } catch (error) {
    console.error('Error saving payment history to localStorage:', error);
  }
}

/**
 * Load payment history from localStorage
 */
function loadPaymentHistory() {
  try {
    const stored = localStorage.getItem('smartwater_payments');
    if (stored) {
      paymentHistory = JSON.parse(stored);
      return true;
    }
  } catch (error) {
    console.error('Error loading payment history from localStorage:', error);
  }
  paymentHistory = [];
  return false;
}

/**
 * Save redistribution history to localStorage
 */
function saveRedistributionHistory() {
  try {
    localStorage.setItem('smartwater_redistribution', JSON.stringify(redistributionHistory));
  } catch (error) {
    console.error('Error saving redistribution history to localStorage:', error);
  }
}

/**
 * Load redistribution history from localStorage
 */
function loadRedistributionHistory() {
  try {
    const stored = localStorage.getItem('smartwater_redistribution');
    if (stored) {
      redistributionHistory = JSON.parse(stored);
      return true;
    }
  } catch (error) {
    console.error('Error loading redistribution history from localStorage:', error);
  }
  redistributionHistory = [];
  return false;
}

/**
 * Save community areas to localStorage
 */
function saveCommunities() {
  try {
    localStorage.setItem('smartwater_communities', JSON.stringify(communityAreas));
  } catch (error) {
    console.error('Error saving communities to localStorage:', error);
  }
}

/**
 * Load community areas from localStorage
 */
function loadCommunities() {
  try {
    const stored = localStorage.getItem('smartwater_communities');
    if (stored) {
      communityAreas = JSON.parse(stored);
      return true;
    }
  } catch (error) {
    console.error('Error loading communities from localStorage:', error);
  }
  communityAreas = JSON.parse(JSON.stringify(defaultCommunities));
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
    localStorage.removeItem('smartwater_billing');
    localStorage.removeItem('smartwater_payments');
    localStorage.removeItem('smartwater_redistribution');
    localStorage.removeItem('smartwater_communities');
    householdData = JSON.parse(JSON.stringify(defaultHouseholds));
    feedbackHistory = [];
    systemAlertsHistory = [];
    leakEvents = [];
    billingHistory = [];
    paymentHistory = [];
    redistributionHistory = [];
    communityAreas = JSON.parse(JSON.stringify(defaultCommunities));
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

  // Update billing summary on dashboard
  const dashboardBillingEl = document.getElementById('dashboardTotalBilling');
  if (dashboardBillingEl) {
    const totalOutstanding = getTotalOutstandingRevenue();
    dashboardBillingEl.innerText = `$${totalOutstanding.toFixed(2)}`;
  }
}

/**
 * Update redistribution impact dashboard
 */
function updateRedistributionDashboard() {
  const communityWaterSavedEl = document.getElementById('communityWaterSaved');
  const communityImpactEl = document.getElementById('communityImpactText');
  const redistributionStatsEl = document.getElementById('redistributionStats');

  if (!communityWaterSavedEl && !communityImpactEl && !redistributionStatsEl) return;

  const impact = getRedistributionImpact();

  if (communityWaterSavedEl) {
    communityWaterSavedEl.innerText = `${impact.totalWaterSaved} gallons saved`;
  }

  if (communityImpactEl) {
    const progressText = impact.totalHouseholds > 0
      ? `${impact.conservingHouseholds} of ${impact.totalHouseholds} households conserving water (${impact.conservationRate}%)`
      : 'No households data available';
    communityImpactEl.innerText = progressText;
  }

  if (redistributionStatsEl) {
    const statsHTML = `
      <div style="padding: 8px 0; font-size: 0.9em;">
        <p style="margin: 4px 0; color: #333;"><strong>Water Allocated:</strong> ${impact.totalWaterAllocated} gallons</p>
        <p style="margin: 4px 0; color: #2e7d32;"><strong>Available:</strong> ${impact.remainingAvailable} gallons</p>
      </div>
      ${impact.communityDetails.length > 0 ? `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
          <p style="margin: 4px 0; font-size: 0.85em; font-weight: bold; color: #666;">Areas Receiving Water:</p>
          ${impact.communityDetails.map(area => `
            <p style="margin: 4px 0; font-size: 0.85em; color: #333;">
              ${area.priority === 'High' ? '🔴' : '🟡'} ${area.name}: ${area.allocated} gal
            </p>
          `).join('')}
        </div>
      ` : '<p style="margin: 4px 0; font-size: 0.85em; color: #999;">No water allocated yet</p>'}
    `;
    redistributionStatsEl.innerHTML = statsHTML;
  }
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
  if (householdData.length === 0) {
    window.alert('No households available for payment.');
    return;
  }

  // Get household selection
  const householdOptions = householdData.map((h, i) => `${i + 1}. ${h.name} (Balance: $${getOutstandingBalance(i).toFixed(2)})`).join('\n');
  const householdInput = window.prompt(`Select household to pay for:\n\n${householdOptions}\n\nEnter number:`, '1');
  
  if (!householdInput) return;
  
  const householdIndex = parseInt(householdInput) - 1;
  if (isNaN(householdIndex) || householdIndex < 0 || householdIndex >= householdData.length) {
    window.alert('Invalid household selection.');
    return;
  }

  const household = householdData[householdIndex];
  const outstandingBalance = getOutstandingBalance(householdIndex);

  if (outstandingBalance <= 0) {
    window.alert(`${household.name} has no outstanding balance. Account is up to date!`);
    return;
  }

  // Get payment amount
  const amountInput = window.prompt(
    `Mobile Money Payment for ${household.name}\nOutstanding Balance: $${outstandingBalance.toFixed(2)}\n\nEnter payment amount:`,
    outstandingBalance.toFixed(2)
  );

  if (!amountInput) return;

  const amount = parseFloat(amountInput);
  if (isNaN(amount) || amount <= 0) {
    window.alert('Invalid amount. Please enter a positive number.');
    return;
  }

  // Get phone number
  const phoneNumber = window.prompt('Enter Mobile Money phone number (e.g., +233XXXXXXXXX):');
  if (!phoneNumber) return;

  // Process payment
  if (recordPayment(householdIndex, amount, phoneNumber)) {
    const newBalance = getOutstandingBalance(householdIndex);
    window.alert(
      `✓ Payment Successful!\n\nHousehold: ${household.name}\nAmount Paid: $${amount.toFixed(2)}\nNew Balance: $${newBalance.toFixed(2)}\n\nTransaction ID: PAY-${Date.now()}`
    );
    renderHouseholdList();
    viewReports();
    updateDashboardUsage();
    simulateSystemAlerts();
  } else {
    window.alert('Error processing payment. Please try again.');
  }
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
      const outstandingBalance = getOutstandingBalance(index);
      const activeLeak = getActiveLeakForHousehold(index);
      const waterSavings = getHouseholdWaterSavings(index);
      
      const quotaBar = `
        <div style="margin-top: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; height: 8px;">
          <div style="width: ${Math.min(quotaPercentage, 100)}%; background: ${quotaPercentage > 100 ? '#d32f2f' : '#4caf50'}; height: 100%;"></div>
        </div>
      `;

      const waterSavingsInfo = waterSavings.isConserving ? `
        <div style="margin-top: 8px; padding: 8px; background: #c8e6c9; border-radius: 4px; border-left: 3px solid #2e7d32;">
          <p style="margin: 0; color: #2e7d32; font-weight: bold; font-size: 0.95em;">
            🌱 Water Conserved: ${waterSavings.saved} gallons (${waterSavings.percentage}% of quota)
          </p>
          <p style="margin: 4px 0 0 0; color: #1b5e20; font-size: 0.85em;">Contributing to community redistribution</p>
        </div>
      ` : '';

      const billingInfo = `
        <div style="margin-top: 12px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
          <p style="margin: 0 0 6px 0; font-weight: bold;">💰 Billing Information</p>
          <p style="margin: 0 0 4px 0; color: #333;">Current Bill: $${monthlyBill.toFixed(2)}</p>
          <p style="margin: 0 0 4px 0; color: ${outstandingBalance > 0 ? '#d32f2f' : '#4caf50'}; font-weight: ${outstandingBalance > 0 ? 'bold' : 'normal'};">
            Outstanding Balance: $${outstandingBalance.toFixed(2)}
          </p>
          ${outstandingBalance > 0 ? `
            <button onclick="setTimeout(() => {
              const householdOptions = householdData.map((h, i) => i === ${index} ? null : null).join('');
              const amount = window.prompt('Enter payment amount for ${h.name.replace(/'/g, "\\'")}:', '${outstandingBalance.toFixed(2)}');
              if (amount) {
                const phone = window.prompt('Enter phone number:');
                if (phone) recordPayment(${index}, parseFloat(amount), phone) ? (alert('Payment successful!'), location.reload()) : alert('Payment failed');
              }
            }, 100);" style="padding: 4px 8px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
              Pay Now
            </button>
          ` : '✓ Account up to date'}
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
          ${quotaBar}
          ${waterSavingsInfo}
          ${warning ? `<p style="color: #d32f2f; margin-top: 8px; font-weight: bold;">${warning}</p>` : ''}
          ${billingInfo}
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

  const billingSummary = getBillingSummary();
  const recentPayments = getRecentPayments(3);

  const summarySection = `
    <div style="padding: 12px; background: #e8f5e9; border-radius: 4px; margin-bottom: 12px;">
      <p style="margin: 0; font-weight: bold; color: #2e7d32;">💰 BILLING SUMMARY</p>
      <p style="margin: 4px 0; color: #333;">Total Households: ${billingSummary.totalHouseholds}</p>
      <p style="margin: 4px 0; color: #2e7d32; font-weight: bold;">Total Revenue Collected: $${billingSummary.totalRevenue.toFixed(2)}</p>
      <p style="margin: 4px 0; color: #d32f2f; font-weight: bold;">Total Outstanding: $${billingSummary.totalOutstanding.toFixed(2)}</p>
      <p style="margin: 4px 0; color: #333;">Average Bill per Household: $${billingSummary.averageBillPerHousehold.toFixed(2)}</p>
    </div>
  `;

  const recentPaymentsSection = recentPayments.length > 0 ? `
    <div style="padding: 12px; background: #f3e5f5; border-radius: 4px; margin-bottom: 12px;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #6a1b9a;">📱 Recent Payments</p>
      ${recentPayments.map(p => `
        <p style="margin: 4px 0; color: #333; font-size: 0.9em;">
          ✓ ${p.householdName}: $${p.amount.toFixed(2)} @ ${p.displayTime}
        </p>
      `).join('')}
    </div>
  ` : '';

  const detailedReports = householdData
    .map((h, index) => {
      const average = Math.round(h.usageHistory.reduce((sum, value) => sum + value, 0) / h.usageHistory.length);
      const monthlyUsage = calculateMonthlyUsage(h);
      const quotaPercentage = getQuotaPercentage(h);
      const tariff = getTariffTier(h);
      const monthlyBill = calculateMonthlyBill(h);
      const warning = getQuotaWarning(h);
      const outstandingBalance = getOutstandingBalance(index);
      
      return `
        <div class="placeholder-box" style="margin-bottom: 12px;">
          <strong>${h.name} (${h.size})</strong>
          <p class="subtext">Average daily usage: ${average} L • History: ${h.usageHistory.join(' L, ')} L</p>
          <p class="subtext"><strong>Monthly Quota:</strong> ${h.monthlyQuota} gallons</p>
          <p class="subtext"><strong>Monthly Usage:</strong> ${monthlyUsage} gallons (${quotaPercentage}%)</p>
          <p class="subtext"><strong>Tariff Tier:</strong> ${tariff.name} (${tariff.multiplier}x rate)</p>
          <p class="subtext"><strong>Est. Monthly Bill:</strong> $${monthlyBill.toFixed(2)}</p>
          <p class="subtext"><strong>Outstanding Balance:</strong> <span style="color: ${outstandingBalance > 0 ? '#d32f2f' : '#4caf50'}; font-weight: bold;">$${outstandingBalance.toFixed(2)}</span></p>
          <p class="subtext">
            <button onclick="promptAdjustQuota(${index})" style="padding: 4px 8px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Adjust Quota
            </button>
            <button onclick="promptAdjustSize(${index})" style="padding: 4px 8px; margin-left: 8px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Adjust Size
            </button>
            <button onclick="adminGenerateBill(${index})" style="padding: 4px 8px; margin-left: 8px; background: #9c27b0; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Generate Bill
            </button>
          </p>
          ${warning ? `<p style="color: #d32f2f; margin-top: 8px;"><strong>${warning}</strong></p>` : ''}
        </div>
      `;
    })
    .join('');

  householdReports.innerHTML = summarySection + recentPaymentsSection + detailedReports;
}

/**
 * Render revenue dashboard for admin panel
 */
function renderRevenueDashboard() {
  if (!revenueContainer) return;

  const summary = getBillingSummary();
  const recentPayments = getRecentPayments(5);

  const revenueCard = `
    <div style="padding: 12px; background: #e8f5e9; border-radius: 4px; margin-bottom: 12px; border-left: 4px solid #4caf50;">
      <p style="margin: 0 0 8px 0; font-size: 1.1em; font-weight: bold; color: #2e7d32;">💰 Revenue Summary</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
        <div>
          <p style="margin: 0; color: #666; font-size: 0.9em;">Total Collected</p>
          <p style="margin: 0; font-size: 1.5em; font-weight: bold; color: #2e7d32;">$${summary.totalRevenue.toFixed(2)}</p>
        </div>
        <div>
          <p style="margin: 0; color: #666; font-size: 0.9em;">Outstanding</p>
          <p style="margin: 0; font-size: 1.5em; font-weight: bold; color: #d32f2f;">$${summary.totalOutstanding.toFixed(2)}</p>
        </div>
      </div>
      <p style="margin: 0; color: #666; font-size: 0.9em;">Households: ${summary.totalHouseholds} | Avg Bill: $${summary.averageBillPerHousehold.toFixed(2)}</p>
    </div>
  `;

  const paymentActivityCard = recentPayments.length > 0 ? `
    <div style="padding: 12px; background: #f3e5f5; border-radius: 4px; margin-bottom: 12px; border-left: 4px solid #6a1b9a;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #6a1b9a;">📱 Recent Payment Activity</p>
      ${recentPayments.map(p => `
        <div style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-size: 0.9em;">
          <p style="margin: 0; color: #333;"><strong>${p.householdName}</strong></p>
          <p style="margin: 0; color: #2e7d32;">✓ +$${p.amount.toFixed(2)} @ ${p.displayTime}</p>
        </div>
      `).join('')}
    </div>
  ` : '';

  const householdBillingCard = `
    <div style="padding: 12px; background: #e1f5fe; border-radius: 4px; border-left: 4px solid #0288d1;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #0277bd;">🏠 Household Payment Status</p>
      ${summary.householdDetails.map(h => `
        <div style="padding: 6px 0; border-bottom: 1px solid #b3e5fc; font-size: 0.9em;">
          <p style="margin: 0; color: #333;"><strong>${h.name}</strong></p>
          <p style="margin: 0; color: ${h.paymentStatus === 'Paid' ? '#4caf50' : '#d32f2f'};">
            ${h.paymentStatus === 'Paid' ? '✓' : '⚠'} Balance: $${h.currentBalance.toFixed(2)} | Last Bill: $${h.lastBill.toFixed(2)}
          </p>
        </div>
      `).join('')}
    </div>
  `;

  revenueContainer.innerHTML = revenueCard + paymentActivityCard + householdBillingCard;
}

/**
 * Render redistribution management dashboard for admin panel
 */
function renderRedistributionDashboard() {
  if (!redistributionContainer) return;

  const impact = getRedistributionImpact();
  const recentRedists = getRecentRedistributions(5);

  const impactCard = `
    <div style="padding: 12px; background: #c8e6c9; border-radius: 4px; margin-bottom: 12px; border-left: 4px solid #2e7d32;">
      <p style="margin: 0 0 8px 0; font-size: 1.1em; font-weight: bold; color: #1b5e20;">🌱 Water Conservation Impact</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
        <div>
          <p style="margin: 0; color: #1b5e20; font-size: 0.9em;">Total Saved</p>
          <p style="margin: 0; font-size: 1.5em; font-weight: bold; color: #1b5e20;">${impact.totalWaterSaved} gal</p>
        </div>
        <div>
          <p style="margin: 0; color: #1b5e20; font-size: 0.9em;">Households Conserving</p>
          <p style="margin: 0; font-size: 1.5em; font-weight: bold; color: #1b5e20;">${impact.conservingHouseholds}/${impact.totalHouseholds}</p>
        </div>
      </div>
      <p style="margin: 0; color: #1b5e20; font-size: 0.9em;">Conservation Rate: ${impact.conservationRate}%</p>
    </div>
  `;

  const allocationCard = `
    <div style="padding: 12px; background: #bbdefb; border-radius: 4px; margin-bottom: 12px; border-left: 4px solid #0277bd;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #01579b;">📊 Water Allocation Status</p>
      <div style="padding: 8px 0;">
        <p style="margin: 4px 0; color: #0277bd; font-weight: bold;">Total Allocated: ${impact.totalWaterAllocated} gallons</p>
        <p style="margin: 4px 0; color: #0277bd;">Available to Allocate: ${impact.remainingAvailable} gallons</p>
      </div>
      <p style="margin: 8px 0 0 0; font-size: 0.9em; font-weight: bold; color: #01579b;">Community Areas:</p>
      ${communityAreas.map((area, idx) => `
        <div style="padding: 8px 0; border-top: 1px solid #90caf9;">
          <p style="margin: 0; color: #0277bd;"><strong>${area.name}</strong> (Priority: ${area.priority})</p>
          <p style="margin: 4px 0; color: #0277bd; font-size: 0.9em;">Currently Allocated: ${area.currentAllocation} gallons</p>
          <button onclick="adminAllocateWater(${idx})" style="padding: 4px 8px; margin-top: 4px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">
            Allocate Water
          </button>
        </div>
      `).join('')}
    </div>
  `;

  const recentAllocCard = recentRedists.length > 0 ? `
    <div style="padding: 12px; background: #f3e5f5; border-radius: 4px; border-left: 4px solid #6a1b9a;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #6a1b9a;">📝 Recent Allocations</p>
      ${recentRedists.map(r => `
        <div style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-size: 0.9em;">
          <p style="margin: 0; color: #333;"><strong>${r.areaName}</strong></p>
          <p style="margin: 0; color: #6a1b9a;">✓ ${r.gallonsAllocated} gallons @ ${r.displayTime}</p>
        </div>
      `).join('')}
    </div>
  ` : '';

  redistributionContainer.innerHTML = impactCard + allocationCard + recentAllocCard;
}

/**
 * Admin function: Allocate water to a community area
 */
function adminAllocateWater(areaIndex) {
  if (areaIndex < 0 || areaIndex >= communityAreas.length) {
    window.alert('Invalid area selection.');
    return;
  }

  const area = communityAreas[areaIndex];
  const totalSaved = calculateTotalWaterSaved();
  const remainingAllocation = totalSaved - getTotalWaterAllocated();

  if (remainingAllocation <= 0) {
    window.alert('No water available for allocation.');
    return;
  }

  const gallonsInput = window.prompt(
    `Allocate water to ${area.name}\nAvailable: ${remainingAllocation} gallons\nEnter allocation amount:`,
    Math.min(100, remainingAllocation).toString()
  );

  if (!gallonsInput) return;

  const gallons = parseInt(gallonsInput);
  if (isNaN(gallons) || gallons <= 0) {
    window.alert('Invalid amount. Please enter a positive number.');
    return;
  }

  if (gallons > remainingAllocation) {
    window.alert(`Insufficient water. Available: ${remainingAllocation} gallons.`);
    return;
  }

  if (allocateWaterToArea(area.id, gallons)) {
    window.alert(
      `✓ Water Allocated!\n\nArea: ${area.name}\nGallons: ${gallons}\nRemaining Available: ${remainingAllocation - gallons} gallons`
    );
    renderRedistributionDashboard();
    simulateSystemAlerts();
    updateRedistributionDashboard();
  } else {
    window.alert('Error allocating water. Please try again.');
  }
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
    monthlyUsage: 0,
    outstandingBalance: 0
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

/**
 * Admin function: Generate bill for a household
 */
function adminGenerateBill(householdIndex) {
  const household = householdData[householdIndex];
  const monthInput = window.prompt(
    `Generate bill for ${household.name}\nEnter month (YYYY-MM) or leave blank for current month:`,
    new Date().toISOString().slice(0, 7)
  );
  
  if (monthInput === null) return;
  
  const billingRecord = generateBillingRecord(householdIndex, monthInput || new Date().toISOString().slice(0, 7));
  
  if (billingRecord) {
    window.alert(
      `✓ Bill Generated!\n\nHousehold: ${household.name}\nMonth: ${billingRecord.month}\nUsage: ${billingRecord.usageInGallons} gallons\nTariff: ${billingRecord.tariffName}\nAmount Due: $${billingRecord.amountDue.toFixed(2)}\n\nBill ID: ${billingRecord.id.substring(0, 20)}...`
    );
    viewReports();
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
  viewReportsBtn.addEventListener('click', () => {
    viewReports();
    renderRevenueDashboard();
    renderRedistributionDashboard();
  });
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
  loadBillingHistory();
  loadPaymentHistory();
  loadRedistributionHistory();
  loadCommunities();

  // Update household outstanding balances from billing records
  householdData.forEach((household, index) => {
    household.outstandingBalance = getOutstandingBalance(index);
  });
  saveHouseholds();

  // Render all data
  updateDashboardUsage();
  updateRedistributionDashboard();
  renderHouseholdList();
  renderRevenueDashboard();
  renderRedistributionDashboard();
  
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
setInterval(updateRedistributionDashboard, 8000);
setTimeout(triggerLeakAlert, 9000);
