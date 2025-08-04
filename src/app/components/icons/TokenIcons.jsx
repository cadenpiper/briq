"use client";

/**
 * Token Icons Component
 * Uses real token logos from reliable sources
 */

import { useState } from 'react';

// Multiple sources for maximum reliability
const TOKEN_SOURCES = {
  USDC: [
    'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86a33E6441b8C4505B4afDcA7FBf0251f7046/logo.png',
    'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  ],
  WETH: [
    'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  ]
};

export const TokenIcon = ({ token, size = 24, className = "" }) => {
  const tokenUpper = token?.toUpperCase();
  const sources = TOKEN_SOURCES[tokenUpper];

  if (!sources) {
    return null; // Don't render anything for unsupported tokens
  }

  return (
    <TokenImageWithFallback 
      sources={sources}
      alt={`${token} logo`}
      size={size}
      className={className}
    />
  );
};

// Component that tries multiple image sources
const TokenImageWithFallback = ({ sources, alt, size, className }) => {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (currentSourceIndex < sources.length - 1) {
      setCurrentSourceIndex(currentSourceIndex + 1);
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return null; // Don't render anything if all sources fail
  }

  return (
    <img 
      src={sources[currentSourceIndex]}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={handleError}
      loading="lazy"
    />
  );
};

// Individual components for direct usage
export const USDCIcon = ({ size = 24, className = "" }) => (
  <TokenIcon token="USDC" size={size} className={className} />
);

export const WETHIcon = ({ size = 24, className = "" }) => (
  <TokenIcon token="WETH" size={size} className={className} />
);
