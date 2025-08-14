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

const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("💰 Funding hardhat accounts 0 and 1\n");
  
  // Get target accounts and network info
  const [deployer, account1] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log(`Account 0: ${deployer.address}`);
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
  
  // Check current balances for both accounts
  const currentUsdcBalance0 = await usdc.balanceOf(deployer.address);
  const currentWethBalance0 = await weth.balanceOf(deployer.address);
  const currentUsdcBalance1 = await usdc.balanceOf(account1.address);
  const currentWethBalance1 = await weth.balanceOf(account1.address);
  
  console.log("📊 Current balances:");
  console.log(`   Account 0 USDC: ${ethers.formatUnits(currentUsdcBalance0, 6)}`);
  console.log(`   Account 0 WETH: ${ethers.formatUnits(currentWethBalance0, 18)}`);
  console.log(`   Account 1 USDC: ${ethers.formatUnits(currentUsdcBalance1, 6)}`);
  console.log(`   Account 1 WETH: ${ethers.formatUnits(currentWethBalance1, 18)}`);
  
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
  
  // Define transfer amounts (same for both accounts)
  const usdcAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
  const wethAmount = ethers.parseUnits("10", 18);   // 10 WETH
  
  // Verify whales have sufficient balance for both transfers
  const totalUsdcNeeded = usdcAmount * 2n; // Need double the amount for both accounts
  const totalWethNeeded = wethAmount * 2n; // Need double the amount for both accounts
  
  if (usdcWhaleBalance < totalUsdcNeeded) {
    throw new Error(`USDC whale insufficient balance: ${ethers.formatUnits(usdcWhaleBalance, 6)}, need: ${ethers.formatUnits(totalUsdcNeeded, 6)}`);
  }
  
  if (wethWhaleBalance < totalWethNeeded) {
    throw new Error(`WETH whale insufficient balance: ${ethers.formatUnits(wethWhaleBalance, 18)}, need: ${ethers.formatUnits(totalWethNeeded, 18)}`);
  }
  
  console.log("💸 Transferring tokens to both accounts...");
  
  // Execute token transfers to account 0
  const usdcTx0 = await usdc.connect(usdcWhaleSigner).transfer(deployer.address, usdcAmount);
  await usdcTx0.wait();
  console.log(`   ✅ 10,000 USDC transferred to account 0`);
  
  const wethTx0 = await weth.connect(wethWhaleSigner).transfer(deployer.address, wethAmount);
  await wethTx0.wait();
  console.log(`   ✅ 10 WETH transferred to account 0`);
  
  // Execute token transfers to account 1
  const usdcTx1 = await usdc.connect(usdcWhaleSigner).transfer(account1.address, usdcAmount);
  await usdcTx1.wait();
  console.log(`   ✅ 10,000 USDC transferred to account 1`);
  
  const wethTx1 = await weth.connect(wethWhaleSigner).transfer(account1.address, wethAmount);
  await wethTx1.wait();
  console.log(`   ✅ 10 WETH transferred to account 1`);
  
  // Stop impersonating accounts
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [usdcWhale]);
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [wethWhale]);
  
  // Show updated balances for both accounts
  const newUsdcBalance0 = await usdc.balanceOf(deployer.address);
  const newWethBalance0 = await weth.balanceOf(deployer.address);
  const newUsdcBalance1 = await usdc.balanceOf(account1.address);
  const newWethBalance1 = await weth.balanceOf(account1.address);
  
  console.log("\n📊 Updated balances:");
  console.log(`   Account 0 USDC: ${ethers.formatUnits(newUsdcBalance0, 6)}`);
  console.log(`   Account 0 WETH: ${ethers.formatUnits(newWethBalance0, 18)}`);
  console.log(`   Account 1 USDC: ${ethers.formatUnits(newUsdcBalance1, 6)}`);
  console.log(`   Account 1 WETH: ${ethers.formatUnits(newWethBalance1, 18)}`);
  
  console.log("\n✅ Account funding complete for both accounts!");
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Account funding failed:", error);
    process.exit(1);
  });
