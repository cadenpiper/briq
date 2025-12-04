/**
 * Fund Account Script - Briq Protocol
 * 
 * This script funds hardhat accounts 0 and 1 with test tokens for development:
 * - Transfers 10,000 USDC from a whale account to each account
 * - Transfers 10 WETH from a whale account to each account
 * 
 * Uses hardhat's account impersonation to transfer tokens from known whale addresses.
 * Whale addresses are configured in config.json for each supported network.
 */

import { network } from "hardhat";
import fs from 'fs';

async function main() {
  console.log("💰 Funding hardhat accounts\n");
  
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClient = await viem.getWalletClient();
  const chainId = await publicClient.getChainId();
  
  // Target accounts
  const accounts = [
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", // Account 0
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"  // Account 1
  ];
  
  console.log(`Account 0: ${accounts[0]}`);
  console.log(`Account 1: ${accounts[1]}`);
  console.log(`Chain ID: ${chainId}`);
  
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

  const {
    usdcAddress: USDC_ADDRESS,
    wethAddress: WETH_ADDRESS,
    usdcWhale: USDC_WHALE,
    wethWhale: WETH_WHALE
  } = chainConfig;

  console.log(`\nUsing whale addresses:`);
  console.log(`USDC whale: ${USDC_WHALE}`);
  console.log(`WETH whale: ${WETH_WHALE}\n`);

  // ERC20 ABI for transfers
  const erc20Abi = [
    {
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" }
      ],
      name: "transfer",
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];

  // Fund each account
  for (const account of accounts) {
    console.log(`Funding ${account}...`);
    
    // Fund with USDC (10,000 USDC = 10,000 * 1e6)
    try {
      await publicClient.request({
        method: "hardhat_impersonateAccount",
        params: [USDC_WHALE],
      });

      // Fund whale with ETH for gas
      await publicClient.request({
        method: "hardhat_setBalance",
        params: [USDC_WHALE, "0x56BC75E2D630E000"], // 100 ETH
      });

      await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [account, BigInt(10000 * 1e6)],
        account: USDC_WHALE
      });

      await publicClient.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [USDC_WHALE],
      });

      console.log(`  ✅ 10,000 USDC transferred`);
    } catch (error) {
      console.log(`  ❌ USDC transfer failed: ${error}`);
    }

    // Fund with WETH (1 WETH = 1 * 1e18)
    try {
      await publicClient.request({
        method: "hardhat_impersonateAccount",
        params: [WETH_WHALE],
      });

      // Fund whale with ETH for gas
      await publicClient.request({
        method: "hardhat_setBalance",
        params: [WETH_WHALE, "0x56BC75E2D630E000"], // 100 ETH
      });

      await walletClient.writeContract({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [account, BigInt(1 * 1e18)],
        account: WETH_WHALE
      });

      await publicClient.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [WETH_WHALE],
      });

      console.log(`  ✅ 1 WETH transferred`);
    } catch (error) {
      console.log(`  ❌ WETH transfer failed: ${error}`);
    }
    
    console.log();
  }
  
  console.log("✅ Account funding complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Funding failed:", error);
    process.exit(1);
  });
