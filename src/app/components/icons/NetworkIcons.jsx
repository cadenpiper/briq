"use client";

/**
 * Network Icons Component
 * Uses real blockchain network logos from reliable sources
 */

import { useState } from 'react';

// Multiple sources for maximum reliability
const NETWORK_SOURCES = {
  ETHEREUM: [
    'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png'
  ],
  ARBITRUM: [
    'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
    'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png'
  ]
};

export const NetworkIcon = ({ network, size = 24, className = "" }) => {
  const getNetworkKey = (networkName) => {
    const name = networkName?.toLowerCase();
    if (name?.includes('ethereum')) return 'ETHEREUM';
    if (name?.includes('arbitrum')) return 'ARBITRUM';
    return null;
  };

  const networkKey = getNetworkKey(network);
  const sources = networkKey ? NETWORK_SOURCES[networkKey] : null;

  if (!sources) {
    return null; // Don't render anything for unsupported networks
  }

  return (
    <NetworkImageWithFallback 
      sources={sources}
      alt={`${network} logo`}
      size={size}
      className={className}
    />
  );
};

// Component that tries multiple image sources
const NetworkImageWithFallback = ({ sources, alt, size, className }) => {
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
export const EthereumIcon = ({ size = 24, className = "" }) => (
  <NetworkIcon network="Ethereum" size={size} className={className} />
);

export const ArbitrumIcon = ({ size = 24, className = "" }) => (
  <NetworkIcon network="Arbitrum One" size={size} className={className} />
);
