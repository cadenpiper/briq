/**
 * Deploy Script - Briq Protocol
 * 
 * This script deploys all Briq Protocol smart contracts in the correct dependency order:
 * 1. BriqShares (ERC20 token for vault shares)
 * 2. StrategyAave (Aave V3 lending strategy)
 * 3. StrategyCompoundComet (Compound V3 strategy)
 * 4. StrategyCoordinator (manages strategy routing)
 * 5. BriqVault (main vault contract)
 * 
 * Deployment addresses are saved to deployment.json for use by other scripts.
 */

const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Deploying Briq Protocol\n");
  
  // Get deployer account and network info
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Deploy contracts in dependency order
  console.log("📄 Deploying contracts...");

  // 1. Deploy BriqShares (ERC20 token for vault shares)
  const BriqShares = await ethers.getContractFactory("BriqShares");
  const briqShares = await BriqShares.deploy("Briq Shares", "BRIQ");
  await briqShares.waitForDeployment();
  const briqSharesAddress = await briqShares.getAddress();
  console.log(`   BriqShares: ${briqSharesAddress}`);

  // 2. Deploy StrategyAave (Aave V3 lending strategy)
  const StrategyAave = await ethers.getContractFactory("StrategyAave");
  const strategyAave = await StrategyAave.deploy();
  await strategyAave.waitForDeployment();
  const strategyAaveAddress = await strategyAave.getAddress();
  console.log(`   StrategyAave: ${strategyAaveAddress}`);

  // 3. Deploy StrategyCompoundComet (Compound V3 strategy)
  const StrategyCompoundComet = await ethers.getContractFactory("StrategyCompoundComet");
  const strategyCompound = await StrategyCompoundComet.deploy();
  await strategyCompound.waitForDeployment();
  const strategyCompoundAddress = await strategyCompound.getAddress();
  console.log(`   StrategyCompoundComet: ${strategyCompoundAddress}`);

  // 4. Deploy StrategyCoordinator (manages strategy routing)
  const StrategyCoordinator = await ethers.getContractFactory("StrategyCoordinator");
  const strategyCoordinator = await StrategyCoordinator.deploy(
    strategyAaveAddress,
    strategyCompoundAddress
  );
  await strategyCoordinator.waitForDeployment();
  const strategyCoordinatorAddress = await strategyCoordinator.getAddress();
  console.log(`   StrategyCoordinator: ${strategyCoordinatorAddress}`);

  // 5. Deploy BriqVault (main vault contract)
  const BriqVault = await ethers.getContractFactory("BriqVault");
  const briqVault = await BriqVault.deploy(
    strategyCoordinatorAddress,
    briqSharesAddress
  );
  await briqVault.waitForDeployment();
  const briqVaultAddress = await briqVault.getAddress();
  console.log(`   BriqVault: ${briqVaultAddress}`);

  console.log("\n✅ Deployment complete!");
  
  // Save deployment addresses for other scripts to use
  const deploymentData = {
    chainId: chainId.toString(),
    timestamp: new Date().toISOString(),
    contracts: {
      BriqVault: briqVaultAddress,
      BriqShares: briqSharesAddress,
      StrategyAave: strategyAaveAddress,
      StrategyCompoundComet: strategyCompoundAddress,
      StrategyCoordinator: strategyCoordinatorAddress
    }
  };
  
  fs.writeFileSync('./deployment.json', JSON.stringify(deploymentData, null, 2));
  console.log("📝 Addresses saved to deployment.json");
  
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
