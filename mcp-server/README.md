# Briq MCP Server

Model Context Protocol server providing real-time blockchain data and DeFi analytics for the Rupert AI assistant.

## Architecture

```
mcp-server/
├── index.js                       # Main MCP server
├── src/
│   ├── services/                  # Business logic services
│   │   ├── GasPriceService.js        # Gas price fetching & formatting
│   │   ├── TokenPriceService.js      # Token price data
│   │   ├── BriqAnalyticsService.js   # Briq protocol analytics
│   │   └── DeFiMarketService.js      # DeFi market data from The Graph
│   ├── clients/                   # API clients
│   │   ├── EtherscanClient.js        # Etherscan API wrapper
│   │   ├── GraphQLClient.js          # The Graph API wrapper
│   │   └── ViemClient.js             # Blockchain contract interactions
│   └── formatters/                # Natural language formatters
│       ├── GasPriceFormatter.js      # Gas price natural language
│       ├── AnalyticsFormatter.js     # Analytics natural language
│       └── MarketDataFormatter.js    # Market data natural language
├── package.json
└── README.md
```

## Features

### Gas Prices
- **Smart formatting**: Simple responses for basic queries, detailed for specific requests
- **Natural language**: "The current gas price on Ethereum is 0.327 gwei, equivalent to $0.030 for a standard transfer."
- **Multi-network**: Ethereum and Arbitrum support
- **USD conversion**: Real-time cost calculations

### Token Prices
- **Real-time data**: ETH and USDC prices from CoinMarketCap
- **Clean formatting**: Professional price display

### Briq Protocol Analytics
- **Live contract data**: Real-time TVL, allocations, and rewards
- **Comprehensive analytics**: Portfolio breakdown and performance metrics
- **Strategy tracking**: Aave and Compound strategy monitoring

### DeFi Market Data
- **The Graph integration**: Live market data from Aave V3 and Compound V3
- **Yield optimization**: Best yield opportunity recommendations
- **Multi-network coverage**: Ethereum and Arbitrum markets

## Available Tools

- `get_gas_prices` - Gas prices with smart simple/detailed formatting
- `get_token_prices` - Real-time ETH/USDC prices
- `get_briq_tvl` - Briq protocol Total Value Locked
- `get_briq_analytics` - Comprehensive Briq analytics
- `get_market_allocations` - Token distribution across strategies
- `get_strategy_rewards` - Aave & Compound rewards breakdown
- `get_market_data` - Live DeFi market data
- `get_best_yield` - Intelligent yield optimization

## Environment Variables

```env
# Required
ETHERSCAN_API_KEY=your_etherscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
NEXT_PUBLIC_GRAPHQL_API_KEY=your_graph_api_key

# Optional (for Briq analytics)
# Requires Hardhat node running on localhost:8545 with deployed contracts
```

## Usage

```bash
# Start the MCP server
node index.js

# Test a tool
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_gas_prices", "arguments": {"network": "ethereum", "detail": "simple"}}}' | node index.js
```

## Benefits

- **Clean Architecture**: Separation of concerns with focused services
- **Natural Language**: Conversational responses throughout
- **Maintainable**: Easy to modify or extend individual services
- **Testable**: Services can be unit tested independently
- **Scalable**: Simple to add new data sources or tools
