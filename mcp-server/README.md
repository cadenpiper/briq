# Rupert MCP Server

A Model Context Protocol (MCP) server that provides real-time blockchain and DeFi data for the Rupert AI assistant.

## Overview

This MCP server enables Rupert to access current market data including:
- **Token Prices**: Real-time ETH and USDC prices from Etherscan
- **Gas Prices**: Current gas costs for Ethereum and Arbitrum with USD conversion
- **DeFi Markets**: Yield rates and TVL data from Aave V3 and Compound V3 via The Graph

## Features

### 🔗 **Blockchain Data**
- Real-time token prices from Etherscan API
- Gas price tracking for Ethereum and Arbitrum networks
- USD cost calculations for transactions

### 📊 **DeFi Protocol Integration**
- Market data from Aave V3 and Compound V3
- Yield optimization recommendations
- TVL and utilization metrics

### 🌐 **Multi-Network Support**
- Ethereum mainnet
- Arbitrum One
- Unified API endpoints via Etherscan v2

## Available Tools

### `get_token_prices`
Returns current prices for supported tokens.

**Response:**
```
Current Token Prices:
Ethereum (ETH): $4,479.45
USD Coin (USDC): $1.00
```

### `get_gas_prices`
Returns current gas prices with USD conversion.

**Parameters:**
- `network`: `ethereum`, `arbitrum`, or `both` (default: `both`)

**Response:**
```
Current Gas Prices:

Ethereum:
  Safe: 0.194 gwei ($0.018 for transfer)
  Standard: 0.197 gwei ($0.019 for transfer)
  Fast: 0.217 gwei ($0.020 for transfer)
  ETH Price: $4479.45

Arbitrum:
  Safe: 0.194 gwei ($0.018 for transfer)
  Standard: 0.197 gwei ($0.019 for transfer)
  Fast: 0.217 gwei ($0.020 for transfer)
  ETH Price: $4479.45
```

### `get_market_data`
Returns DeFi protocol market information.

**Parameters:**
- `network`: Filter by network (optional)
- `token`: Filter by token (optional)
- `protocol`: Filter by protocol (optional)

### `get_best_yield`
Finds the highest yield opportunities for a token.

**Parameters:**
- `token`: `USDC` or `WETH` (default: `USDC`)

## Configuration

### Environment Variables
Required in `.env.local`:
```env
ETHERSCAN_API_KEY=your_etherscan_api_key
NEXT_PUBLIC_GRAPHQL_API_KEY=your_graph_api_key
```

### Data Sources
- **Etherscan API**: Token prices and gas data
- **The Graph**: DeFi protocol data via subgraphs
- **Supported Networks**: Ethereum, Arbitrum One

## Installation

```bash
cd mcp-server
npm install
```

## Usage

### Standalone Testing
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_gas_prices", "arguments": {"network": "both"}}}' | node index.js
```

### Integration with Rupert
The server is automatically started by the chat API when blockchain-related queries are detected.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Rupert Chat   │───▶│   Chat API       │───▶│   MCP Server    │
│   Interface     │    │   (route.js)     │    │   (index.js)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  External APIs  │
                                               │                 │
                                               │ • Etherscan     │
                                               │ • The Graph     │
                                               └─────────────────┘
```

## Error Handling

- **API Rate Limits**: Automatic delays between requests
- **Network Failures**: Graceful fallbacks with typical values
- **Invalid Responses**: Error messages with context

## Development

### Adding New Tools
1. Add tool definition in `setupToolHandlers()`
2. Implement handler method
3. Add parameter extraction logic
4. Update documentation

### Testing
```bash
# Test token prices
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_token_prices", "arguments": {}}}' | node index.js

# Test gas prices
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "get_gas_prices", "arguments": {"network": "ethereum"}}}' | node index.js
```

## License

Part of the Briq DeFi platform.
