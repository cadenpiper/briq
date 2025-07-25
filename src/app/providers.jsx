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
    sepolia,
    base,
    arbitrum,
} from "wagmi/chains";
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";
import { safe } from "wagmi/connectors";

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
    chains: [mainnet, sepolia, base, arbitrum],
    ssr: true,
    connectors,
})

const Providers = ({ children }) => {
    return <WagmiProvider config={config}>
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
    </WagmiProvider>;
};

export default Providers;
