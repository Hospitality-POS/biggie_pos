import { useState, useEffect } from 'react';
import { fetchTopSellersReport } from '../services/inventory';
import { useDebounce } from './useDebounce';

interface TopSellersFilters {
  shop_id: string;
  start_date: string;
  end_date: string;
  category: string;
  sort_by: string;
  limit: number;
}

interface TopSellersData {
  top_sellers: any[];
  summary: {
    total_revenue: number;
    total_quantity: number;
    total_profit: number;
    total_items: number;
    avg_profit_margin: number;
    period: {
      days: number;
    };
  };
}

interface UseTopSellersReportReturn {
  data: TopSellersData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useTopSellersReport = (filters: TopSellersFilters): UseTopSellersReportReturn => {
  const [data, setData] = useState<TopSellersData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedFilters = useDebounce(filters, 500);

  const fetchReport = async () => {
    if (!debouncedFilters.shop_id) {
      setError('Shop ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchTopSellersReport(debouncedFilters);
      setData(data);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Failed to fetch report';
      setError(errorMessage);
      console.error('Error fetching top sellers report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [debouncedFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading,
    error,
    refetch: fetchReport
  };
};
