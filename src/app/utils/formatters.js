/**
 * Utility functions for formatting market data values
 */

/**
 * Format APY percentage values
 * @param {number} value - The APY value to format
 * @returns {string} Formatted APY string with percentage
 */
export function formatAPY(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(2)}%`;
}

/**
 * Format TVL (Total Value Locked) values
 * @param {number} value - The TVL value to format
 * @returns {string} Formatted TVL string with appropriate units
 */
export function formatTVL(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}

/**
 * Format utilization percentage values
 * @param {number} value - The utilization value to format
 * @returns {string} Formatted utilization string with percentage
 */
export function formatUtilization(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(1)}%`;
}
