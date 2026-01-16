'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../utils/supabase';
import { TokenIcon } from './icons';

export default function TransactionHistory() {
  const { address } = useAccount();
  const [transactions, setTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!address) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    async function fetchTransactions() {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_address', address)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
      } else {
        setTransactions(data || []);
      }
      setLoading(false);
    }

    fetchTransactions();
  }, [address]);

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const shortenHash = (hash) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  if (!address) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
        <p className="text-foreground/60">Connect your wallet to view transaction history</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
        <p className="text-foreground/60">Loading...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
        <p className="text-foreground/60">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-foreground/10">
              <th className="text-center py-3 px-6 text-sm font-medium text-foreground/60 w-1/5">Type</th>
              <th className="text-center py-3 px-6 text-sm font-medium text-foreground/60 w-1/5">Token</th>
              <th className="text-center py-3 px-6 text-sm font-medium text-foreground/60 w-1/5">Amount</th>
              <th className="text-center py-3 px-6 text-sm font-medium text-foreground/60 w-1/5">Time</th>
              <th className="text-center py-3 px-6 text-sm font-medium text-foreground/60 w-1/5">Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            {currentTransactions.map((tx) => (
              <tr key={tx.id} className="border-b border-foreground/5 hover:scale-[1.02] transition-transform duration-200">
                <td className="py-3 px-6 w-1/5 text-center">
                  <span className={`font-mono ${
                    tx.type === 'deposit' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </span>
                </td>
                <td className="py-3 px-6 font-medium w-1/5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <TokenIcon token={tx.token} size={20} />
                    {tx.token}
                  </div>
                </td>
                <td className="py-3 px-6 font-mono w-1/5 text-center">{parseFloat(tx.amount).toLocaleString()} <span className="text-foreground/60">{tx.token}</span></td>
                <td className="py-3 px-6 text-sm text-foreground/60 w-1/5 text-center">{formatDate(tx.created_at)}</td>
                <td className="py-3 px-6 w-1/5 text-center">
                  <a
                    href={`https://arbiscan.io/tx/${tx.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 text-sm font-mono"
                  >
                    {shortenHash(tx.tx_hash)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-foreground/60">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, transactions.length)} of {transactions.length}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-foreground/10 hover:bg-foreground/20 text-sm cursor-pointer"
              >
                Previous
              </button>
            )}
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages && (
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded bg-foreground/10 hover:bg-foreground/20 text-sm cursor-pointer"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
