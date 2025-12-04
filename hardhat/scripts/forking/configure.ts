import { network } from "hardhat";
import fs from 'fs';
import { updateFrontendAddresses } from './updateFrontendAddresses.js';

async function main() {
  console.log("⚙️  Configuring Briq Protocol\n");
  
  // Load deployment addresses
  if (!fs.existsSync('./deployment.json')) {
    throw new Error("deployment.json not found. Run deploy script first.");
  }
  
  const deploymentData = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  const contracts = deploymentData.contracts;
  
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  
  // Load network configuration
  const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  
  // Map hardhat local chain ID to mainnet fork config
  let configChainId = chainId.toString();
  if (chainId.toString() === "31337") {
    configChainId = "31337"; // Use hardhat fork config
  }
  
  const chainConfig = configData.CHAIN_CONFIG[configChainId];
  if (!chainConfig) {
    throw new Error(`No configuration found for chain ID ${chainId}`);
  }

  // Extract network addresses
  const {
    aavePoolV3: AAVE_POOL_V3,
    compoundMarketUSDC: COMPOUND_COMET_USDC,
    compoundMarketWETH: COMPOUND_COMET_WETH,
    usdcAddress: USDC_ADDRESS,
    wethAddress: WETH_ADDRESS,
    priceFeeds: PRICE_FEEDS
  } = chainConfig;
  
  // Verify we're on Arbitrum fork
  const usdcCode = await publicClient.getCode({ address: USDC_ADDRESS });
  if (!usdcCode || usdcCode === '0x') {
    throw new Error("USDC contract not found - ensure you're on Arbitrum fork");
  }

  // Use price feeds from config.json
  const CHAINLINK_FEEDS = {
    USDC_USD: PRICE_FEEDS.USDC, // USDC/USD
    ETH_USD: PRICE_FEEDS.WETH   // ETH/USD
  };

  console.log("📊 Setting up price feeds...");
  
  // Get contract instances
  const priceFeedManager = await viem.getContractAt("PriceFeedManager", contracts.PriceFeedManager);
  const briqVault = await viem.getContractAt("BriqVault", contracts.BriqVault);
  const briqShares = await viem.getContractAt("BriqShares", contracts.BriqShares);
  const strategyAave = await viem.getContractAt("StrategyAave", contracts.StrategyAave);
  const strategyCompound = await viem.getContractAt("StrategyCompoundComet", contracts.StrategyCompoundComet);
  const strategyCoordinator = await viem.getContractAt("StrategyCoordinator", contracts.StrategyCoordinator);
  
  // Configure USDC price feed (6 decimals)
  await priceFeedManager.write.setPriceFeed([
    USDC_ADDRESS,
    CHAINLINK_FEEDS.USDC_USD,
    6
  ]);
  
  // Configure WETH price feed (18 decimals)
  await priceFeedManager.write.setPriceFeed([
    WETH_ADDRESS,
    CHAINLINK_FEEDS.ETH_USD,
    18
  ]);
  
  console.log("✅ Price feeds configured");

  console.log("\n🔗 Setting up contract relationships...");
  
  // Set vault address in shares contract
  try {
    await briqShares.write.setVault([contracts.BriqVault]);
  } catch (error: any) {
    const currentVault = await briqShares.read.vault();
    if (currentVault.toLowerCase() !== contracts.BriqVault.toLowerCase()) {
      throw error;
    }
  }
  
  // Set coordinator addresses in strategies
  try {
    await strategyAave.write.setCoordinator([contracts.StrategyCoordinator]);
  } catch (error: any) {
    const currentCoordinator = await strategyAave.read.coordinator();
    if (currentCoordinator.toLowerCase() !== contracts.StrategyCoordinator.toLowerCase()) {
      throw error;
    }
  }

  try {
    await strategyCompound.write.setCoordinator([contracts.StrategyCoordinator]);
  } catch (error: any) {
    const currentCoordinator = await strategyCompound.read.coordinator();
    if (currentCoordinator.toLowerCase() !== contracts.StrategyCoordinator.toLowerCase()) {
      throw error;
    }
  }
  
  // Set vault address in coordinator
  try {
    await strategyCoordinator.write.updateVaultAddress([contracts.BriqVault]);
  } catch (error: any) {
    const currentVault = await strategyCoordinator.read.vault();
    if (currentVault.toLowerCase() !== contracts.BriqVault.toLowerCase()) {
      throw error;
    }
  }
  
  console.log("✅ Contract relationships established");

  console.log("\n🏦 Configuring strategies...");
  
  // Configure Aave strategy
  await strategyAave.write.setAavePool([AAVE_POOL_V3]);
  
  try {
    await strategyAave.write.addSupportedToken([USDC_ADDRESS]);
  } catch (error: any) {
    const isSupported = await strategyAave.read.isTokenSupported([USDC_ADDRESS]);
    if (!isSupported) throw error;
  }

  try {
    await strategyAave.write.addSupportedToken([WETH_ADDRESS]);
  } catch (error: any) {
    const isSupported = await strategyAave.read.isTokenSupported([WETH_ADDRESS]);
    if (!isSupported) throw error;
  }
  
  // Configure Compound strategy
  try {
    await strategyCompound.write.updateMarketSupport([COMPOUND_COMET_USDC, USDC_ADDRESS, true]);
  } catch (error: any) {
    // Market support may already be configured
  }

  try {
    await strategyCompound.write.updateMarketSupport([COMPOUND_COMET_WETH, WETH_ADDRESS, true]);
  } catch (error: any) {
    // Market support may already be configured
  }

  try {
    await strategyCompound.write.updateTokenSupport([USDC_ADDRESS, true]);
  } catch (error: any) {
    // Token support may already be configured
  }

  try {
    await strategyCompound.write.updateTokenSupport([WETH_ADDRESS, true]);
  } catch (error: any) {
    // Token support may already be configured
  }
  
  // Set up token routing
  await strategyCoordinator.write.setStrategyForToken([USDC_ADDRESS, 0]);
  await strategyCoordinator.write.setStrategyForToken([WETH_ADDRESS, 1]);
  
  console.log("✅ Strategies configured");

  // Update frontend with deployed contract addresses
  const deployedAddresses = {
    VAULT: contracts.BriqVault,
    SHARES: contracts.BriqShares,
    PRICE_FEED_MANAGER: contracts.PriceFeedManager,
    STRATEGY_COORDINATOR: contracts.StrategyCoordinator,
    STRATEGY_AAVE: contracts.StrategyAave,
    STRATEGY_COMPOUND: contracts.StrategyCompoundComet,
    USDC: USDC_ADDRESS,
    WETH: WETH_ADDRESS
  };
  
  updateFrontendAddresses(deployedAddresses);
  
  console.log("\n✅ Configuration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Configuration failed:", error);
    process.exit(1);
  });
