'use client';

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchTVLData() {
      const now = new Date();
      let startDate;

      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = new Date(0); // Beginning of time
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const { data: snapshots, error } = await supabase
        .from('tvl_snapshots')
        .select('tvl_usd, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching TVL data:', error);
        setLoading(false);
        return;
      }

      const formattedData = snapshots.map(snapshot => {
        const date = new Date(snapshot.created_at);
        let formattedDate;
        
        // Format based on time range
        if (timeRange === 'all' || timeRange === '90d') {
          // Show month and year for longer ranges
          formattedDate = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else {
          // Show month and day for shorter ranges
          formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        return {
          date: snapshot.created_at,
          formattedDate,
          tvl: parseFloat(snapshot.tvl_usd)
        };
      });

      setData(formattedData);
      setLoading(false);
    }

    fetchTVLData();
  }, [timeRange]);
  
  const formatTVL = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Total Value Locked</h3>
        <div className="h-80 flex items-center justify-center">
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Total Value Locked</h3>
        <div className="h-80 flex items-center justify-center">
          <p className="text-foreground/60">No TVL data yet. Make a deposit to start tracking!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Total Value Locked</h3>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="glass border border-foreground/10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 flex items-center justify-between cursor-pointer min-w-[120px]"
          >
            <span className="text-sm">
              {timeRange === '7d' && 'Last 7 Days'}
              {timeRange === '30d' && 'Last 30 Days'}
              {timeRange === '90d' && 'Last 90 Days'}
              {timeRange === 'all' && 'All Time'}
            </span>
            <svg className="w-4 h-4 text-foreground/60 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isDropdownOpen && (
            <div 
              className="absolute right-0 z-10 w-full mt-1 border border-foreground/10 rounded-lg shadow-lg overflow-hidden" 
              style={{ 
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#bfdbfe'
              }}
            >
              {[
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
                { value: '90d', label: 'Last 90 Days' },
                { value: 'all', label: 'All Time' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTimeRange(option.value);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-foreground/5 transition-colors text-sm cursor-pointer"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 20 }}>
            <defs>
              <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="formattedDate" stroke="currentColor" opacity={0.6} fontSize={12} />
            <YAxis tickFormatter={formatTVL} stroke="currentColor" opacity={0.6} fontSize={12} />
            <Area type="monotone" dataKey="tvl" stroke="#3B82F6" strokeWidth={3} fill="url(#tvlGradient)" />
          </AreaChart>
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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      const { data: snapshots, error } = await supabase
        .from('user_snapshots')
        .select('total_users, created_at')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
        return;
      }

      const formattedData = snapshots.map(snapshot => {
        const date = new Date(snapshot.created_at);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return {
          date: snapshot.created_at,
          formattedDate,
          totalUsers: snapshot.total_users
        };
      });

      setData(formattedData);
      setLoading(false);
    }

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Total Users</h3>
        <div className="h-80 flex items-center justify-center">
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Total Users</h3>
        <div className="h-80 flex items-center justify-center">
          <p className="text-foreground/60">No user data yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6" style={{ minHeight: '48px' }}>
        <h3 className="text-lg font-semibold text-foreground">Total Users</h3>
      </div>
      <div className="h-80 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 20 }}>
            <defs>
              <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="formattedDate" stroke="currentColor" opacity={0.6} fontSize={12} />
            <YAxis stroke="currentColor" opacity={0.6} fontSize={12} />
            <Area type="monotone" dataKey="totalUsers" stroke="#3B82F6" strokeWidth={3} fill="url(#userGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function VolumeChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchVolumeData() {
      const now = new Date();
      let startDate;
      let rpcFunction;
      let dateFormat;

      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          rpcFunction = 'get_daily_volume';
          dateFormat = 'short';
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          rpcFunction = 'get_daily_volume';
          dateFormat = 'short';
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          rpcFunction = 'get_weekly_volume';
          dateFormat = 'medium';
          break;
        case 'all':
          startDate = new Date(0);
          rpcFunction = 'get_monthly_volume';
          dateFormat = 'long';
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          rpcFunction = 'get_daily_volume';
          dateFormat = 'short';
      }

      const { data: volumeData, error } = await supabase
        .rpc(rpcFunction, { start_date: startDate.toISOString() });

      if (error) {
        console.error('Error fetching volume data:', error);
        setLoading(false);
        return;
      }

      const formattedData = volumeData.map(item => {
        const date = new Date(item.date + 'T00:00:00');
        let formattedDate;
        
        if (dateFormat === 'long') {
          formattedDate = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else if (dateFormat === 'medium') {
          formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
          formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        return {
          date: item.date,
          formattedDate,
          deposits: parseFloat(item.deposits),
          withdrawals: parseFloat(item.withdrawals)
        };
      });

      setData(formattedData);
      setLoading(false);
    }

    fetchVolumeData();
  }, [timeRange]);
  
  const formatVolume = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Volume</h3>
        <div className="h-80 flex items-center justify-center">
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Volume</h3>
        <div className="h-80 flex items-center justify-center">
          <p className="text-foreground/60">No volume data yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6" style={{ minHeight: '48px' }}>
        <h3 className="text-lg font-semibold text-foreground">Volume</h3>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="glass border border-foreground/10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 flex items-center justify-between cursor-pointer min-w-[120px]"
          >
            <span className="text-sm">
              {timeRange === '7d' && 'Last 7 Days'}
              {timeRange === '30d' && 'Last 30 Days'}
              {timeRange === '90d' && 'Last 90 Days'}
              {timeRange === 'all' && 'All Time'}
            </span>
            <svg className="w-4 h-4 text-foreground/60 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isDropdownOpen && (
            <div 
              className="absolute right-0 z-10 w-full mt-1 border border-foreground/10 rounded-lg shadow-lg overflow-hidden" 
              style={{ 
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#bfdbfe'
              }}
            >
              {[
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
                { value: '90d', label: 'Last 90 Days' },
                { value: 'all', label: 'All Time' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTimeRange(option.value);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-foreground/5 transition-colors text-sm cursor-pointer"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="h-80 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 20 }} barGap={4}>
            <defs>
              <linearGradient id="depositGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#059669" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="withdrawalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="formattedDate" stroke="currentColor" opacity={0.6} fontSize={12} />
            <YAxis tickFormatter={formatVolume} stroke="currentColor" opacity={0.6} fontSize={12} />
            <Bar dataKey="deposits" fill="url(#depositGradient)" name="Deposits" radius={[4, 4, 0, 0]} />
            <Bar dataKey="withdrawals" fill="url(#withdrawalGradient)" name="Withdrawals" radius={[4, 4, 0, 0]} />
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
