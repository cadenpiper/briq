"use client";

/**
 * Protocol Icons Component
 * Uses real protocol logos from reliable sources
 */

import { useState } from 'react';

// Multiple sources for maximum reliability
const PROTOCOL_SOURCES = {
  AAVE: [
    'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
    'https://cryptologos.cc/logos/aave-aave-logo.png',
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png'
  ],
  COMPOUND: [
    'https://assets.coingecko.com/coins/images/10775/small/COMP.png',
    'https://cryptologos.cc/logos/compound-comp-logo.png',
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc00e94Cb662C3520282E6f5717214004A7f26888/logo.png'
  ]
};

export const ProtocolIcon = ({ protocol, size = 24, className = "" }) => {
  const getProtocolKey = (protocolName) => {
    const name = protocolName?.toLowerCase();
    if (name?.includes('aave')) return 'AAVE';
    if (name?.includes('compound')) return 'COMPOUND';
    return null;
  };

  const protocolKey = getProtocolKey(protocol);
  const sources = protocolKey ? PROTOCOL_SOURCES[protocolKey] : null;

  if (!sources) {
    return null; // Don't render anything for unsupported protocols
  }

  return (
    <ProtocolImageWithFallback 
      sources={sources}
      alt={`${protocol} logo`}
      size={size}
      className={className}
    />
  );
};

// Component that tries multiple image sources
const ProtocolImageWithFallback = ({ sources, alt, size, className }) => {
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
export const AaveIcon = ({ size = 24, className = "" }) => (
  <ProtocolIcon protocol="Aave V3" size={size} className={className} />
);

export const CompoundIcon = ({ size = 24, className = "" }) => (
  <ProtocolIcon protocol="Compound V3" size={size} className={className} />
);
