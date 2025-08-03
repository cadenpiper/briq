import { useState, useEffect } from 'react';
import { getAllMarketData } from '../utils/subgraphQueries';

/**
 * Custom hook to fetch and manage market data from subgraphs
 * @param {number} refreshInterval - Auto-refresh interval in milliseconds (default: 5 minutes)
 * @returns {object} { data, loading, error, refetch }
 */
export function useMarketData(refreshInterval = 5 * 60 * 1000) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      const marketData = await getAllMarketData();
      setData(marketData || []);
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(err.message);
      // Keep existing data on error, don't clear it
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  // Manual refetch function
  const refetch = () => {
    setLoading(true);
    fetchData();
  };

  return {
    data,
    loading,
    error,
    refetch
  };
}
