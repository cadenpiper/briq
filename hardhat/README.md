# Briq Core

Smart contracts powering the Briq protocol - a multi-strategy yield vault with USD-normalized shares.

## Features

- **Multi-Strategy Yield Optimization**: Automated deployment across Aave V3 and Compound V3
- **USD-Normalized Shares**: Fair distribution using dual-oracle price feeds (Chainlink + Pyth)
- **Robust Security**: Comprehensive access controls, emergency pause, slippage protection
- **Gas Optimized**: Efficient deployment and execution costs
- **Comprehensive Testing**: 100% test coverage with 150+ tests (TypeScript + Solidity)

## Architecture

### Core Contracts

- **BriqVault**: Main user interface for deposits/withdrawals with USD-normalized shares
- **StrategyCoordinator**: Multi-strategy fund deployment with automatic fallbacks  
- **PriceFeedManager**: Dual-oracle system (Chainlink primary, Pyth fallback)
- **BriqShares**: ERC20 shares token with vault-controlled minting
- **BriqTimelock**: 48-hour governance timelock for critical operations

### Strategy Implementations

- **StrategyAave**: Aave V3 lending integration
- **StrategyCompoundComet**: Compound V3 (Comet) lending integration

## Security

### Audit Status
- **Static Analysis**: Slither analysis
- **Test Coverage**: 100% with 31 BriqVault + 140+ total tests
- **Security Features**: SafeERC20, reentrancy protection, access controls, emergency pause
- **Code Quality**: Immutable variables, custom errors, gas optimization

### Security Features
- **Dual-Oracle Protection**: Eliminates single point of failure in price feeds
- **Automatic Fallbacks**: Strategy failures trigger seamless fallback mechanisms
- **Emergency Controls**: Pause functionality and emergency withdrawal capabilities
- **Access Control**: Timelock-protected admin functions with role-based permissions
- **Slippage Protection**: Configurable limits to protect user withdrawals

## Installation

```bash
npm install
```

## Environment Setup

### Using Hardhat Keystore (Recommended)
```bash
# Set up Arbitrum RPC URL
npx hardhat keystore set ARBITRUM_RPC_URL
# Enter your Alchemy/Infura API URL when prompted

# For deployment (optional)
npx hardhat keystore set PRIVATE_KEY
# Enter your private key when prompted

# Verify keystore setup
npx hardhat keystore list
```

**Note**: The keystore encrypts and stores secrets locally. No `.env` files needed.

## Usage

### Start Local Fork
```bash
# Start Hardhat node with Arbitrum fork
npm run node

# In another terminal, deploy and configure
npm run setup-fork
```

The `setup-fork` command runs:
1. `deploy` - Deploy all contracts
2. `configure` - Configure strategies and price feeds
3. `fund` - Fund test accounts with USDC/WETH
4. `fund-rupert` - Fund Rupert wallet
5. `set-rupert` - Set Rupert as strategy manager
6. `balance` - Check balances

### Individual Scripts

```bash
# Deploy contracts
npm run deploy

# Configure strategies
npm run configure

# Fund test account
npm run fund

# Fund Rupert wallet
npm run fund-rupert

# Set Rupert as manager
npm run set-rupert

# Check balances
npm run balance
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx hardhat test test/BriqVault.ts

# Run Solidity fuzz tests
npx hardhat test test/BriqVault.t.sol

# Run with gas reporting
REPORT_GAS=true npm test
```

### Compilation

```bash
# Compile contracts
npm run compile

# Clean artifacts
npm run clean
```

## Protocol Overview

### User Flow
1. **Deposit**: Users deposit USDC/WETH and receive USD-normalized shares
2. **Strategy Deployment**: Funds automatically deployed to highest-yield strategies
3. **Yield Generation**: Strategies earn yield from Aave V3 and Compound V3
4. **Withdrawal**: Users burn shares to withdraw underlying tokens with yield

### Key Innovations
- **USD Normalization**: Prevents token-specific advantages in share distribution
- **Multi-Strategy Coordination**: Automatic optimization across lending protocols
- **Failure Resilience**: Graceful handling of individual strategy failures
- **Price Feed Redundancy**: Dual-oracle system ensures reliable pricing

## Project Structure

```
hardhat/
├── contracts/
│   ├── BriqVault.sol              # Main vault contract
│   ├── StrategyCoordinator.sol    # Multi-strategy coordinator
│   ├── PriceFeedManager.sol       # Dual-oracle price feeds
│   ├── BriqShares.sol            # ERC20 shares token
│   ├── BriqTimelock.sol          # Governance timelock
│   ├── StrategyBase.sol          # Base strategy implementation
│   ├── strategies/
│   │   ├── StrategyAave.sol      # Aave V3 integration
│   │   └── StrategyCompoundComet.sol # Compound V3 integration
│   ├── interfaces/
│   │   └── IComet.sol            # Compound V3 interface
│   ├── libraries/
│   │   └── Errors.sol            # Custom error definitions
│   └── test/
│       └── MockPriceFeedManager.sol # Test mocks
├── test/                          # Test files (.ts and .sol)
├── scripts/forking/               # Forking utility scripts
├── ignition/                      # Deployment modules
├── audit/                         # Audit documentation
├── config.json                    # Chain configuration
├── deployment.json                # Deployed contract addresses
└── hardhat.config.ts              # Hardhat configuration
```

## Configuration

### config.json
Chain-specific configuration for Arbitrum One:
- Aave V3 pool address
- Compound V3 market addresses (USDC, WETH)
- Token addresses (USDC, WETH)
- Whale addresses for testing
- Chainlink price feed addresses

### deployment.json
Automatically updated with deployed contract addresses after running `npm run deploy`.

## Development

### Prerequisites
- Node.js 18+
- Hardhat v3
- TypeScript
- Alchemy/Infura API key for Arbitrum forking

### Adding New Strategies
1. Inherit from `StrategyBase.sol`
2. Implement required functions: `deposit()`, `withdraw()`, `balanceOf()`, `getCurrentAPY()`
3. Add strategy to `StrategyCoordinator`
4. Write comprehensive tests
5. Update documentation

## License

UNLICENSED

---

**Version**: 1.0.0  
**Network**: Arbitrum One  
**Last Updated**: January 2026
