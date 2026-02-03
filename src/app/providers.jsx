"use client";

import React from "react";
import {
    RainbowKitProvider,
    darkTheme,
    connectorsForWallets,
    getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import {
    metaMaskWallet,
    phantomWallet,
    trustWallet,
    rabbyWallet,
    rainbowWallet,
    walletConnectWallet,
    injectedWallet,
    safeWallet,
} from "@rainbow-me/rainbowkit/wallets"
import { WagmiProvider, createConfig, http } from "wagmi";
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";

// Define localhost chains for forked networks
const localhostArbitrum = {
  id: 31337,
  name: 'Arbitrum Fork',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  testnet: true,
};

const localhostEthereum = {
  id: 31338,
  name: 'Ethereum Fork',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8546'],
    },
  },
  testnet: true,
};

const queryClient = new QueryClient();

const connectors = connectorsForWallets(
    [
        {
            groupName: "Recommended",
            wallets: [metaMaskWallet, trustWallet, phantomWallet, rabbyWallet, rainbowWallet],
        },
        {
            groupName: "Other",
            wallets: [walletConnectWallet, injectedWallet, safeWallet]
        }
    ],
    {
        appName: "Briq",
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID
    }
);

const config = createConfig({
    chains: [localhostArbitrum, localhostEthereum],
    transports: {
        [localhostArbitrum.id]: http('http://127.0.0.1:8545'),
        [localhostEthereum.id]: http('http://127.0.0.1:8546'),
    },
    connectors,
    ssr: true,
})

const Providers = ({ children }) => {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    coolMode
                    theme={darkTheme({
                        accentColor: '#3B82F6',
                        accentColorForeground: 'white',
                        borderRadius: 'large',
                        fontStack: 'system',
                        overlayBlur: 'small',
                    })}
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
};

export default Providers;
