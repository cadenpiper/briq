/**
 * Fund Rupert's Wallet Script
 * 
 * Funds Rupert's wallet with ETH for gas fees and tests strategy management functions
 */

const { ethers } = require("hardhat");
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '../.env.local' });

async function main() {
  console.log("🤖 Funding Rupert's wallet and testing strategy functions\n");
  
  const rupertAddress = process.env.RUPERT_ADDRESS || process.env.RUPERT_WALLET_ADDRESS;
  if (!rupertAddress) {
    throw new Error("RUPERT_ADDRESS not found in .env.local");
  }
  
  console.log(`Rupert's address: ${rupertAddress}`);
  
  // Fund Rupert with ETH for gas
  console.log("💰 Funding Rupert with ETH...");
  await ethers.provider.send("hardhat_setBalance", [
    rupertAddress, 
    "0x56BC75E2D630E0000" // 100 ETH
  ]);
  
  const balance = await ethers.provider.getBalance(rupertAddress);
  console.log(`✅ Rupert's ETH balance: ${ethers.formatEther(balance)} ETH`);
  
  // Load deployment addresses
  const deployment = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  const strategyCoordinatorAddress = deployment.contracts.StrategyCoordinator;
  
  console.log(`\n📋 StrategyCoordinator: ${strategyCoordinatorAddress}`);
  
  // Get contracts
  const StrategyCoordinator = await ethers.getContractFactory("StrategyCoordinator");
  const strategyCoordinator = StrategyCoordinator.attach(strategyCoordinatorAddress);
  
  // Check current owner
  const currentOwner = await strategyCoordinator.owner();
  console.log(`Current owner: ${currentOwner}`);
  
  // Don't transfer ownership - just test with current setup
  console.log("ℹ️  Keeping original owner, will set Rupert permissions separately");
  
  // Test reading current strategies
  console.log("\n📊 Testing strategy reading...");
  const supportedTokens = await strategyCoordinator.getSupportedTokens();
  
  for (const token of supportedTokens) {
    const strategyType = await strategyCoordinator.tokenToStrategy(token);
    const apy = await strategyCoordinator.getStrategyAPY(token);
    const strategyName = strategyType === 0 ? "Aave" : "Compound";
    
    console.log(`Token ${token}: ${strategyName} strategy, APY: ${apy} basis points`);
  }
  
  // Test strategy change with Rupert's wallet (after permissions are set)
  console.log("\n🔄 Testing strategy reading (permissions will be set later)...");
  
  // Skip strategy change test - will be done after permissions are set
  console.log("ℹ️  Strategy change testing will be done after Rupert permissions are set");
  
  console.log("\n✅ Rupert wallet funding complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
