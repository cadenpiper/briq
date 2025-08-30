/**
 * Set Rupert Address Script
 * 
 * Authorizes Rupert's wallet to manage strategies autonomously
 */

const { ethers } = require("hardhat");
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '../.env.local' });

async function main() {
  console.log("🤖 Setting Rupert's address in StrategyCoordinator...\n");
  
  // Debug environment variables
  console.log("Environment variables:");
  console.log("RUPERT_ADDRESS:", process.env.RUPERT_ADDRESS);
  console.log("RUPERT_WALLET_ADDRESS:", process.env.RUPERT_WALLET_ADDRESS);
  console.log("RUPERT_PRIVATE_KEY:", process.env.RUPERT_PRIVATE_KEY ? "SET" : "NOT SET");
  
  const rupertAddress = process.env.RUPERT_ADDRESS || process.env.RUPERT_WALLET_ADDRESS;
  if (!rupertAddress) {
    throw new Error("RUPERT_ADDRESS not found in .env.local");
  }
  
  console.log(`Rupert's address: ${rupertAddress}`);
  
  // Load deployment addresses
  const deployment = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  const strategyCoordinatorAddress = deployment.contracts.StrategyCoordinator;
  
  console.log(`StrategyCoordinator: ${strategyCoordinatorAddress}`);
  
  // Get contract
  const StrategyCoordinator = await ethers.getContractFactory("StrategyCoordinator");
  const strategyCoordinator = StrategyCoordinator.attach(strategyCoordinatorAddress);
  
  // Get deployer (owner)
  const [deployer] = await ethers.getSigners();
  console.log(`Owner: ${deployer.address}`);
  
  // Set Rupert's address
  console.log("🔧 Setting Rupert's address...");
  const tx = await strategyCoordinator.connect(deployer).setRupert(rupertAddress);
  await tx.wait();
  
  console.log(`✅ Rupert authorized! Transaction: ${tx.hash}`);
  
  // Verify
  const currentRupert = await strategyCoordinator.rupert();
  console.log(`✅ Verified: Rupert address set to ${currentRupert}`);
  
  console.log("\n🚀 Rupert can now manage strategies autonomously!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
