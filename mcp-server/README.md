# Briq MCP Server

Model Context Protocol server providing real-time blockchain data and DeFi analytics for the Rupert AI assistant.

## Architecture

```
mcp-server/
├── index.js                       # Main MCP server
├── src/
│   ├── services/                  # Business logic services
│   │   ├── GasPriceService.js        # Gas price fetching & formatting
│   │   ├── TokenPriceService.js      # Token price data with caching
│   │   ├── BriqAnalyticsService.js   # Briq protocol analytics
│   │   ├── DeFiMarketService.js      # DeFi market data from The Graph
│   │   ├── StrategyService.js        # Strategy management
│   │   └── AutonomousOptimizer.js    # Autonomous strategy optimization
│   ├── clients/                   # API clients with rate limiting
│   │   ├── EtherscanClient.js        # Etherscan API wrapper
│   │   ├── GraphQLClient.js          # The Graph API wrapper
│   │   └── ViemClient.js             # Blockchain contract interactions
│   ├── formatters/                # Natural language formatters
│   │   ├── GasPriceFormatter.js      # Gas price natural language
│   │   ├── AnalyticsFormatter.js     # Analytics natural language
│   │   └── MarketDataFormatter.js    # Market data natural language
│   ├── config/                    # Configuration
│   │   └── contractAddresses.js      # Contract address management
│   ├── abis/                      # Contract ABIs
│   └── utils/                     # Utilities
│       ├── logger.js                 # Structured logging
│       ├── errorResponse.js          # Standardized error responses
│       ├── validation.js             # Input validation
│       └── RateLimiter.js            # Rate limiting with retry logic
├── package.json
└── README.md
```

## Available Tools

### Core Data Tools
- `get_gas_prices` - Current gas prices for Ethereum/Arbitrum with USD conversion
- `get_detailed_gas_prices` - Detailed gas prices with all tiers (safe, standard, fast)
- `get_token_prices` - Real-time ETH/WETH/USDC prices from CoinMarketCap
- `get_market_data` - Live DeFi market data from Aave V3 and Compound V3

### Briq Protocol Tools
- `get_briq_data` - Briq protocol analytics (TVL, performance, allocations, rewards)
- `get_current_strategies` - Current strategy assignments and APYs for all tokens
- `optimize_strategies` - Analyze market data and set optimal strategies

### Autonomous Optimization Tools
- `start_autonomous_optimization` - Start Rupert autonomous strategy optimization (5-minute intervals)
- `stop_autonomous_optimization` - Stop autonomous optimization
- `get_optimization_status` - Get status and last optimization results
- `get_rupert_wallet_status` - Get Rupert wallet address, ETH balance, and network status

### System Tools
- `health_check` - Server health and service status verification

## Features

### Performance
- **Async Operations**: Non-blocking file I/O and contract loading
- **Parallel Loading**: ABIs load simultaneously for faster startup
- **Promise Deduplication**: Prevents duplicate contract address loads
- **Fast Startup**: ~5ms startup time

### Reliability
- **Retry Logic**: Exponential backoff (1s → 2s → 4s) on API failures
- **Service Degradation**: Optional services fail gracefully
- **Self-Contained**: Independent deployment with local ABIs and config

## Environment Variables

### Required (in `.env.local`)
```env
ETHERSCAN_API_KEY=your_etherscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
NEXT_PUBLIC_GRAPHQL_API_KEY=your_graph_api_key
```

### Optional (in `hardhat/.env`)
```env
# For autonomous optimization features
RUPERT_ADDRESS=0x...
RUPERT_PRIVATE_KEY=0x...
RPC_URL=http://localhost:8545  # defaults to localhost:8545

# For frontend logging
FRONTEND_URL=http://localhost:3000  # defaults to localhost:3000

# For logging level
LOG_LEVEL=debug  # options: debug, info, warn, error (default: info)
```

**Note**: Without `RUPERT_PRIVATE_KEY`, the server runs in read-only mode (no autonomous optimization).

## Usage

### Start Server
```bash
node index.js
```

### Test Tools

#### Health Check
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "health_check", "arguments": {}}}' | node index.js
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2026-01-30T00:08:21.676Z",
  "services": {
    "tokenPriceService": "ok",
    "gasPriceService": "ok",
    "defiMarketService": "ok",
    "briqAnalyticsService": "ok",
    "strategyService": "degraded",
    "autonomousOptimizer": "running"
  }
}
```

#### Token Prices
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_token_prices", "arguments": {}}}' | node index.js
```

#### Gas Prices
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_gas_prices", "arguments": {"networks": ["ethereum", "arbitrum"]}}}' | node index.js
```

#### Briq Analytics
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_briq_data", "arguments": {}}}' | node index.js
```

#### Market Data
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_market_data", "arguments": {"tokens": ["USDC"], "networks": ["Arbitrum One"]}}}' | node index.js
```

## Structured Logging

All logs are output in JSON format for easy parsing:

```json
{"timestamp":"2026-01-30T00:08:23.376Z","level":"INFO","message":"Setting optimal strategy","token":"USDC","strategy":"Aave V3","apy":"3.05"}
{"timestamp":"2026-01-30T00:08:23.504Z","level":"INFO","message":"Strategy change executed","token":"USDC","from":"None","to":"Aave V3","improvement":"3.05","txHash":"0x1cc..."}
```

### Filter Logs
```bash
# Show only errors
node index.js 2>&1 | grep '"level":"ERROR"'

# Track specific token
node index.js 2>&1 | grep '"token":"USDC"'

# Show warnings and errors
node index.js 2>&1 | grep -E '"level":"(ERROR|WARN)"'
```

## Monitoring & Deployment

### Health Check Endpoint
Use for:
- Deployment verification
- Load balancer health checks
- Kubernetes liveness/readiness probes
- Monitoring tools (CloudWatch, DataDog)

### Docker/Kubernetes
```yaml
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"health_check","arguments":{}}}' | node index.js | grep -q "healthy"
  periodSeconds: 30
```

## Error Handling

All errors follow a standardized format:

```json
{
  "error": {
    "type": "api_error",
    "message": "CoinMarketCap API error: 429",
    "tool": "get_token_prices",
    "timestamp": "2026-01-30T00:08:21.676Z"
  }
}
```

Error types: `validation_error`, `api_error`, `configuration_error`, `network_error`, `rate_limit_error`, `timeout_error`, `unknown_error`

## Rate Limiting

- **Etherscan**: 5 requests/minute
- **CoinMarketCap**: 10 requests/minute  
- **The Graph**: 10 requests/minute

Automatic retry with exponential backoff on rate limit errors.

## Benefits

- **Production-Ready**: Comprehensive error handling, logging, and monitoring
- **Observable**: Structured logs for debugging and analytics
- **Reliable**: Rate limiting, retries, and graceful degradation
- **Fast**: Async operations and intelligent caching
- **Maintainable**: Clean architecture with separation of concerns
- **Testable**: Services can be unit tested independently
- **Scalable**: Easy to add new data sources or tools
- **Self-Contained**: Independent deployment with no frontend dependencies
