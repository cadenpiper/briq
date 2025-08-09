/**
 * Check Balance Script - Briq Protocol
 * 
 * This script verifies the balances of hardhat account 0 and deployed contracts:
 * - Shows ETH, USDC, and WETH balances for the test account
 * - Shows contract balances if deployment.json exists
 * - Validates that minimum required balances are met for testing
 * 
 * Used to verify successful funding and monitor account state during development.
 */

const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🔍 Checking account balances\n");
  
  // Get account and network info
  const [account] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log(`Account: ${account.address}`);
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
  
  // Get account balances
  console.log("\n📊 Account balances:");
  
  try {
    const ethBalance = await ethers.provider.getBalance(account.address);
    const usdcBalance = await usdc.balanceOf(account.address);
    const wethBalance = await weth.balanceOf(account.address);
    
    console.log(`   ETH: ${ethers.formatEther(ethBalance)}`);
    console.log(`   USDC: ${ethers.formatUnits(usdcBalance, 6)}`);
    console.log(`   WETH: ${ethers.formatUnits(wethBalance, 18)}`);
    
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
    
    // Validate minimum required balances for testing
    console.log("\n✅ Balance verification:");
    
    const expectedUsdc = ethers.parseUnits("10000", 6);
    const expectedWeth = ethers.parseUnits("10", 18);
    
    const usdcCheck = usdcBalance >= expectedUsdc;
    const wethCheck = wethBalance >= expectedWeth;
    
    console.log(`   USDC (≥10,000): ${usdcCheck ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   WETH (≥10): ${wethCheck ? '✅ PASS' : '❌ FAIL'}`);
    
    if (usdcCheck && wethCheck) {
      console.log("\n🎉 All balance checks passed! Ready for testing.");
    } else {
      console.log("\n⚠️  Insufficient balances detected.");
      
      if (!usdcCheck) {
        const shortfall = expectedUsdc - usdcBalance;
        console.log(`   USDC shortfall: ${ethers.formatUnits(shortfall, 6)}`);
      }
      if (!wethCheck) {
        const shortfall = expectedWeth - wethBalance;
        console.log(`   WETH shortfall: ${ethers.formatUnits(shortfall, 18)}`);
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
