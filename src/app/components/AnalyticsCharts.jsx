'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useState } from 'react';

// Mock data generators
const generateMockTVLData = () => {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  let tvl = 50000;
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Add some realistic growth with volatility
    tvl += (Math.random() - 0.3) * 5000 + 1000;
    tvl = Math.max(tvl, 10000); // Minimum TVL
    
    data.push({
      date: date.toISOString().split('T')[0],
      formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tvl: Math.round(tvl)
    });
  }
  return data;
};

const generateMockAPYData = () => {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  let apy = 4.5;
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // APY fluctuates between 3-6%
    apy += (Math.random() - 0.5) * 0.3;
    apy = Math.max(Math.min(apy, 6), 3);
    
    data.push({
      date: date.toISOString().split('T')[0],
      formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      apy: parseFloat(apy.toFixed(2))
    });
  }
  return data;
};

const generateMockProtocolData = () => {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  let aaveTVL = 30000;
  let compoundTVL = 20000;
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    aaveTVL += (Math.random() - 0.4) * 3000 + 600;
    compoundTVL += (Math.random() - 0.4) * 2000 + 400;
    
    aaveTVL = Math.max(aaveTVL, 5000);
    compoundTVL = Math.max(compoundTVL, 5000);
    
    data.push({
      date: date.toISOString().split('T')[0],
      formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      aave: Math.round(aaveTVL),
      compound: Math.round(compoundTVL)
    });
  }
  return data;
};

const generateMockChainData = () => {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  let ethTVL = 35000;
  let arbTVL = 15000;
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    ethTVL += (Math.random() - 0.3) * 3000 + 700;
    arbTVL += (Math.random() - 0.3) * 2000 + 300;
    
    ethTVL = Math.max(ethTVL, 10000);
    arbTVL = Math.max(arbTVL, 5000);
    
    data.push({
      date: date.toISOString().split('T')[0],
      formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ethereum: Math.round(ethTVL),
      arbitrum: Math.round(arbTVL)
    });
  }
  return data;
};

const generateMockUserData = () => {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  let totalUsers = 50;
  let activeUsers = 25;
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const newUsers = Math.floor(Math.random() * 5) + 1;
    totalUsers += newUsers;
    activeUsers = Math.floor(totalUsers * (0.4 + Math.random() * 0.3));
    
    data.push({
      date: date.toISOString().split('T')[0],
      formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalUsers,
      activeUsers,
      newUsers
    });
  }
  return data;
};

const generateMockVolumeData = () => {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const deposits = Math.floor(Math.random() * 20000) + 5000;
    const withdrawals = Math.floor(Math.random() * 15000) + 2000;
    
    data.push({
      date: date.toISOString().split('T')[0],
      formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      deposits,
      withdrawals,
      netFlow: deposits - withdrawals
    });
  }
  return data;
};

// Chart Components
export function TVLChart() {
  const data = generateMockTVLData();
  
  const formatTVL = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">Total Value Locked (30 Days)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="formattedDate" stroke="currentColor" opacity={0.6} fontSize={12} />
            <YAxis tickFormatter={formatTVL} stroke="currentColor" opacity={0.6} fontSize={12} />
            <Tooltip 
              formatter={(value) => [formatTVL(value), 'TVL']}
              labelStyle={{ color: 'var(--foreground)' }}
              contentStyle={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
            <Line type="monotone" dataKey="tvl" stroke="#3B82F6" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TokenAPYChart() {
  const generateTokenAPYData = () => {
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    let usdcAPY = 4.2;
    let wethAPY = 3.1;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // APY fluctuates realistically
      usdcAPY += (Math.random() - 0.5) * 0.4;
      wethAPY += (Math.random() - 0.5) * 0.3;
      
      usdcAPY = Math.max(Math.min(usdcAPY, 6), 2.5);
      wethAPY = Math.max(Math.min(wethAPY, 4.5), 2);
      
      data.push({
        date: date.toISOString().split('T')[0],
        formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        usdc: parseFloat(usdcAPY.toFixed(2)),
        weth: parseFloat(wethAPY.toFixed(2))
      });
    }
    return data;
  };

  const data = generateTokenAPYData();
  
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">APY by Token (30 Days)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="formattedDate" stroke="currentColor" opacity={0.6} fontSize={12} />
            <YAxis tickFormatter={(value) => `${value}%`} stroke="currentColor" opacity={0.6} fontSize={12} />
            <Tooltip 
              formatter={(value, name) => [`${value}%`, name === 'usdc' ? 'USDC APY' : 'WETH APY']}
              labelStyle={{ color: 'var(--foreground)' }}
              contentStyle={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
            <Line type="monotone" dataKey="usdc" stroke="#3B82F6" strokeWidth={3} dot={false} name="USDC" />
            <Line type="monotone" dataKey="weth" stroke="#059669" strokeWidth={3} dot={false} name="WETH" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProtocolTVLChart() {
  const data = generateMockProtocolData();
  
  const formatTVL = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">TVL by Protocol (30 Days)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="formattedDate" stroke="currentColor" opacity={0.6} fontSize={12} />
            <YAxis tickFormatter={formatTVL} stroke="currentColor" opacity={0.6} fontSize={12} />
            <Tooltip 
              formatter={(value, name) => [formatTVL(value), name === 'aave' ? 'Aave V3' : 'Compound V3']}
              labelStyle={{ color: 'var(--foreground)' }}
              contentStyle={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
            <Line type="monotone" dataKey="aave" stroke="#3B82F6" strokeWidth={3} dot={false} name="Aave V3" />
            <Line type="monotone" dataKey="compound" stroke="#059669" strokeWidth={3} dot={false} name="Compound V3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ChainTVLChart() {
  const data = generateMockChainData();
  
  const formatTVL = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">TVL by Chain (30 Days)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="formattedDate" stroke="currentColor" opacity={0.6} fontSize={12} />
            <YAxis tickFormatter={formatTVL} stroke="currentColor" opacity={0.6} fontSize={12} />
            <Tooltip 
              formatter={(value, name) => [formatTVL(value), name === 'ethereum' ? 'Ethereum' : 'Arbitrum']}
              labelStyle={{ color: 'var(--foreground)' }}
              contentStyle={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
            <Line type="monotone" dataKey="ethereum" stroke="#627EEA" strokeWidth={3} dot={false} name="Ethereum" />
            <Line type="monotone" dataKey="arbitrum" stroke="#28A0F0" strokeWidth={3} dot={false} name="Arbitrum" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function UserAnalyticsChart() {
  const generateUserCountData = () => {
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    let totalUsers = 50;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const newUsers = Math.floor(Math.random() * 5) + 1;
      totalUsers += newUsers;
      
      data.push({
        date: date.toISOString().split('T')[0],
        formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalUsers
      });
    }
    return data;
  };

  const data = generateUserCountData();

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">Total Users (30 Days)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="formattedDate" stroke="currentColor" opacity={0.6} fontSize={12} />
            <YAxis stroke="currentColor" opacity={0.6} fontSize={12} />
            <Tooltip 
              formatter={(value) => [value, 'Total Users']}
              labelStyle={{ color: 'var(--foreground)' }}
              contentStyle={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
            <Line type="monotone" dataKey="totalUsers" stroke="#3B82F6" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function VolumeChart() {
  const data = generateMockVolumeData();
  
  const formatVolume = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">Daily Volume (30 Days)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="formattedDate" stroke="currentColor" opacity={0.6} fontSize={12} />
            <YAxis tickFormatter={formatVolume} stroke="currentColor" opacity={0.6} fontSize={12} />
            <Tooltip 
              formatter={(value, name) => [formatVolume(value), name === 'deposits' ? 'Deposits' : 'Withdrawals']}
              labelStyle={{ color: 'var(--foreground)' }}
              contentStyle={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="deposits" fill="#059669" name="Deposits" />
            <Bar dataKey="withdrawals" fill="#EF4444" name="Withdrawals" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AvgDepositMetric() {
  // Generate mock average deposit size
  const avgDeposit = 2847; // Mock value
  
  const formatCurrency = (value) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  return (
    <div className="glass-card p-6 hover:scale-[1.02] transition-all duration-300">
      <div className="flex flex-col">
        <h2 className="text-sm sm:text-lg font-semibold text-foreground/60 mb-2 sm:mb-3">
          Average Deposit Size
        </h2>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 font-jetbrains-mono">
          {formatCurrency(avgDeposit)}
        </div>
        <div className="text-xs text-foreground/50 mt-1 sm:mt-2">
          Per user deposit
        </div>
      </div>
    </div>
  );
}
