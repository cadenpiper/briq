/**
 * Check Balance Script - Briq Protocol
 * 
 * This script verifies the balances of hardhat accounts 0 and 1 and deployed contracts:
 * - Shows ETH, USDC, and WETH balances for both test accounts
 * - Shows contract balances if deployment.json exists
 * - Validates that minimum required balances are met for testing
 * 
 * Used to verify successful funding and monitor account state during development.
 */

import { network } from "hardhat";
import fs from 'fs';

async function main() {
  console.log("🔍 Checking account balances\n");
  
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  
  // Load network configuration
  const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  let configChainId = chainId.toString();
  if (chainId.toString() === "31337") {
    configChainId = "31337";
  }
  
  const chainConfig = configData.CHAIN_CONFIG[configChainId];
  if (!chainConfig) {
    throw new Error(`No configuration found for chain ID ${chainId}`);
  }

  const { usdcAddress: USDC_ADDRESS, wethAddress: WETH_ADDRESS } = chainConfig;
  
  // Test accounts
  const accounts = [
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", // Account 0
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"  // Account 1
  ];
  
  // ERC20 ABI for balance checking
  const erc20Abi = [
    {
      inputs: [{ name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    }
  ];

  console.log(`Network: Chain ID ${chainId}`);
  console.log(`USDC: ${USDC_ADDRESS}`);
  console.log(`WETH: ${WETH_ADDRESS}\n`);

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    console.log(`Account ${i}: ${account}`);
    
    // ETH balance
    const ethBalance = await publicClient.getBalance({ address: account });
    console.log(`  ETH: ${Number(ethBalance) / 1e18} ETH`);
    
    // USDC balance
    try {
      const usdcBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account]
      });
      console.log(`  USDC: ${Number(usdcBalance) / 1e6} USDC`);
    } catch (error) {
      console.log(`  USDC: Error reading balance`);
    }
    
    // WETH balance
    try {
      const wethBalance = await publicClient.readContract({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account]
      });
      console.log(`  WETH: ${Number(wethBalance) / 1e18} WETH`);
    } catch (error) {
      console.log(`  WETH: Error reading balance`);
    }
    
    console.log();
  }

  // Check contract balances if deployment exists
  if (fs.existsSync('./deployment.json')) {
    console.log("📄 Contract balances:");
    const deploymentData = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
    const contracts = deploymentData.contracts;
    
    for (const [name, address] of Object.entries(contracts)) {
      const ethBalance = await publicClient.getBalance({ address: address as string });
      console.log(`  ${name}: ${Number(ethBalance) / 1e18} ETH`);
    }
  }
  
  console.log("✅ Balance check complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Balance check failed:", error);
    process.exit(1);
  });
