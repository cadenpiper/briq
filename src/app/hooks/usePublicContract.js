import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getPublicClient } from '../utils/publicClients';

/**
 * Custom hook for reading contract data without wallet connection
 * @param {string} address - Contract address
 * @param {Array} abi - Contract ABI
 * @param {string} functionName - Function to call
 * @param {Array} args - Function arguments (optional)
 * @param {number} refetchInterval - Refetch interval in ms (optional)
 */
export function usePublicContract({
  address,
  abi,
  functionName,
  args = [],
  refetchInterval = 0,
  enabled = true
}) {
  const { chainId } = useAccount();
  const publicClient = getPublicClient(chainId);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!enabled || !address) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await publicClient.readContract({
        address,
        abi,
        functionName,
        args
      });

      setData(result);
      setIsLoading(false);

    } catch (err) {
      console.error(`Public contract call failed (${functionName}):`, err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up refetch interval if specified
    if (refetchInterval > 0) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [address, functionName, enabled, refetchInterval]);

  return { data, isLoading, error, refetch: fetchData };
}
