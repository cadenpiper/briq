# Briq

A DeFi web application that optimizes yield generation by automatically allocating user deposits across multiple lending protocols. Built with Next.js and integrated for EVM compatible blockchains.

## Description

Briq is a modern DeFi protocol that provides users with an intuitive interface to interact with yield optimization strategies. The application automatically routes funds between Aave V3 and Compound V3 lending protocols to maximize returns while minimizing risk. Users can deposit USDC & WETH and receive yield-bearing shares that represent their portion of the optimized yield pool.

### Key Features

- **Automated Yield Optimization**: Intelligent routing between Aave V3 and Compound V3 protocols
- **Multi-Chain Support**: Compatible for all EVM networks  
- **Vault-Based Architecture**: Secure deposit and withdrawal mechanisms
- **Real-time Analytics**: Interactive charts and portfolio tracking with Recharts
- **Web3 Integration**: Seamless wallet connection via RainbowKit and Wagmi

## Installation

### Prerequisites

- Node.js 18.0 or later
- npm, yarn, pnpm, or bun package manager

### Setup

1. Clone the repository:
```bash
git clone https://github.com/cadenpiper/briq.git
cd briq
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```env
# Wallet Connect Project ID (required for RainbowKit)
NEXT_PUBLIC_PROJECT_ID=

# GraphQL API Key for blockchain data queries
NEXT_PUBLIC_GRAPHQL_API_KEY=
```

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
briq/
├── src/                     # Source code directory
│   └── app/                 # Next.js App Router directory
│       ├── abis/            # Smart contract ABIs
│       ├── analytics/       # Analytics components
│       ├── briq/            # Briq-specific pages
│       ├── components/      # Reusable React components
│       ├── context/         # React context providers
│       ├── home/            # Home page components
│       ├── hooks/           # Custom React hooks
│       ├── markets/         # Markets page components
│       ├── portfolio/       # Portfolio page components
│       ├── utils/           # Utility functions
│       ├── layout.js        # Root layout component
│       ├── page.js          # Main page component
│       ├── providers.jsx    # App providers setup
│       └── globals.css      # Global styles
├── hardhat/                 # Smart contracts directory
│   ├── contracts/           # Solidity smart contracts
│   │   ├── strategies/      # Strategy implementations
│   │   ├── interfaces/      # Contract interfaces
│   │   └── libraries/       # Contract libraries
│   ├── test/                # Contract tests
│   ├── ignition/            # Deployment modules
│   ├── scripts/             # Utility scripts
│   ├── config.json          # Multi-chain configuration
│   └── README.md            # Smart contracts documentation
├── public/                  # Static assets
│   └── images/              # Image files
├── .env.local               # Environment variables
├── next.config.mjs          # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── jsconfig.json            # JavaScript configuration
└── package.json             # Project dependencies and scripts
```

## Features

- ⚡ Built with Next.js 14+ and App Router
- 🎨 Optimized font loading with Geist font family
- 📱 Responsive design
- 🔧 Modern development tools and hot reload

## Technologies Used

- [Next.js](https://nextjs.org) - React framework with App Router
- [React](https://reactjs.org) - UI library
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [RainbowKit](https://www.rainbowkit.com) - Wallet connection library
- [Wagmi](https://wagmi.sh) - React hooks for Ethereum
- [Viem](https://viem.sh) - TypeScript interface for Ethereum
- [Recharts](https://recharts.org) - Composable charting library
- [GraphQL](https://graphql.org) - Query language for APIs
- [Tanstack Query](https://tanstack.com/query) - Data fetching and caching
