/**
 * Briq Protocol Deployment Script For Forked Networks
 * 
 * This script deploys the complete Briq vault system to a forked network.
 * The Briq protocol is a yield aggregation vault that routes deposits between
 * different DeFi strategies (Aave and Compound) to optimize returns.
 * 
 * Architecture:
 * - BriqShares: ERC20 token representing user shares in the vault
 * - StrategyAave: Handles deposits/withdrawals to Aave lending protocol
 * - StrategyCompoundComet: Handles deposits/withdrawals to Compound v3
 * - StrategyCoordinator: Routes deposits between strategies and manages balancing
 * - BriqVault: Main user interface for deposits/withdrawals
 * 
 * Deployment Order:
 * 1. Deploy individual strategy contracts
 * 2. Deploy coordinator with strategy references
 * 3. Deploy vault with coordinator and shares references
 * 
 * Note: Contracts are deployed but not configured. Configuration must be done
 * separately to set up protocol addresses and token routing.
 */

const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Deploying Briq Protocol...\n");
  
  // Get deployer info
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // Deploy contracts in dependency order
  console.log("📄 Deploying contracts...");

  // 1. BriqShares - ERC20 token for vault shares
  const BriqShares = await ethers.getContractFactory("BriqShares");
  const briqShares = await BriqShares.deploy("Briq Shares", "BRIQ");
  await briqShares.waitForDeployment();
  console.log(`   BriqShares: ${await briqShares.getAddress()}`);

  // 2. StrategyAave - Aave lending strategy
  const StrategyAave = await ethers.getContractFactory("StrategyAave");
  const strategyAave = await StrategyAave.deploy();
  await strategyAave.waitForDeployment();
  console.log(`   StrategyAave: ${await strategyAave.getAddress()}`);

  // 3. StrategyCompoundComet - Compound v3 strategy
  const StrategyCompoundComet = await ethers.getContractFactory("StrategyCompoundComet");
  const strategyCompound = await StrategyCompoundComet.deploy();
  await strategyCompound.waitForDeployment();
  console.log(`   StrategyCompoundComet: ${await strategyCompound.getAddress()}`);

  // 4. StrategyCoordinator - Routes between strategies
  const StrategyCoordinator = await ethers.getContractFactory("StrategyCoordinator");
  const strategyCoordinator = await StrategyCoordinator.deploy(
    await strategyAave.getAddress(),
    await strategyCompound.getAddress()
  );
  await strategyCoordinator.waitForDeployment();
  console.log(`   StrategyCoordinator: ${await strategyCoordinator.getAddress()}`);

  // 5. BriqVault - Main vault contract
  const BriqVault = await ethers.getContractFactory("BriqVault");
  const briqVault = await BriqVault.deploy(
    await strategyCoordinator.getAddress(),
    await briqShares.getAddress()
  );
  await briqVault.waitForDeployment();
  console.log(`   BriqVault: ${await briqVault.getAddress()}`);

  // Save deployment info
  const deploymentInfo = {
    chainId: chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      BriqShares: await briqShares.getAddress(),
      StrategyAave: await strategyAave.getAddress(),
      StrategyCompoundComet: await strategyCompound.getAddress(),
      StrategyCoordinator: await strategyCoordinator.getAddress(),
      BriqVault: await briqVault.getAddress()
    }
  };

  fs.writeFileSync('./deployment.json', JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n✅ Deployment complete!");
  console.log("📋 Addresses saved to deployment.json");
  console.log("\n⚠️  Contracts deployed but not configured");
  console.log("   Run configuration separately to enable deposits");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
