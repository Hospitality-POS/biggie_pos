export const formatCurrency = (amount: number, currency = 'KES'): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('en-KE').format(number);
};

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Formats a number into a compact string representation (e.g. 1.2M, 45.5K, 500).
 * Handles null/undefined/0 gracefully.
 * If currency is provided as a string, prefixes it (e.g. fmtK(1500, "KES") => "KES 1.5K").
 */
export const fmtK = (v: number | null | undefined, currency?: string): string => {
  if (v === null || v === undefined) return "0";
  const num = Number(v);
  if (isNaN(num)) return "0";
  if (num === 0) {
    return currency && typeof currency === "string" ? `${currency} 0` : "0";
  }

  let formatted: string;
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    formatted = `${(num / 1_000_000).toFixed(1)}M`;
  } else if (abs >= 1_000) {
    formatted = `${(num / 1_000).toFixed(1)}K`;
  } else {
    formatted = num.toLocaleString("en-KE", { minimumFractionDigits: 0 });
  }

  return currency && typeof currency === "string" ? `${currency} ${formatted}` : formatted;
};

/**
 * Formats a number with standard Kenyan currency prefix: KES {fmtK(v)}
 */
export const fmtKES = (v: number | null | undefined): string => {
  return fmtK(v, "KES");
};

/**
 * Formats integer amount with thousand separators without compact abbreviation (e.g. 1,500,000).
 * Optional currency parameter prefixes the result (e.g. fmtInteger(1500, "KES") => "KES 1,500").
 */
export const fmtInteger = (v: number | null | undefined, currency?: string): string => {
  if (v === null || v === undefined || isNaN(Number(v))) return "0";
  const formatted = Math.round(Number(v)).toLocaleString("en-KE", { minimumFractionDigits: 0 });
  return currency && typeof currency === "string" ? `${currency} ${formatted}` : formatted;
};

/**
 * Formats integer amount with currency prefix for wages/payroll (e.g. KES 50,000).
 * Defaults currency to "KES".
 */
export const fmtWage = (v: number | null | undefined, currency = "KES"): string => {
  return fmtInteger(v, currency);
};

/**
 * Formats integer amount with KSH prefix (e.g. "KSH 1,500").
 */
export const fmtKSH = (v: number | null | undefined): string => {
  return fmtInteger(v, "KSH");
};

export const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-KE', {
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

