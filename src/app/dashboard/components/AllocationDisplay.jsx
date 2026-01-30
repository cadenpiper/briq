"use client";

import { useState } from 'react';
import { ProtocolIcon } from '../../components/icons';

const AllocationDisplay = ({ allocations, isMobile = false }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (isMobile) {
    return (
      <div className="relative flex items-center justify-center space-x-2">
        {allocations.map((allocation, index) => (
          <div key={allocation.protocol} className="flex items-center space-x-1">
            <ProtocolIcon protocol={allocation.protocol} size={24} />
            <span className="text-xs text-foreground">{allocation.percentage.toFixed(0)}%</span>
            {index < allocations.length - 1 && (
              <span className="text-foreground/40 text-xs ml-1">•</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div 
      className="relative flex items-center justify-center space-x-1"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {allocations.map((allocation, index) => (
        <div key={allocation.protocol} className="flex items-center space-x-1">
          <ProtocolIcon protocol={allocation.protocol} size={24} />
          {index < allocations.length - 1 && (
            <span className="text-foreground/40 text-xs">+</span>
          )}
        </div>
      ))}
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-background border border-foreground/10 rounded-lg shadow-lg z-10 whitespace-nowrap">
          <div className="text-sm space-y-1 text-center" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            {allocations.map((allocation) => (
              <div key={allocation.protocol} className="flex items-center justify-center space-x-2">
                <ProtocolIcon protocol={allocation.protocol} size={12} />
                <span className="text-foreground">
                  {allocation.protocol}: {allocation.percentage.toFixed(0)}%
                </span>
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

export default AllocationDisplay;
