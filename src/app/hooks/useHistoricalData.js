import { useState, useEffect } from 'react';
import { getAllHistoricalData } from '../utils/subgraphQueries';

export function useHistoricalData(days = 30) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchHistoricalData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const historicalData = await getAllHistoricalData(days);
        
        if (isMounted) {
          setData(historicalData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          console.error('Error fetching historical data:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchHistoricalData();

    return () => {
      isMounted = false;
    };
  }, [days]);

  const refetch = () => {
    setIsLoading(true);
    setError(null);
    getAllHistoricalData(days)
      .then(setData)
      .catch(err => {
        setError(err.message);
        console.error('Error refetching historical data:', err);
      })
      .finally(() => setIsLoading(false));
  };

  return { data, isLoading, error, refetch };
}
