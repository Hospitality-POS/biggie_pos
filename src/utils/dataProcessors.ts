import { Sale, DateRange, PropertyAnalysis, PortfolioProperty, Property } from '../pages/dala/types';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Calculate amount paid from payments array
 */
const calculateAmountPaid = (sale: Sale): number => {
  const saleData = sale.saleData || sale;

  if (saleData.status === 'completed') {
    return parseFloat(String(saleData.salePrice)) || 0;
  }

  // Use paymentTotals.totalPaid from backend if available
  if (saleData.paymentTotals?.totalPaid !== undefined) {
    return parseFloat(String(saleData.paymentTotals.totalPaid)) || 0;
  }

  const paymentsArray = saleData.payments || saleData.allPayments || [];

  if (Array.isArray(paymentsArray) && paymentsArray.length > 0) {
    return paymentsArray.reduce((sum: number, payment: any) => {
      const amount = parseFloat(String(payment.amount)) || 0;
      return sum + amount;
    }, 0);
  }

  return parseFloat(String(saleData.amountPaid || sale.amountPaid)) || 0;
};

/**
 * Calculate accrued commission based on amount paid
 */
const calculateAccruedCommission = (sale: Sale): number => {
  const amountPaid = calculateAmountPaid(sale);
  const saleData = sale.saleData || sale;

  let commissionRate = 0;

  if (saleData.commission?.percentage) {
    commissionRate = parseFloat(String(saleData.commission.percentage)) / 100;
  } else if (sale.commissionPercentage) {
    commissionRate = parseFloat(String(sale.commissionPercentage)) / 100;
  } else {
    commissionRate = 0.05; // Default 5%
  }

  return amountPaid * commissionRate;
};

/**
 * Calculate commission payment progress
 */
const calculateCommissionProgress = (sale: Sale): number => {
  const saleData = sale.saleData || sale;
  const commission = saleData.commission || {};

  let commissionPaid = 0;

  if (commission.commissionPayments && Array.isArray(commission.commissionPayments)) {
    commissionPaid = commission.commissionPayments.reduce((sum: number, payment: any) => {
      const paymentAmount = parseFloat(String(payment.netAmount || payment.amount || 0));
      return sum + paymentAmount;
    }, 0);
  }

  const totalCommission = parseFloat(String(commission.amount || 0));

  if (totalCommission <= 0) return 0;
  return (commissionPaid / totalCommission) * 100;
};

/**
 * Filter sales by date range
 */
const filterSalesByDateRange = (sales: Sale[], dateRange: DateRange): Sale[] => {
  if (!dateRange.startDate && !dateRange.endDate) {
    return sales;
  }

  return sales.filter(sale => {
    const saleDate = sale.createdAt ? new Date(sale.createdAt) : new Date();
    const startDate = dateRange.startDate;
    const endDate = dateRange.endDate;

    if (startDate && saleDate < startDate) return false;
    if (endDate && saleDate > endDate) return false;

    return true;
  });
};

/**
 * Filter sales by agents
 */
const filterSalesByAgents = (sales: Sale[], selectedAgents: string[]): Sale[] => {
  if (!selectedAgents || selectedAgents.length === 0) {
    return sales;
  }

  return sales.filter(sale => {
    const agentId = sale.agentId || sale.agent?._id;
    return selectedAgents.includes(agentId);
  });
};

/**
 * Filter sales by properties
 */
const filterSalesByProperties = (sales: Sale[], selectedProperties: string[]): Sale[] => {
  if (!selectedProperties || selectedProperties.length === 0) {
    return sales;
  }

  return sales.filter(sale => {
    const propertyId = sale.propertyId;
    return selectedProperties.includes(propertyId);
  });
};

/**
 * Generate agent commissions report
 */
export const generateAgentCommissionsReport = (
  salesData: Sale[],
  dateRange: DateRange,
  selectedAgents: string[],
  filterType: string = 'all'
): any[] => {
  // Filter sales based on criteria
  let filteredSales = [...salesData];
  
  filteredSales = filterSalesByDateRange(filteredSales, dateRange);
  filteredSales = filterSalesByAgents(filteredSales, selectedAgents);

  // Group sales by agent
  const agentMap = new Map<string, {
    agentId: string;
    agentName: string;
    agentEmail: string;
    sales: any[];
    totalSales: number;
    totalSaleValue: number;
    totalCommission: number;
    totalCommissionPaid: number;
  }>();

  filteredSales.forEach(sale => {
    const saleData = sale.saleData || sale;
    const agentId = sale.agentId || saleData.agentId || sale.agent?._id || 'unknown';
    const agentName = sale.agent?.name || saleData.agent?.name || 'Unknown Agent';
    const agentEmail = sale.agent?.email || saleData.agent?.email || '';

    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, {
        agentId,
        agentName,
        agentEmail,
        sales: [],
        totalSales: 0,
        totalSaleValue: 0,
        totalCommission: 0,
        totalCommissionPaid: 0,
      });
    }

    const agent = agentMap.get(agentId)!;
    
    const salePrice = parseFloat(String(saleData.salePrice || sale.salePrice || 0));
    const amountPaid = calculateAmountPaid(sale);
    const commissionRate = saleData.commission?.percentage || sale.commissionPercentage || 5;
    const totalCommission = parseFloat(String(saleData.commission?.amount || sale.commissionAmount || (salePrice * (parseFloat(String(commissionRate)) / 100))));
    const commissionPaid = calculateCommissionProgress(sale) / 100 * totalCommission;

    // Create a saleData object that includes paymentTotals for the saleDetail
    const saleDataWithPaymentTotals = {
      ...sale,
      paymentTotals: saleData.paymentTotals || sale.paymentTotals
    };

    const saleDetail: any = {
      saleId: sale._id || sale.id || '',
      saleCode: saleData.saleCode || sale.saleCode || '',
      salePrice: salePrice.toString(),
      amountPaid: amountPaid.toString(),
      paymentTotals: saleData.paymentTotals || sale.paymentTotals,
      commissionPercentage: String(commissionRate),
      commissionAmount: totalCommission.toString(),
      commissionPaid: commissionPaid.toString(),
      property: saleData.property || sale.property || 'N/A',
      unit: saleData.unit || sale.unit,
      agentName,
      commissionStatus: saleData.commission?.status || sale.commissionStatus || 'pending',
      saleData: saleDataWithPaymentTotals,
      commissionPayments: saleData.commission?.commissionPayments || sale.commissionPayments,
    };

    agent.sales.push(saleDetail);
    agent.totalSales += 1;
    agent.totalSaleValue += salePrice;
    agent.totalCommission += totalCommission;
    agent.totalCommissionPaid += commissionPaid;
  });

  // Convert map to array
  const reportData: any[] = Array.from(agentMap.values()).map(agent => ({
    agentId: agent.agentId,
    agentName: agent.agentName,
    agentEmail: agent.agentEmail,
    totalSales: agent.totalSales,
    totalSaleValue: agent.totalSaleValue,
    totalCommission: agent.totalCommission,
    totalCommissionPaid: agent.totalCommissionPaid,
    sales: agent.sales,
  }));

  return reportData;
};

/**
 * Generate sales analysis report by property
 */
export const generateSalesAnalysisReport = (
  salesData: Sale[],
  dateRange: DateRange,
  selectedAgents: string[],
  selectedProperties: string[]
): PropertyAnalysis[] => {
  // Filter sales based on criteria
  let filteredSales = [...salesData];
  
  filteredSales = filterSalesByDateRange(filteredSales, dateRange);
  filteredSales = filterSalesByAgents(filteredSales, selectedAgents);
  filteredSales = filterSalesByProperties(filteredSales, selectedProperties);

  // Group sales by property
  const propertyMap = new Map<string, {
    propertyId: string;
    propertyName: string;
    sales: Sale[];
    totalValue: number;
    agentSales: Map<string, { agentName: string; salesCount: number; totalValue: number }>;
  }>();

  filteredSales.forEach(sale => {
    const propertyId = sale.propertyId || 'unknown';
    const propertyName = sale.property || 'Unknown Property';
    const salePrice = parseFloat(String(sale.salePrice));
    const agentName = sale.agent?.name || 'Unknown Agent';

    if (!propertyMap.has(propertyId)) {
      propertyMap.set(propertyId, {
        propertyId,
        propertyName,
        sales: [],
        totalValue: 0,
        agentSales: new Map(),
      });
    }

    const property = propertyMap.get(propertyId)!;
    property.sales.push(sale);
    property.totalValue += salePrice;

    // Track agent sales
    if (!property.agentSales.has(agentName)) {
      property.agentSales.set(agentName, {
        agentName,
        salesCount: 0,
        totalValue: 0,
      });
    }
    const agentSales = property.agentSales.get(agentName)!;
    agentSales.salesCount += 1;
    agentSales.totalValue += salePrice;
  });

  // Calculate overall total value for percentage calculation
  const overallTotalValue = Array.from(propertyMap.values()).reduce((sum, property) => sum + property.totalValue, 0);

  // Convert map to array with analysis
  const reportData: PropertyAnalysis[] = Array.from(propertyMap.values()).map(property => {
    // Find top agent
    const topAgent = Array.from(property.agentSales.values())
      .sort((a, b) => b.totalValue - a.totalValue)[0];

    return {
      propertyId: property.propertyId,
      propertyName: property.propertyName,
      salesCount: property.sales.length,
      totalValue: property.totalValue,
      percentage: overallTotalValue > 0 ? ((property.totalValue / overallTotalValue) * 100).toFixed(1) : 0,
      topAgent,
    };
  });

  return reportData;
};

/**
 * Generate portfolio progress report
 */
export const generatePortfolioProgressReport = (
  salesData: Sale[],
  propertiesData: Property[],
  dateRange: DateRange,
  selectedProperties: string[]
): PortfolioProperty[] => {
  // Filter properties
  let filteredProperties = [...propertiesData];
  if (selectedProperties && selectedProperties.length > 0) {
    filteredProperties = filteredProperties.filter(property => 
      selectedProperties.includes(property._id)
    );
  }

  // Build portfolio report
  return filteredProperties.map(property => {
    const propertyId = property._id;
    const propertyName = property.name;
    const location = property.address;
    const totalUnits = property.total_units || 0;
    const soldUnits = property.sold_units || 0;
    const availableUnits = property.available_units || 0;
    const reservedUnits = 0; // Calculate from sales if needed
    const rentedUnits = property.rented_units || 0;
    const salesProgress = totalUnits > 0 ? ((soldUnits / totalUnits) * 100).toFixed(1) : 0;
    const totalValue = property.units?.reduce((sum: number, unit: any) => sum + (unit.listPrice || 0), 0) || 0;

    // Get sales for this property
    const propertySales = salesData.filter(sale => sale.propertyId === propertyId);

    // Group sales by unit type
    const unitMap = new Map<string, any>();

    propertySales.forEach(sale => {
      const unitType = sale.unit || 'Unknown';
      const salePrice = parseFloat(String(sale.salePrice));

      if (!unitMap.has(unitType)) {
        unitMap.set(unitType, {
          unitId: sale.unitId || unitType,
          unitType,
          plotSize: 'N/A',
          price: salePrice,
          totalUnits: 1,
          soldUnits: 1,
          availableUnits: 0,
          salesProgress: 100,
          status: 'sold' as const,
          sales: [],
        });
      }

      const unit = unitMap.get(unitType);
      unit.totalUnits += 1;
      unit.soldUnits += 1;
      unit.salesProgress = ((unit.soldUnits / unit.totalUnits) * 100).toFixed(1);
      unit.sales.push({
        saleId: sale._id,
        saleCode: sale.saleCode,
        customer: sale.agent?.name || 'N/A',
        saleDate: sale.createdAt ? new Date(sale.createdAt).toISOString() : '',
        salePrice,
        quantity: 1,
        agentName: sale.agent?.name || 'N/A',
        status: sale.status || 'completed',
      });
    });

    return {
      propertyId,
      propertyName,
      location,
      totalUnits,
      soldUnits,
      reservedUnits,
      availableUnits,
      rentedUnits,
      salesProgress,
      totalValue,
      units: Array.from(unitMap.values()),
    };
  });
};
