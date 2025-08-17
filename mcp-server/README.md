# Rupert MCP Server

A Model Context Protocol (MCP) server that provides Rupert AI assistant with access to real-time DeFi market data from Aave V3 and Compound V3 protocols.

## Features

- **Real-time Market Data**: Fetches current APY, TVL, and utilization data from GraphQL subgraphs
- **Multi-network Support**: Supports both Ethereum and Arbitrum One
- **Token Support**: USDC and WETH markets
- **Best Yield Finding**: Automatically finds the best yield opportunities
- **Filtering**: Filter by network, token, or protocol

## Setup

1. **Environment Variables**: Ensure your `.env.local` file in the main project has:
   ```
   NEXT_PUBLIC_GRAPHQL_API_KEY=your_graph_api_key
   ```

2. **Dependencies**: Already installed via main project setup

## Available Tools

### 1. `get_market_data`
Get current DeFi market data with optional filtering.

**Parameters:**
- `network` (optional): "Ethereum" or "Arbitrum One"
- `token` (optional): "USDC" or "WETH"  
- `protocol` (optional): "Aave V3" or "Compound V3"

### 2. `get_best_yield`
Find the best yield opportunities for a specific token.

**Parameters:**
- `token` (optional): "USDC" or "WETH" (defaults to "USDC")

## Integration

This MCP server is automatically integrated with the Rupert chat interface. When users ask market-related questions, the chat API:

1. Detects market keywords in user messages
2. Automatically starts the MCP server
3. Fetches real-time data
4. Provides the data to Rupert for accurate responses

## Data Source

Uses GraphQL subgraphs for:
- **Aave V3** on Ethereum and Arbitrum
- **Compound V3** on Ethereum and Arbitrum

Returns:
- **APY**: Annual Percentage Yield for lending
- **TVL**: Total Value Locked in USD
- **Utilization**: Percentage of funds currently borrowed
- **Network**: Ethereum or Arbitrum One
- **Protocol**: Aave V3 or Compound V3

## Architecture

- **Server**: Node.js with MCP SDK
- **Communication**: JSON-RPC over stdio
- **Data Fetching**: GraphQL requests to The Graph
- **Integration**: Automatic startup via chat API
