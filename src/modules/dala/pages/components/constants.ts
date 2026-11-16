// ── Dala Real Estate Constants & Utilities ─────────────────────────────────────

export const PERIOD_LABELS: Record<string, string> = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom Period',
};

export const MONTH_LABELS: string[] = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const fmt = (v: number) =>
  (v || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const normalizeDashboardData = (payload: any) => {
  const source = payload?.data || payload || {};
  const summary = source.summary || {};
  const salesStats = source.salesStats || {};
  const leaseStats = source.leaseStats || {};
  const rentalStats = source.rentalStats || {};
  const commissionStats = source.commissionStats || {};
  const maintenanceStats = source.maintenanceStats || {};

  return {
    ...source,
    summary,
    salesStats,
    leaseStats,
    rentalStats,
    commissionStats: {
      ...commissionStats,
      paidCommission: commissionStats.paidCommissionAmount || commissionStats.paidCommission || 0,
      pendingCommission: commissionStats.pendingCommissionAmount || commissionStats.pendingCommission || 0,
      paidCount: commissionStats.paidCommissions || 0,
      pendingCount: commissionStats.pendingCommissions || 0,
      partialCount: commissionStats.partialCommissions || 0,
    },
    maintenanceStats,
    totalProperties: source.totalProperties ?? summary.totalProperties ?? 0,
    totalUnits: source.totalUnits ?? summary.totalUnits ?? 0,
    availableUnits: source.availableUnits ?? summary.availableUnits ?? 0,
    soldProperties: source.soldProperties ?? summary.soldUnits ?? 0,
    leasedProperties: source.leasedProperties ?? summary.occupiedUnits ?? 0,
    propertiesForSale: source.propertiesForSale ?? summary.availableUnits ?? 0,
    propertiesForLease: source.propertiesForLease ?? summary.occupiedUnits ?? 0,
    totalRevenue: source.totalRevenue ?? summary.totalRevenue ?? salesStats.totalRevenue ?? 0,
    monthlySalesRevenue: source.monthlySalesRevenue ?? summary.totalSalesRevenue ?? salesStats.totalRevenue ?? 0,
    monthlyRentCollected: source.monthlyRentCollected ?? summary.totalRentRevenue ?? rentalStats.totalCollected ?? 0,
    monthlyRentBilled: source.monthlyRentBilled ?? rentalStats.totalBilled ?? leaseStats.totalRentAmount ?? 0,
    rentOutstanding: source.rentOutstanding ?? rentalStats.outstandingBalance ?? 0,
    pendingSalesRevenue: source.pendingSalesRevenue ?? salesStats.pendingRevenue ?? 0,
    totalCommission: source.totalCommission ?? summary.totalCommission ?? commissionStats.totalCommission ?? 0,
    monthlyCommission: source.monthlyCommission ?? commissionStats.totalCommission ?? summary.totalCommission ?? 0,
    pendingSales: source.pendingSales ?? salesStats.pendingSales ?? 0,
    completedSales: source.completedSales ?? salesStats.completedSales ?? 0,
    cancelledSales: source.cancelledSales ?? salesStats.cancelledSales ?? 0,
    totalSales: source.totalSales ?? salesStats.totalSales ?? 0,
    activeLeases: source.activeLeases ?? leaseStats.activeLeases ?? 0,
    pendingLeases: source.pendingLeases ?? leaseStats.pendingLeases ?? 0,
    expiredLeases: source.expiredLeases ?? leaseStats.expiredLeases ?? 0,
    totalLeases: source.totalLeases ?? leaseStats.totalLeases ?? 0,
    totalMaintenanceTickets: source.totalMaintenanceTickets ?? summary.totalMaintenanceTickets ?? maintenanceStats.totalTickets ?? 0,
    openMaintenanceTickets: source.openMaintenanceTickets ?? summary.openMaintenanceTickets ?? maintenanceStats.openTickets ?? 0,
    occupancyRate: source.occupancyRate ?? summary.occupancyRate ?? 0,
    recentSales: source.recentSales || [],
    recentLeases: source.recentLeases || [],
    recentRentPayments: source.recentRentPayments || [],
    recentMaintenanceTickets: source.recentMaintenanceTickets || [],
    topAgents: source.topAgents || [],
    paymentPlansDue: source.paymentPlansDue || { total: 0, totalBalance: 0, top5: [], all: [] },
    propertyTypes: source.propertyTypes || [
      {
        type: 'Available',
        count: summary.availableUnits || 0,
        occupancyRate: 0,
      },
      {
        type: 'Occupied',
        count: summary.occupiedUnits || 0,
        occupancyRate: summary.occupancyRate || 0,
      },
    ].filter((item: any) => item.count > 0),
  };
};
