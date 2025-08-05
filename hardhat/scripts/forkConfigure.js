/**
 * Briq Protocol Fork Configuration Script
 * 
 * This script configures the deployed Briq vault system specifically for forked
 * network testing environments. It sets up all contract relationships, protocol
 * integrations, and creates a ready-to-use testing environment with funded accounts.
 * 
 * Purpose: Enable immediate testing and interaction with the Briq protocol on a
 * forked mainnet where we have access to real protocol addresses and whale accounts.
 * 
 * Fork-Specific Features:
 * - Uses real mainnet protocol addresses (Aave, Compound)
 * - Impersonates whale accounts to fund test users
 * - Sets up realistic testing scenarios with actual tokens
 * - Configures routing based on mainnet market conditions
 * 
 * Configuration Steps:
 * 1. Establish contract relationships (vault ↔ shares, strategies ↔ coordinator)
 * 2. Configure Aave strategy with mainnet pool address and supported tokens
 * 3. Configure Compound strategy with mainnet market addresses and supported tokens
 * 4. Set default routing (USDC → Aave, WETH → Compound)
 * 5. Fund test accounts with real tokens for immediate testing
 * 
 * After running this script, the forked environment is ready for users to deposit
 * USDC and WETH into the vault and receive BRIQ shares representing their position.
 * 
 * Note: This script is designed for forked networks only. For testnet or mainnet
 * deployments, use different configuration scripts that don't rely on impersonation.
 */

const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("⚙️  Configuring Briq Protocol for Fork Testing...\n");

  // Load deployment info from forkDeploy.js
  if (!fs.existsSync('./deployment.json')) {
    throw new Error("deployment.json not found. Run forkDeploy.js first.");
  }

  const deploymentInfo = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  const chainId = (await ethers.provider.getNetwork()).chainId;

  if (deploymentInfo.chainId !== chainId.toString()) {
    throw new Error(`Chain mismatch. Deployment: ${deploymentInfo.chainId}, Current: ${chainId}`);
  }

  // Load mainnet fork configuration
  const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  const chainConfig = configData.CHAIN_CONFIG[chainId.toString()];
  if (!chainConfig) {
    throw new Error(`No fork configuration found for chain ID ${chainId}`);
  }

  const {
    usdcWhale: USDC_WHALE,
    wethWhale: WETH_WHALE,
    aavePoolV3: AAVE_POOL_V3,
    compoundMarketUSDC: COMPOUND_COMET_USDC,
    compoundMarketWETH: COMPOUND_COMET_WETH,
    usdcAddress: USDC_ADDRESS,
    wethAddress: WETH_ADDRESS
  } = chainConfig;

  console.log(`Fork Network: Chain ID ${chainId}`);
  console.log(`Mainnet Tokens: USDC (${USDC_ADDRESS}), WETH (${WETH_ADDRESS})\n`);

  // Get contract instances
  const briqShares = await ethers.getContractAt("BriqShares", deploymentInfo.contracts.BriqShares);
  const strategyAave = await ethers.getContractAt("StrategyAave", deploymentInfo.contracts.StrategyAave);
  const strategyCompound = await ethers.getContractAt("StrategyCompoundComet", deploymentInfo.contracts.StrategyCompoundComet);
  const strategyCoordinator = await ethers.getContractAt("StrategyCoordinator", deploymentInfo.contracts.StrategyCoordinator);
  const briqVault = await ethers.getContractAt("BriqVault", deploymentInfo.contracts.BriqVault);

  // 1. Set up contract relationships
  console.log("🔗 Setting up contract relationships...");
  
  await (await briqShares.setVault(deploymentInfo.contracts.BriqVault)).wait();
  await (await strategyAave.setCoordinator(deploymentInfo.contracts.StrategyCoordinator)).wait();
  await (await strategyCompound.setCoordinator(deploymentInfo.contracts.StrategyCoordinator)).wait();
  await (await strategyCoordinator.updateVaultAddress(deploymentInfo.contracts.BriqVault)).wait();
  
  console.log("   ✅ Contract relationships established");

  // 2. Configure Aave strategy with mainnet addresses
  console.log("\n🏦 Configuring Aave strategy (mainnet integration)...");
  
  await (await strategyAave.setAavePool(AAVE_POOL_V3)).wait();
  await (await strategyAave.addSupportedToken(USDC_ADDRESS)).wait();
  await (await strategyAave.addSupportedToken(WETH_ADDRESS)).wait();
  
  console.log("   ✅ Aave mainnet pool and tokens configured");

  // 3. Configure Compound strategy with mainnet addresses
  console.log("\n🏛️  Configuring Compound strategy (mainnet integration)...");
  
  await (await strategyCompound.updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true)).wait();
  await (await strategyCompound.updateMarketSupport(COMPOUND_COMET_WETH, WETH_ADDRESS, true)).wait();
  await (await strategyCompound.updateTokenSupport(USDC_ADDRESS, true)).wait();
  await (await strategyCompound.updateTokenSupport(WETH_ADDRESS, true)).wait();
  
  console.log("   ✅ Compound mainnet markets and tokens configured");

  // 4. Set default routing strategies
  console.log("\n🎯 Setting up token routing...");
  
  await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 0)).wait(); // Aave
  await (await strategyCoordinator.setStrategyForToken(WETH_ADDRESS, 1)).wait(); // Compound
  
  console.log("   ✅ USDC → Aave, WETH → Compound");

  // 5. Set up fork testing environment with whale accounts
  console.log("\n💰 Setting up fork testing environment...");
  
  const [deployer, user1, user2] = await ethers.getSigners();
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);

  // Impersonate mainnet whale accounts (fork-specific feature)
  await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
  await ethers.provider.send("hardhat_impersonateAccount", [WETH_WHALE]);
  
  const usdcWhale = await ethers.getSigner(USDC_WHALE);
  const wethWhale = await ethers.getSigner(WETH_WHALE);

  // Fund whales with ETH for gas (fork-specific)
  await ethers.provider.send("hardhat_setBalance", [USDC_WHALE, "0x1000000000000000000"]);
  await ethers.provider.send("hardhat_setBalance", [WETH_WHALE, "0x1000000000000000000"]);

  // Transfer real tokens to test accounts
  const usdcAmount = ethers.parseUnits("1000", 6); // 1000 USDC
  const wethAmount = ethers.parseUnits("1", 18);   // 1 WETH

  await usdc.connect(usdcWhale).transfer(user1.address, usdcAmount);
  await usdc.connect(usdcWhale).transfer(user2.address, usdcAmount);
  await weth.connect(wethWhale).transfer(user1.address, wethAmount);
  await weth.connect(wethWhale).transfer(user2.address, wethAmount);

  console.log(`   ✅ Funded ${user1.address} with 1000 USDC + 1 WETH`);
  console.log(`   ✅ Funded ${user2.address} with 1000 USDC + 1 WETH`);

  // Update deployment info
  deploymentInfo.configured = true;
  deploymentInfo.configurationTimestamp = new Date().toISOString();
  deploymentInfo.forkTestAccounts = {
    user1: user1.address,
    user2: user2.address
  };

  fs.writeFileSync('./deployment.json', JSON.stringify(deploymentInfo, null, 2));

  console.log("\n✅ Fork configuration complete!");
  console.log("\n🎉 Briq Protocol is ready for fork testing!");
  console.log("\nTest with real mainnet integrations:");
  console.log(`   Vault: ${deploymentInfo.contracts.BriqVault}`);
  console.log(`   Shares: ${deploymentInfo.contracts.BriqShares}`);
  console.log(`   User1: ${user1.address}`);
  console.log(`   User2: ${user2.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Fork configuration failed:", error);
    process.exit(1);
  });
