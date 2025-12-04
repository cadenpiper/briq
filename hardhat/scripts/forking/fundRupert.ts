/**
 * Fund Rupert's Wallet Script
 * 
 * Funds Rupert's wallet with ETH for gas fees and tests strategy management functions
 */

import { network } from "hardhat";
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../.env.local' });

async function main() {
  console.log("🤖 Funding Rupert's wallet\n");
  
  const rupertAddress = process.env.RUPERT_ADDRESS || process.env.RUPERT_WALLET_ADDRESS;
  if (!rupertAddress) {
    throw new Error("RUPERT_ADDRESS not found in .env.local");
  }
  
  console.log(`Rupert's address: ${rupertAddress}`);
  
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  
  // Fund Rupert with ETH for gas
  console.log("💰 Funding Rupert with ETH...");
  await publicClient.request({
    method: "hardhat_setBalance",
    params: [rupertAddress, "0x56BC75E2D630E0000"], // 100 ETH
  });
  
  const balance = await publicClient.getBalance({ address: rupertAddress });
  console.log(`✅ Rupert's ETH balance: ${Number(balance) / 1e18} ETH`);
  
  console.log("✅ Rupert funding complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Rupert funding failed:", error);
    process.exit(1);
  });
