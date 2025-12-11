'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState } from 'react';

export default function HistoricalChart({ data, isLoading, title = "Historical Performance" }) {
  const [activeMetric, setActiveMetric] = useState('both'); // 'tvl', 'apy', 'both'

  // Format data for chart
  const chartData = data ? Object.values(data).reduce((acc, protocolData) => {
    protocolData.data.forEach(point => {
      const existingPoint = acc.find(p => p.date === point.date);
      if (existingPoint) {
        existingPoint.tvl += point.tvl;
        existingPoint.apySum += point.apy;
        existingPoint.apyCount += 1;
      } else {
        acc.push({
          date: point.date,
          tvl: point.tvl,
          apySum: point.apy,
          apyCount: 1
        });
      }
    });
    return acc;
  }, []).map(point => ({
    ...point,
    apy: point.apySum / point.apyCount, // Average APY
    formattedDate: new Date(point.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  })).sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

  const formatTVL = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatAPY = (value) => `${value.toFixed(2)}%`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-foreground/10">
          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'tvl' ? 'TVL: ' : 'APY: '}
              <span className="font-semibold">
                {entry.dataKey === 'tvl' ? formatTVL(entry.value) : formatAPY(entry.value)}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <p className="text-foreground/60">No historical data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        
        {/* Metric Toggle */}
        <div className="flex bg-foreground/5 rounded-lg p-1">
          <button
            onClick={() => setActiveMetric('tvl')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeMetric === 'tvl' 
                ? 'bg-accent text-white' 
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            TVL
          </button>
          <button
            onClick={() => setActiveMetric('apy')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeMetric === 'apy' 
                ? 'bg-accent text-white' 
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            APY
          </button>
          <button
            onClick={() => setActiveMetric('both')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeMetric === 'both' 
                ? 'bg-accent text-white' 
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Both
          </button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis 
              dataKey="formattedDate" 
              stroke="currentColor" 
              opacity={0.6}
              fontSize={12}
            />
            <YAxis 
              yAxisId="tvl"
              orientation="left"
              stroke="currentColor" 
              opacity={0.6}
              fontSize={12}
              tickFormatter={formatTVL}
              hide={activeMetric === 'apy'}
            />
            <YAxis 
              yAxisId="apy"
              orientation="right"
              stroke="currentColor" 
              opacity={0.6}
              fontSize={12}
              tickFormatter={formatAPY}
              hide={activeMetric === 'tvl'}
            />
            <Tooltip content={<CustomTooltip />} />
            {activeMetric !== 'apy' && (
              <Line
                yAxisId="tvl"
                type="monotone"
                dataKey="tvl"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3B82F6' }}
              />
            )}
            {activeMetric !== 'tvl' && (
              <Line
                yAxisId="apy"
                type="monotone"
                dataKey="apy"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#059669' }}
              />
            )}
            {activeMetric === 'both' && (
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
