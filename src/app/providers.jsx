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
import { WagmiProvider } from "wagmi";
import {
    mainnet,
    arbitrum,
} from "wagmi/chains";
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";

// Define localhost chain with proper configuration
const localhost = {
  id: 31337,
  name: 'Localhost',
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

const config = getDefaultConfig({
    appName: "Briq",
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    chains: [mainnet, arbitrum, localhost],
    ssr: true,
    connectors,
})

const Providers = ({ children }) => {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    coolMode
                    theme={darkTheme({
                        accentColor: '#FF7A2F',
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
