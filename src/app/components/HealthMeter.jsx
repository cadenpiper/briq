"use client";

import { useState } from 'react';

const HealthMeter = ({ health, maxHealth = 5, width = 60, height = 8 }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Clamp health between 0 and maxHealth
  const clampedHealth = Math.max(0, Math.min(health, maxHealth));
  const percentage = (clampedHealth / maxHealth) * 100;
  
  // Determine color based on health level
  const getHealthColor = (healthValue) => {
    if (healthValue >= 4.5) return { from: '#10B981', to: '#059669' }; // Green (fully filled)
    if (healthValue >= 3.5) return { from: '#84CC16', to: '#65A30D' }; // Greenish/Yellow
    if (healthValue >= 2.5) return { from: '#EAB308', to: '#CA8A04' }; // Yellow
    if (healthValue >= 1.5) return { from: '#F97316', to: '#EA580C' }; // Orange
    return { from: '#EF4444', to: '#DC2626' }; // Red
  };
  
  // Get health description
  const getHealthDescription = (healthValue) => {
    if (healthValue >= 4.5) return 'Excellent';
    if (healthValue >= 3.5) return 'Great';
    if (healthValue >= 2.5) return 'Good';
    if (healthValue >= 1.5) return 'Fair';
    return 'Poor';
  };
  
  const colors = getHealthColor(clampedHealth);
  const description = getHealthDescription(clampedHealth);
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div 
        className="relative border-2 border-black rounded overflow-hidden"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-foreground/10" />
        
        {/* Health bar with gradient */}
        <div 
          className="absolute inset-0 transition-all duration-300 ease-out"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${colors.from} 0%, ${colors.to} 100%)`
          }}
        />
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-background border border-foreground/10 rounded-lg shadow-lg z-10 w-32">
          <div className="text-xs text-center" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            <div className="font-semibold text-foreground">{Math.round(clampedHealth)}/{maxHealth} - {description}</div>
            <div className="text-foreground/50 mt-1 text-[11px]">Health score is based on protocol metrics like TVL and utilization</div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground/10" />
        </div>
      )}
    </div>
  );
};

export default HealthMeter;
