# Briq

A DeFi web application that optimizes yield generation by automatically allocating user deposits across multiple lending protocols. Built with Next.js and integrated for EVM compatible blockchains.

## Description

Briq is a modern DeFi protocol that provides users with an intuitive interface to interact with yield optimization strategies. The application automatically routes funds between Aave V3 and Compound V3 lending protocols to maximize returns while minimizing risk. Users can deposit USDC & WETH and receive yield-bearing shares that represent their portion of the optimized yield pool.

### Key Features

- **Automated Yield Optimization**: Intelligent routing between Aave V3 and Compound V3 protocols
- **Vault-Based Architecture**: Secure deposit and withdrawal mechanisms
- **Real-time Analytics**: Interactive charts and portfolio tracking with Recharts
- **AI Assistant (Rupert)**: Real-time blockchain data and DeFi guidance with MCP integration

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

3. Install MCP server dependencies:
```bash
cd mcp-server
npm install
cd ..
```

4. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```env
# Required - Wallet Connect Project ID for RainbowKit
NEXT_PUBLIC_PROJECT_ID=your_walletconnect_project_id

# Required - GraphQL API Key for blockchain data queries (The Graph)
NEXT_PUBLIC_GRAPHQL_API_KEY=your_graph_api_key

# Required - OpenAI API Key for Rupert AI assistant
OPENAI_API_KEY=your_openai_api_key

# Required - Etherscan API Key for real-time blockchain data
ETHERSCAN_API_KEY=your_etherscan_api_key

# Required - CoinMarketCap API Key for token price data
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

Create a `.env` file in the `hardhat/` directory for autonomous optimization (optional):

```env
# Optional - Rupert wallet address for autonomous strategy optimization
RUPERT_ADDRESS=0x...

# Optional - Rupert private key for executing strategy changes
RUPERT_PRIVATE_KEY=0x...

# Optional - RPC URL (defaults to http://localhost:8545)
RPC_URL=http://localhost:8545
```

**Note**: Autonomous optimization features require `RUPERT_PRIVATE_KEY`. Without it, the MCP server will run in read-only mode.

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
│       ├── api/             # API routes
│       │   └── chat/        # Rupert AI chat API with MCP integration
│       ├── briq/            # Briq-specific pages
│       ├── components/      # Reusable React components
│       ├── context/         # React context providers
│       ├── home/            # Home page components
│       ├── hooks/           # Custom React hooks
│       ├── markets/         # Markets page components
│       ├── portfolio/       # Portfolio page components
│       ├── rupert/          # Rupert AI assistant interface
│       ├── utils/           # Utility functions
│       │   └── simpleMcpClient.js  # MCP client for blockchain data
│       ├── layout.js        # Root layout component
│       ├── page.js          # Main page component
│       ├── providers.jsx    # App providers setup
│       └── globals.css      # Global styles
├── mcp-server/              # Model Context Protocol server
│   ├── index.js             # MCP server with blockchain tools
│   ├── package.json         # Server dependencies
│   └── README.md            # MCP server documentation
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

### Core Platform
- ⚡ Built with Next.js 14+ and App Router
- 🎨 Optimized font loading with Geist font family
- 📱 Responsive design
- 🔧 Modern development tools and hot reload

### Rupert AI Assistant
- 🤖 **Real-time Blockchain Data**: Current token prices and gas costs via Etherscan API
- 📊 **DeFi Market Intelligence**: Live yield rates and TVL data from The Graph
- 🌐 **Multi-Network Support**: Ethereum and Arbitrum data with USD conversions
- 💬 **Natural Language Processing**: Understands queries like "What's the current ETH price?"
- 💾 **Session Persistence**: Chat history saved across browser sessions
- 🔄 **Real-time Updates**: Live data integration without page refresh

### MCP Server Capabilities
- **Token Prices**: Real-time ETH and USDC prices
- **Gas Tracking**: Current gas costs for Ethereum and Arbitrum with USD conversion
- **DeFi Protocols**: Market data from Aave V3 and Compound V3
- **Yield Optimization**: Best yield opportunity recommendations
- **Error Handling**: Graceful fallbacks and rate limiting

## Technologies Used

### Frontend
- [Next.js](https://nextjs.org) - React framework with App Router
- [React](https://reactjs.org) - UI library
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [RainbowKit](https://www.rainbowkit.com) - Wallet connection library
- [Wagmi](https://wagmi.sh) - React hooks for Ethereum
- [Viem](https://viem.sh) - TypeScript interface for Ethereum
- [Recharts](https://recharts.org) - Composable charting library

### AI & Data
- [OpenAI](https://openai.com) - GPT-3.5 Turbo for Rupert AI assistant
- [Model Context Protocol](https://modelcontextprotocol.io) - Real-time data integration
- [GraphQL](https://graphql.org) - Query language for APIs
- [The Graph](https://thegraph.com) - Decentralized protocol for indexing blockchain data
- [Etherscan API](https://etherscan.io/apis) - Blockchain data and gas prices

### Development
- [Tanstack Query](https://tanstack.com/query) - Data fetching and caching
- [Hardhat](https://hardhat.org) - Ethereum development environment

## API Endpoints

### Chat API
- `POST /api/chat` - Rupert AI assistant with MCP integration

### MCP Tools Available
- `get_token_prices` - Current ETH and USDC prices
- `get_gas_prices` - Gas costs for Ethereum and Arbitrum
- `get_market_data` - DeFi protocol market information
- `get_best_yield` - Optimal yield opportunities

## Usage Examples

### Rupert AI Queries
Ask Rupert natural language questions:
- *"What's the current price of ETH?"*
- *"What are gas prices on Ethereum and Arbitrum?"*
- *"How much does it cost to send a transaction?"*
- *"What are the best USDC yield opportunities?"*

### MCP Server Testing
```bash
cd mcp-server
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_gas_prices", "arguments": {"network": "both"}}}' | node index.js
```

## Development

### Running Tests
```bash
# Smart contract tests
cd hardhat
npx hardhat test

# MCP server tests
cd mcp-server
npm test
```

### Environment Setup
1. Get API keys:
   - [OpenAI API Key](https://platform.openai.com/api-keys)
   - [Etherscan API Key](https://etherscan.io/apis)
   - [The Graph API Key](https://thegraph.com/studio/)
   - [WalletConnect Project ID](https://cloud.walletconnect.com/)

2. Configure `.env.local` with your keys

3. Start development server: `npm run dev`
