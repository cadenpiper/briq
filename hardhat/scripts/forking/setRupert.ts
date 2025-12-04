/**
 * Set Rupert Address Script
 * 
 * Authorizes Rupert's wallet to manage strategies autonomously
 */

import { network } from "hardhat";
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../.env.local' });

async function main() {
  console.log("🤖 Setting Rupert's address in StrategyCoordinator\n");
  
  const rupertAddress = process.env.RUPERT_ADDRESS || process.env.RUPERT_WALLET_ADDRESS;
  if (!rupertAddress) {
    throw new Error("RUPERT_ADDRESS not found in .env.local");
  }
  
  console.log(`Rupert's address: ${rupertAddress}`);
  
  // Load deployment addresses
  const deployment = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  const strategyCoordinatorAddress = deployment.contracts.StrategyCoordinator;
  
  console.log(`StrategyCoordinator: ${strategyCoordinatorAddress}`);
  
  const { viem } = await network.connect();
  const strategyCoordinator = await viem.getContractAt("StrategyCoordinator", strategyCoordinatorAddress);
  
  // Set Rupert as authorized manager
  console.log("🔧 Authorizing Rupert...");
  try {
    await strategyCoordinator.write.setRupert([rupertAddress]);
    console.log("✅ Rupert authorized as strategy manager");
  } catch (error: any) {
    console.log(`⚠️  Authorization failed: ${error.shortMessage || error.message}`);
    
    // Check if already authorized
    const currentRupert = await strategyCoordinator.read.rupert();
    if (currentRupert.toLowerCase() === rupertAddress.toLowerCase()) {
      console.log("✅ Rupert already authorized, continuing...");
    } else {
      throw error;
    }
  }
  
  console.log("✅ Rupert setup complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Rupert setup failed:", error);
    process.exit(1);
  });
