export const formatCurrency = (amount: number, currency: string = 'KES'): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('en-KE').format(number);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getProfitMarginColor = (margin: number): string => {
  if (margin >= 20) return 'good';
  if (margin >= 10) return 'fair';
  return 'poor';
};
