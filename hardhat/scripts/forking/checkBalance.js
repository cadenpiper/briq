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

const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🔍 Checking account balances\n");
  
  // Get accounts and network info
  const [account0, account1] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log(`Account 0: ${account0.address}`);
  console.log(`Account 1: ${account1.address}`);
  console.log(`Chain ID: ${chainId}`);
  
  // Load network configuration
  const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  
  // Map hardhat local chain ID to mainnet fork config
  let configChainId = chainId.toString();
  if (chainId.toString() === "31337") {
    configChainId = "31337"; // Use hardhat fork config
  }
  
  const chainConfig = configData.CHAIN_CONFIG[configChainId];
  if (!chainConfig) {
    throw new Error(`No configuration found for chain ID ${chainId}`);
  }

  // Extract token addresses
  const {
    usdcAddress: USDC_ADDRESS,
    wethAddress: WETH_ADDRESS
  } = chainConfig;
  
  // Get token contracts
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
  
  // Get account balances for both accounts
  console.log("\n📊 Account balances:");
  
  try {
    // Account 0 balances
    const ethBalance0 = await ethers.provider.getBalance(account0.address);
    const usdcBalance0 = await usdc.balanceOf(account0.address);
    const wethBalance0 = await weth.balanceOf(account0.address);
    
    console.log(`   Account 0:`);
    console.log(`     ETH: ${ethers.formatEther(ethBalance0)}`);
    console.log(`     USDC: ${ethers.formatUnits(usdcBalance0, 6)}`);
    console.log(`     WETH: ${ethers.formatUnits(wethBalance0, 18)}`);
    
    // Account 1 balances
    const ethBalance1 = await ethers.provider.getBalance(account1.address);
    const usdcBalance1 = await usdc.balanceOf(account1.address);
    const wethBalance1 = await weth.balanceOf(account1.address);
    
    console.log(`   Account 1:`);
    console.log(`     ETH: ${ethers.formatEther(ethBalance1)}`);
    console.log(`     USDC: ${ethers.formatUnits(usdcBalance1, 6)}`);
    console.log(`     WETH: ${ethers.formatUnits(wethBalance1, 18)}`);
    
    // Show contract balances if deployment exists
    if (fs.existsSync('./deployment.json')) {
      console.log("\n🏦 Contract balances:");
      
      const deploymentData = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
      const contracts = deploymentData.contracts;
      
      const vaultEthBalance = await ethers.provider.getBalance(contracts.BriqVault);
      const vaultUsdcBalance = await usdc.balanceOf(contracts.BriqVault);
      const vaultWethBalance = await weth.balanceOf(contracts.BriqVault);
      
      console.log(`   Vault ETH: ${ethers.formatEther(vaultEthBalance)}`);
      console.log(`   Vault USDC: ${ethers.formatUnits(vaultUsdcBalance, 6)}`);
      console.log(`   Vault WETH: ${ethers.formatUnits(vaultWethBalance, 18)}`);
    }
    
    // Validate minimum required balances for testing (both accounts)
    console.log("\n✅ Balance verification:");
    
    const expectedUsdc = ethers.parseUnits("10000", 6);
    const expectedWeth = ethers.parseUnits("10", 18);
    
    // Check Account 0
    const usdcCheck0 = usdcBalance0 >= expectedUsdc;
    const wethCheck0 = wethBalance0 >= expectedWeth;
    
    console.log(`   Account 0:`);
    console.log(`     USDC (≥10,000): ${usdcCheck0 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`     WETH (≥10): ${wethCheck0 ? '✅ PASS' : '❌ FAIL'}`);
    
    // Check Account 1
    const usdcCheck1 = usdcBalance1 >= expectedUsdc;
    const wethCheck1 = wethBalance1 >= expectedWeth;
    
    console.log(`   Account 1:`);
    console.log(`     USDC (≥10,000): ${usdcCheck1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`     WETH (≥10): ${wethCheck1 ? '✅ PASS' : '❌ FAIL'}`);
    
    const allChecksPass = usdcCheck0 && wethCheck0 && usdcCheck1 && wethCheck1;
    
    if (allChecksPass) {
      console.log("\n🎉 All balance checks passed for both accounts! Ready for testing.");
    } else {
      console.log("\n⚠️  Insufficient balances detected.");
      
      if (!usdcCheck0) {
        const shortfall = expectedUsdc - usdcBalance0;
        console.log(`   Account 0 USDC shortfall: ${ethers.formatUnits(shortfall, 6)}`);
      }
      if (!wethCheck0) {
        const shortfall = expectedWeth - wethBalance0;
        console.log(`   Account 0 WETH shortfall: ${ethers.formatUnits(shortfall, 18)}`);
      }
      if (!usdcCheck1) {
        const shortfall = expectedUsdc - usdcBalance1;
        console.log(`   Account 1 USDC shortfall: ${ethers.formatUnits(shortfall, 6)}`);
      }
      if (!wethCheck1) {
        const shortfall = expectedWeth - wethBalance1;
        console.log(`   Account 1 WETH shortfall: ${ethers.formatUnits(shortfall, 18)}`);
      }
    }
    
    console.log("\n" + "=".repeat(60));
    
  } catch (error) {
    console.error(`Error fetching balances: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Balance check failed:", error);
    process.exit(1);
  });
