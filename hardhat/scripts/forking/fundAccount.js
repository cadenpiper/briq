/**
 * Fund Account Script - Briq Protocol
 * 
 * This script funds the hardhat account 0 with test tokens for development:
 * - Transfers 10,000 USDC from a whale account
 * - Transfers 10 WETH from a whale account
 * 
 * Uses hardhat's account impersonation to transfer tokens from known whale addresses.
 * Whale addresses are configured in config.json for each supported network.
 */

const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("💰 Funding hardhat account 0\n");
  
  // Get target account and network info
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log(`Target: ${deployer.address}`);
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

  // Extract token and whale addresses
  const {
    usdcAddress: USDC_ADDRESS,
    wethAddress: WETH_ADDRESS,
    usdcWhale,
    wethWhale
  } = chainConfig;
  
  // Get token contracts
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
  
  // Check current balances
  const currentUsdcBalance = await usdc.balanceOf(deployer.address);
  const currentWethBalance = await weth.balanceOf(deployer.address);
  
  console.log("📊 Current balances:");
  console.log(`   USDC: ${ethers.formatUnits(currentUsdcBalance, 6)}`);
  console.log(`   WETH: ${ethers.formatUnits(currentWethBalance, 18)}`);
  
  // Impersonate whale accounts for token transfers
  console.log("\n🐋 Impersonating whale accounts...");
  await ethers.provider.send("hardhat_impersonateAccount", [usdcWhale]);
  await ethers.provider.send("hardhat_impersonateAccount", [wethWhale]);
  
  const usdcWhaleSigner = await ethers.getSigner(usdcWhale);
  const wethWhaleSigner = await ethers.getSigner(wethWhale);
  
  // Fund whales with ETH for gas fees
  await ethers.provider.send("hardhat_setBalance", [usdcWhale, "0x1000000000000000000"]);
  await ethers.provider.send("hardhat_setBalance", [wethWhale, "0x1000000000000000000"]);
  
  // Verify whale balances before transfer
  const usdcWhaleBalance = await usdc.balanceOf(usdcWhale);
  const wethWhaleBalance = await weth.balanceOf(wethWhale);
  
  // Define transfer amounts
  const usdcAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
  const wethAmount = ethers.parseUnits("10", 18);   // 10 WETH
  
  // Verify whales have sufficient balance
  if (usdcWhaleBalance < usdcAmount) {
    throw new Error(`USDC whale insufficient balance: ${ethers.formatUnits(usdcWhaleBalance, 6)}`);
  }
  
  if (wethWhaleBalance < wethAmount) {
    throw new Error(`WETH whale insufficient balance: ${ethers.formatUnits(wethWhaleBalance, 18)}`);
  }
  
  console.log("💸 Transferring tokens...");
  
  // Execute token transfers
  const usdcTx = await usdc.connect(usdcWhaleSigner).transfer(deployer.address, usdcAmount);
  await usdcTx.wait();
  console.log(`   ✅ 10,000 USDC transferred`);
  
  const wethTx = await weth.connect(wethWhaleSigner).transfer(deployer.address, wethAmount);
  await wethTx.wait();
  console.log(`   ✅ 10 WETH transferred`);
  
  // Stop impersonating accounts
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [usdcWhale]);
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [wethWhale]);
  
  // Show updated balances
  const newUsdcBalance = await usdc.balanceOf(deployer.address);
  const newWethBalance = await weth.balanceOf(deployer.address);
  
  console.log("\n📊 Updated balances:");
  console.log(`   USDC: ${ethers.formatUnits(newUsdcBalance, 6)}`);
  console.log(`   WETH: ${ethers.formatUnits(newWethBalance, 18)}`);
  
  console.log("\n✅ Account funding complete!");
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Account funding failed:", error);
    process.exit(1);
  });
