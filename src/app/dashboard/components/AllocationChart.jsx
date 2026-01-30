"use client";

import { useState } from 'react';

const AllocationChart = ({ allocations, size = 32 }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Protocol colors
  const protocolColors = {
    'Aave': '#7C3AED',
    'Compound': '#059669'
  };
  
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let cumulativePercentage = 0;
  
  return (
    <div 
      className="relative inline-block border-2 border-black rounded-full overflow-hidden"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground/10"
        />
        
        {/* Allocation segments */}
        {allocations.map((allocation, index) => {
          const percentage = allocation.percentage;
          const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
          const strokeDashoffset = -cumulativePercentage * circumference / 100;
          
          cumulativePercentage += percentage;
          
          return (
            <circle
              key={allocation.protocol}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={protocolColors[allocation.protocol] || '#6B7280'}
              strokeWidth="5"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-background border border-foreground/10 rounded-lg shadow-lg z-10 whitespace-nowrap">
          <div className="text-xs space-y-1">
            {allocations.map((allocation) => (
              <div key={allocation.protocol} className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: protocolColors[allocation.protocol] || '#6B7280' }}
                  />
                  <span className="text-foreground">
                    {allocation.protocol}: {allocation.percentage.toFixed(0)}%
                  </span>
                </div>
                {allocation.poolAddress && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(allocation.poolAddress);
                    }}
                    className="ml-4 text-foreground/60 hover:text-foreground font-mono cursor-pointer transition-colors"
                    title="Click to copy pool address"
                  >
                    {`${allocation.poolAddress.slice(0, 6)}...${allocation.poolAddress.slice(-4)}`}
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground/10" />
        </div>
      )}
    </div>
  );
};

export default AllocationChart;
