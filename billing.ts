/**
 * Billing record for a household transaction.
 */
export interface BillingRecord {
  id: string;
  householdId: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Failed';
  date: string;
  paymentMethod: string;
}

/**
 * Aggregated revenue statistics for dashboard display.
 */
export interface RevenueStats {
  totalRevenue: number;
  pendingPayments: number;
  collectionRate: number;
  activeHouseholds: number;
}

/**
 * Billing service that calculates monthly water bills and simulates Mobile Money payments.
 */
export class BillingService {
  private billingRecords: BillingRecord[] = [];
  private householdUsage: Record<string, number> = {
    'household-a': 180,
    'household-b': 320,
    'household-c': 95,
    'household-d': 240,
    'household-e': 410,
  };

  private mobileMoneyFeeRate = 0.03; // 3% Mobile Money transaction handling fee

  /**
   * Generate a monthly bill for the given household.
   *
   * Billing calculation uses tiered usage pricing to reward lower consumption:
   * - First 100 gallons at a base rate
   * - Next 100 gallons at a mid-tier rate
   * - Any usage above 200 gallons at the highest tier
   *
   * Mobile Money integration point: the final amount includes the expected
   * transaction fee that would be applied when the user pays through Mobile Money.
   */
  generateMonthlyBill(householdId: string): BillingRecord {
    const usage = this.householdUsage[householdId] ?? 0;

    const tier1Rate = 1.75;
    const tier2Rate = 2.50;
    const tier3Rate = 3.25;
    const tier1Limit = 100;
    const tier2Limit = 200;

    let remaining = usage;
    let amount = 0;

    if (remaining > 0) {
      const tier1Usage = Math.min(remaining, tier1Limit);
      amount += tier1Usage * tier1Rate;
      remaining -= tier1Usage;
    }

    if (remaining > 0) {
      const tier2Usage = Math.min(remaining, tier2Limit - tier1Limit);
      amount += tier2Usage * tier2Rate;
      remaining -= tier2Usage;
    }

    if (remaining > 0) {
      amount += remaining * tier3Rate;
    }

    const fee = amount * this.mobileMoneyFeeRate;
    const totalAmount = Math.round((amount + fee) * 100) / 100;

    const record: BillingRecord = {
      id: `bill-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      householdId,
      amount: totalAmount,
      status: 'Pending',
      date: new Date().toISOString(),
      paymentMethod: 'Mobile Money'
    };

    this.billingRecords.unshift(record);
    return record;
  }

  /**
   * Simulate a Mobile Money payment and verify the transaction.
   *
   * The verification step can fail if network or account verification issues occur.
   */
  processPayment(householdId: string, amount: number): boolean {
    const pendingRecord = this.billingRecords.find(
      record => record.householdId === householdId && record.status === 'Pending'
    );

    if (!pendingRecord || amount < pendingRecord.amount) {
      return false;
    }

    // Simulate transaction verification logic and mobile money network reliability.
    const isVerified = Math.random() > 0.12;
    pendingRecord.status = isVerified ? 'Paid' : 'Failed';
    return isVerified;
  }

  /**
   * Returns current revenue metrics for the admin dashboard.
   */
  getRevenueSummary(): RevenueStats {
    const totalRevenue = this.billingRecords
      .filter(record => record.status === 'Paid')
      .reduce((sum, record) => sum + record.amount, 0);

    const pendingPayments = this.billingRecords
      .filter(record => record.status === 'Pending')
      .reduce((sum, record) => sum + record.amount, 0);

    const totalInvoices = this.billingRecords.length;
    const paidInvoices = this.billingRecords.filter(record => record.status === 'Paid').length;
    const collectionRate = totalInvoices === 0 ? 0 : Math.round((paidInvoices / totalInvoices) * 100);

    const activeHouseholds = new Set(this.billingRecords.map(record => record.householdId)).size;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      pendingPayments: Math.round(pendingPayments * 100) / 100,
      collectionRate,
      activeHouseholds
    };
  }

  /**
   * Format currency values for Ghana Cedi display.
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Returns a list of recent billing transactions for UI display.
   */
  getRecentTransactions(): BillingRecord[] {
    return this.billingRecords.slice(0, 6);
  }
}
