import { network } from "hardhat";
import fs from 'fs';
import { formatEther } from 'viem';

async function main() {
  console.log("🚀 Deploying Briq Protocol with Chainlink + Pyth Price Feeds\n");
  
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  const [deployer] = await viem.getWalletClients();
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Balance: ${formatEther(balance)} ETH\n`);

  // Load chain-specific configuration
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  const chainConfig = config.CHAIN_CONFIG[chainId.toString()];
  
  if (!chainConfig) {
    throw new Error(`No configuration found for chain ID ${chainId}`);
  }
  
  console.log(`Network: ${chainConfig.name}`);
  console.log("📄 Deploying contracts...");

  // 1. Deploy BriqTimelock (governance timelock)
  const timelock = await viem.deployContract("BriqTimelock", [deployer.account.address]);
  console.log(`   BriqTimelock: ${timelock.address}`);

  // 2. Deploy PriceFeedManager (Chainlink + Pyth price feed integration)
  const priceFeedManager = await viem.deployContract("PriceFeedManager", [timelock.address, chainConfig.pythContract]);
  console.log(`   PriceFeedManager: ${priceFeedManager.address}`);
  
  // Verify contract was deployed
  const contractCode = await publicClient.getCode({ address: priceFeedManager.address });
  console.log(`   PriceFeedManager code length: ${contractCode ? contractCode.length : 0} bytes`);

  // 3. Deploy BriqShares (ERC20 token for vault shares)
  const briqShares = await viem.deployContract("BriqShares", ["Briq Shares", "BRIQ"]);
  console.log(`   BriqShares: ${briqShares.address}`);

  // 4. Deploy StrategyAave (Aave V3 lending strategy)
  const strategyAave = await viem.deployContract("StrategyAave");
  console.log(`   StrategyAave: ${strategyAave.address}`);

  // 5. Deploy StrategyCompoundComet (Compound V3 strategy)
  const strategyCompound = await viem.deployContract("StrategyCompoundComet");
  console.log(`   StrategyCompoundComet: ${strategyCompound.address}`);

  // 6. Deploy StrategyCoordinator (manages strategy routing)
  const strategyCoordinator = await viem.deployContract("StrategyCoordinator", [
    strategyAave.address,
    strategyCompound.address,
    timelock.address
  ]);
  console.log(`   StrategyCoordinator: ${strategyCoordinator.address}`);

  // 7. Deploy BriqVault (main vault contract with USD-normalized shares)
  const briqVault = await viem.deployContract("BriqVault", [
    strategyCoordinator.address,
    briqShares.address,
    priceFeedManager.address,
    timelock.address
  ]);
  console.log(`   BriqVault: ${briqVault.address}`);

  console.log("\n✅ Deployment complete!");
  
  // Save deployment addresses for other scripts to use
  const deploymentData = {
    chainId: chainId.toString(),
    timestamp: new Date().toISOString(),
    contracts: {
      BriqTimelock: timelock.address,
      PriceFeedManager: priceFeedManager.address,
      BriqVault: briqVault.address,
      BriqShares: briqShares.address,
      StrategyAave: strategyAave.address,
      StrategyCompoundComet: strategyCompound.address,
      StrategyCoordinator: strategyCoordinator.address
    }
  };
  
  // Save to chain-specific deployment file
  const deploymentFile = `./deployment-${chainId}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  console.log(`📝 Addresses saved to ${deploymentFile}`);
  
  console.log("\n🔗 Key Features Deployed:");
  console.log("   • USD-normalized share distribution");
  console.log("   • Dual-oracle price feeds (Chainlink + Pyth)");
  console.log("   • Multi-token support (USDC, WETH)");
  console.log("   • Fair share allocation regardless of deposit token");
  console.log("   • Governance timelock for security");
  
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
