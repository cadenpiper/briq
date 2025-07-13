"use client";

import React from "react";
import {
    RainbowKitProvider,
    connectorsForWallets,
    getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import {
    rainbowWallet,
    walletConnectWallet,
    metaMaskWallet,
    phantomWallet,
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

const queryClient = new QueryClient();

const connectors = connectorsForWallets(
    [
        {
            groupName: "Recommended",
            wallets: [metaMaskWallet, phantomWallet, rainbowWallet, walletConnectWallet],
        },
    ],
    {
        appName: "nextjs-hardhat-template",
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID
    }
);

const config = getDefaultConfig({
    appName: "nextjs-hardhat-template",
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    chains: [mainnet, sepolia, base, arbitrum],
    ssr: true,
    connectors,
})

const Providers = ({ children }) => {
    return <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
                {children}
            </RainbowKitProvider>
        </QueryClientProvider>
    </WagmiProvider>;
};

export default Providers;
