/**
 * Deploy Script - Briq Protocol with Chainlink Price Feeds
 * 
 * This script deploys all Briq Protocol smart contracts in the correct dependency order:
 * 1. PriceFeedManager (Chainlink price feed integration)
 * 2. BriqShares (ERC20 token for vault shares)
 * 3. StrategyAave (Aave V3 lending strategy)
 * 4. StrategyCompoundComet (Compound V3 strategy)
 * 5. StrategyCoordinator (manages strategy routing)
 * 6. BriqVault (main vault contract with USD-normalized shares)
 * 
 * Deployment addresses are saved to deployment.json for use by other scripts.
 */

import hre from "hardhat";
import fs from 'fs';

async function main() {
  console.log("🚀 Deploying Briq Protocol with Chainlink Price Feeds\n");
  
  // Get public client for network info
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  
  console.log(`Chain ID: ${chainId}\n`);

  // Deploy contracts in dependency order
  console.log("📄 Deploying contracts...");

  // 1. Deploy PriceFeedManager (Chainlink price feed integration)
  const priceFeedManager = await hre.viem.deployContract("PriceFeedManager");
  console.log(`   PriceFeedManager: ${priceFeedManager.address}`);

  // 2. Deploy BriqShares (ERC20 token for vault shares)
  const briqShares = await hre.viem.deployContract("BriqShares", ["Briq Shares", "BRIQ"]);
  console.log(`   BriqShares: ${briqShares.address}`);

  // 3. Deploy StrategyAave (Aave V3 lending strategy)
  const strategyAave = await hre.viem.deployContract("StrategyAave");
  console.log(`   StrategyAave: ${strategyAave.address}`);

  // 4. Deploy StrategyCompoundComet (Compound V3 strategy)
  const strategyCompound = await hre.viem.deployContract("StrategyCompoundComet");
  console.log(`   StrategyCompoundComet: ${strategyCompound.address}`);

  // 5. Deploy StrategyCoordinator (manages strategy routing)
  const strategyCoordinator = await hre.viem.deployContract("StrategyCoordinator", [
    strategyAave.address,
    strategyCompound.address
  ]);
  console.log(`   StrategyCoordinator: ${strategyCoordinator.address}`);

  // 6. Deploy BriqVault (main vault contract with USD-normalized shares)
  const briqVault = await hre.viem.deployContract("BriqVault", [
    strategyCoordinator.address,
    briqShares.address,
    priceFeedManager.address
  ]);
  console.log(`   BriqVault: ${briqVault.address}`);

  console.log("\n✅ Deployment complete!");
  
  // Save deployment addresses for other scripts to use
  const deploymentData = {
    chainId: chainId.toString(),
    timestamp: new Date().toISOString(),
    contracts: {
      PriceFeedManager: priceFeedManager.address,
      BriqVault: briqVault.address,
      BriqShares: briqShares.address,
      StrategyAave: strategyAave.address,
      StrategyCompoundComet: strategyCompound.address,
      StrategyCoordinator: strategyCoordinator.address
    }
  };
  
  fs.writeFileSync('./deployment.json', JSON.stringify(deploymentData, null, 2));
  console.log("📝 Addresses saved to deployment.json");
  
  console.log("\n🔗 Key Features Deployed:");
  console.log("   • USD-normalized share distribution");
  console.log("   • Chainlink price feed integration");
  console.log("   • Multi-token support (USDC, WETH)");
  console.log("   • Fair share allocation regardless of deposit token");
  
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
