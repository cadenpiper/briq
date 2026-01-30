"use client";

import { useMemo } from 'react';
import { formatTVL, formatAPY } from '../../utils/formatters';

export default function MarketOverview({ data, loading, error }) {
  const metrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalTVL: 0,
        highestAPY: 0,
        activeMarkets: 0,
        averageAPY: 0
      };
    }

    const totalTVL = data.reduce((sum, market) => sum + (market.tvlValue || 0), 0);
    const highestAPY = Math.max(...data.map(market => market.apyValue || 0));
    const activeMarkets = data.filter(market => market.status === 'Active').length;
    const averageAPY = data.reduce((sum, market) => sum + (market.apyValue || 0), 0) / data.length;

    return {
      totalTVL,
      highestAPY,
      activeMarkets,
      averageAPY
    };
  }, [data]);

  const MetricCard = ({ title, value, subtitle, loading, valueColor = "text-foreground" }) => (
    <div className="glass-card p-6 text-center hover:scale-[1.02] transition-all duration-300">
      <div className="text-sm font-medium text-foreground/60 mb-2">{title}</div>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-foreground/20 rounded mb-2"></div>
          <div className="h-4 bg-foreground/10 rounded w-3/4 mx-auto"></div>
        </div>
      ) : error ? (
        <div className="text-foreground/40">
          <div className="text-2xl font-bold mb-1">--</div>
          <div className="text-xs">Error loading</div>
        </div>
      ) : (
        <>
          <div className={`text-2xl font-bold mb-1 ${valueColor}`}>{value}</div>
          {subtitle && <div className="text-xs text-foreground/50">{subtitle}</div>}
        </>
      )}
    </div>
  );

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total TVL"
          value={formatTVL(metrics.totalTVL)}
          subtitle="Across all protocols"
          loading={loading}
        />
        <MetricCard
          title="Highest APY"
          value={formatAPY(metrics.highestAPY)}
          subtitle="Best yield available"
          loading={loading}
        />
        <MetricCard
          title="Active Markets"
          value={metrics.activeMarkets}
          subtitle="Live protocols"
          loading={loading}
        />
        <MetricCard
          title="Average APY"
          value={formatAPY(metrics.averageAPY)}
          subtitle="Market average"
          valueColor="text-accent"
          loading={loading}
        />
      </div>
    </div>
  );
}
