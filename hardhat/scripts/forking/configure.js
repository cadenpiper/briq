/**
 * Configure Script - Briq Protocol
 * 
 * This script configures the deployed Briq Protocol contracts by:
 * 1. Setting up contract relationships (vault ↔ shares, strategies ↔ coordinator)
 * 2. Configuring Aave strategy with pool address and supported tokens
 * 3. Configuring Compound strategy with market addresses and supported tokens
 * 4. Setting up token routing (USDC → Aave, WETH → Compound)
 * 5. Updating frontend addresses for the UI
 * 
 * Requires deployment.json from the deploy script and config.json for network settings.
 */

const { ethers } = require("hardhat");
const fs = require('fs');
const { updateFrontendAddresses } = require('./updateFrontendAddresses');

async function main() {
  console.log("⚙️  Configuring Briq Protocol\n");
  
  // Load deployment addresses
  if (!fs.existsSync('./deployment.json')) {
    throw new Error("deployment.json not found. Run deploy script first.");
  }
  
  const deploymentData = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  const contracts = deploymentData.contracts;
  
  // Get contract instances
  const briqVault = await ethers.getContractAt("BriqVault", contracts.BriqVault);
  const briqShares = await ethers.getContractAt("BriqShares", contracts.BriqShares);
  const strategyAave = await ethers.getContractAt("StrategyAave", contracts.StrategyAave);
  const strategyCompound = await ethers.getContractAt("StrategyCompoundComet", contracts.StrategyCompoundComet);
  const strategyCoordinator = await ethers.getContractAt("StrategyCoordinator", contracts.StrategyCoordinator);
  
  // Load network configuration
  const chainId = (await ethers.provider.getNetwork()).chainId;
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
    wethAddress: WETH_ADDRESS
  } = chainConfig;

  console.log("🔗 Setting up contract relationships...");
  
  // Set vault address in shares contract
  await (await briqShares.setVault(contracts.BriqVault)).wait();
  
  // Set coordinator addresses in strategies
  await (await strategyAave.setCoordinator(contracts.StrategyCoordinator)).wait();
  await (await strategyCompound.setCoordinator(contracts.StrategyCoordinator)).wait();
  
  // Set vault address in coordinator
  await (await strategyCoordinator.updateVaultAddress(contracts.BriqVault)).wait();
  
  console.log("✅ Contract relationships established");

  console.log("\n🏦 Configuring Aave strategy...");
  
  // Set Aave pool address and supported tokens
  await (await strategyAave.setAavePool(AAVE_POOL_V3)).wait();
  await (await strategyAave.addSupportedToken(USDC_ADDRESS)).wait();
  await (await strategyAave.addSupportedToken(WETH_ADDRESS)).wait();
  
  console.log("✅ Aave strategy configured");

  console.log("\n🏛️  Configuring Compound strategy...");
  
  // Set Compound market addresses and supported tokens
  await (await strategyCompound.updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true)).wait();
  await (await strategyCompound.updateMarketSupport(COMPOUND_COMET_WETH, WETH_ADDRESS, true)).wait();
  await (await strategyCompound.updateTokenSupport(USDC_ADDRESS, true)).wait();
  await (await strategyCompound.updateTokenSupport(WETH_ADDRESS, true)).wait();
  
  console.log("✅ Compound strategy configured");

  console.log("\n🎯 Setting up token routing...");
  
  // Route USDC to Aave (strategy 0) and WETH to Compound (strategy 1)
  await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 0)).wait();
  await (await strategyCoordinator.setStrategyForToken(WETH_ADDRESS, 1)).wait();
  
  console.log("✅ Token routing: USDC → Aave, WETH → Compound");

  console.log("\n🔄 Updating frontend addresses...");
  
  // Update frontend with deployed contract addresses
  const deployedAddresses = {
    VAULT: contracts.BriqVault,
    SHARES: contracts.BriqShares,
    USDC: USDC_ADDRESS,
    WETH: WETH_ADDRESS
  };
  
  updateFrontendAddresses(deployedAddresses);
  console.log("✅ Frontend addresses synchronized");

  console.log("\n✅ Configuration complete!");
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Configuration failed:", error);
    process.exit(1);
  });
