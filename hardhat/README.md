# Briq Smart Contracts

This repository contains the smart contracts for Briq, a decentralized finance (DeFi) protocol that optimizes yield generation by automatically allocating user deposits across multiple lending protocols. These contracts form the core blockchain infrastructure of the Briq application.

## About This Repository

This hardhat project contains the **smart contract layer** of Briq, including:
- Core vault and shares contracts
- Strategy implementations for Aave V3 and Compound V3
- Strategy coordination logic
- Comprehensive test suite with multi-chain support

**Note**: This is only one component of the complete Briq application. The full Briq ecosystem includes additional components such as frontend interfaces, backend services, and other infrastructure not contained in this repository.

## Features

- **Multi-Protocol Integration**: Supports Aave V3 and Compound V3 lending protocols
- **Automated Strategy Coordination**: Intelligent routing of funds to optimize yields
- **Cross-Chain Support**: Compatible with Ethereum, Arbitrum, and Base networks
- **Vault-Based Architecture**: Secure deposit and withdrawal mechanisms
- **Gas Optimized**: Efficient smart contract design for minimal transaction costs

## Prerequisites

- Node.js (v22.13.1 or higher)
- npm or yarn
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/cadenpiper/briq.git
cd briq/hardhat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
# Alchemy API key for blockchain RPC access
ALCHEMY_API_KEY=

# Private key for deployment (without 0x prefix)
PRIVATE_KEY=

# API keys for contract verification & gas reporting (Optional)
ETHERSCAN_API_KEY=

# CoinMarketCap API key for gas reporting (Optional)
COINMARKETCAP_API_KEY=
```

## Project Structure

```
briq/
├── contracts/
│   ├── BriqVault.sol                   # Main vault contract
│   ├── BriqShares.sol                  # ERC20 shares token
│   ├── StrategyBase.sol                # Base strategy contract
│   ├── StrategyCoordinator.sol         # Strategy coordination logic
│   ├── strategies/                     # Individual strategy implementations
│   │   ├── StrategyAave.sol            # Aave V3 integration
│   │   └── StrategyCompoundComet.sol   # Compound V3 (Comet )integration
│   ├── interfaces/
│   └── libraries/
├── test/
│   ├── BriqVault.js                    # Vault contract tests
│   ├── BriqShares.js                   # Shares token tests
│   ├── StrategyAave.js                 # Aave strategy tests
│   ├── StrategyCompound.js             # Compound strategy tests
│   └── StrategyCoordinator.js          # Coordinator tests
├── ignition/                           # Deployment modules
│   └── modules/
├── scripts/                            # Utility scripts (empty)
├── config.json                         # Multi-chain configuration for tests
├── hardhat.config.js                   # Hardhat configuration
└── .env                                # Environment variables
```

## Configuration

The project uses a `config.json` file for multi-chain deployments. This file contains network-specific addresses for:

- USDC token contracts
- Aave V3 pool addresses
- Compound V3 comet addresses
- Whale addresses for testing

Currently supported networks:
- **Ethereum Mainnet** (Chain ID: 1)
- **Arbitrum One Mainnet** (Chain ID: 42161)
- **Base Mainnet** (Chain ID: 8453)

## Testing

The project includes comprehensive unit tests with gas reporting enabled and multi-chain fork testing.

### Run all tests:
```bash
npx hardhat test
```

### Run specific test files:
```bash
# Test the main vault
npx hardhat test test/BriqVault.js

# Test Aave strategy
npx hardhat test test/StrategyAave.js

# Test Compound strategy
npx hardhat test test/StrategyCompound.js

# Test strategy coordinator
npx hardhat test test/StrategyCoordinator.js
```

### Network Configuration for Testing

The `hardhat.config.js` file is configured to fork different mainnet networks for testing. To switch between networks, uncomment the desired network configuration (Only one forked network can be active at a time for Hardhat forking):

```javascript
// For Ethereum mainnet fork
hardhat: {
  chainId: 1,
  forking: {
    url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  },
}

// For Arbitrum mainnet fork
hardhat: {
  chainId: 42161,
  forking: {
    url: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  },
}

// For Base mainnet fork
hardhat: {
  chainId: 8453,
  forking: {
    url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  },
}
```

### Gas Reporting Configuration

Gas reporting is configured in `hardhat.config.js`. To change the gas reporting for different chains:

 - **Ethereum Mainnet**: Use the default configuration (no extra chain specification needed)
 - **Layer 2 Networks**: Update the `L2` option in the gas reporter config
 
Example for different networks:
```javascript
gasReporter: {
  enabled: process.env.REPORT_GAS !== undefined,
  currency: "USD",
  coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  L2: "base", // Base mainnet
  // Omit any option for Ethereum mainnet, this is the default
}
```

## Smart Contract Architecture

### Core Contracts

- **BriqVault**: Main entry point for user deposits and withdrawals
- **BriqShares**: ERC20 token representing user shares in the vault
- **StrategyCoordinator**: Manages and routes funds between different yield strategies
- **StrategyBase**: Abstract base contract for all yield strategies

### Strategy Implementations

- **StrategyAave**: Integrates with Aave V3 lending pools
- **StrategyCompoundComet**: Integrates with Compound V3 (Comet) markets

## Development

### Compilation
```bash
npx hardhat compile
```

### Local Development Network
```bash
npx hardhat node
```

### Deployment (if deploying)
```bash
npx hardhat ignition deploy ./ignition/modules/YourModule.js --network <network-name>
```

## Security Considerations

- All contracts inherit from OpenZeppelin's battle-tested implementations
- Comprehensive test coverage across multiple network forks
- Emergency withdrawal mechanisms for fund recovery

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Links

- **Repository**: https://github.com/cadenpiper/briq
- **Issues**: https://github.com/cadenpiper/briq/issues

---

**Note**: This project is under active development. Use at your own risk and always audit smart contracts before deploying to mainnet.
