"use client";

import Layout from '../components/Layout';
import MarketTable from '../components/MarketTable';
import MarketOverview from '../components/MarketOverview';
import { useSubgraphMarketData } from '../hooks/useSubgraphMarketData';

export default function Markets() {
  const { data: marketData, loading, error } = useSubgraphMarketData();

  return (
    <Layout>
      <div className="flex justify-center py-6 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Market Overview Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Overview</h2>
            <MarketOverview data={marketData} loading={loading} error={error} />
          </div>

          {/* Markets Table Section */}
          <div className="mb-16 sm:mb-20 lg:mb-24">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Markets</h2>
            <div className="glass-card p-6 sm:p-8">
              <MarketTable />
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
