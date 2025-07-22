const { ethers } = require("hardhat");

// Mainnet addresses
const AAVE_POOL_V3 = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"; // Aave V3 Pool on Ethereum mainnet
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC on Ethereum mainnet
const AUSDC_ADDRESS = "0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c"; // aUSDC on Ethereum mainnet
const USDC_WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8"; // Example USDC whale address

async function main() {
  console.log("Testing StrategyAave with Aave on forked mainnet...");

  // Get signers
  const [deployer, coordinator] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Coordinator address: ${coordinator.address}`);

  // Deploy StrategyAave
  console.log("\nDeploying StrategyAave...");
  const StrategyAave = await ethers.getContractFactory("StrategyAave");
  const strategyAave = await StrategyAave.deploy();
  await strategyAave.waitForDeployment();
  console.log(`StrategyAave deployed to: ${await strategyAave.getAddress()}`);

  // Set up the strategy
  console.log("\nSetting up StrategyAave...");
  await strategyAave.setCoordinator(coordinator.address);
  console.log(`Coordinator set to: ${await strategyAave.coordinator()}`);
  
  await strategyAave.updatePoolSupport(AAVE_POOL_V3, USDC_ADDRESS, true);
  console.log(`Pool support updated for ${AAVE_POOL_V3}`);
  
  await strategyAave.updateTokenSupport(USDC_ADDRESS, true);
  console.log(`Token support updated for ${USDC_ADDRESS}`);

  // Get USDC from a whale
  console.log("\nGetting USDC from whale...");
  await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
  const usdcWhale = await ethers.getSigner(USDC_WHALE);
  
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  const testAmount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
  
  const whaleBalance = await usdc.balanceOf(usdcWhale.address);
  console.log(`Whale USDC balance: ${ethers.formatUnits(whaleBalance, 6)} USDC`);
  
  await usdc.connect(usdcWhale).transfer(coordinator.address, testAmount);
  console.log(`Transferred ${ethers.formatUnits(testAmount, 6)} USDC to coordinator`);
  
  const coordinatorBalance = await usdc.balanceOf(coordinator.address);
  console.log(`Coordinator USDC balance: ${ethers.formatUnits(coordinatorBalance, 6)} USDC`);

  // Deposit USDC to Aave
  console.log("\nDepositing USDC to Aave...");
  await usdc.connect(coordinator).approve(await strategyAave.getAddress(), testAmount);
  console.log("USDC approved for StrategyAave");
  
  console.log("Measuring gas for deposit...");
  const depositTx = await strategyAave.connect(coordinator).deposit(USDC_ADDRESS, testAmount);
  const depositReceipt = await depositTx.wait();
  console.log(`Gas used for deposit: ${depositReceipt.gasUsed.toString()}`);
  
  const aaveBalance = await strategyAave.balanceOf(USDC_ADDRESS);
  console.log(`Strategy aUSDC balance: ${ethers.formatUnits(aaveBalance, 6)} aUSDC`);

  // Withdraw USDC from Aave
  console.log("\nWithdrawing USDC from Aave...");
  console.log("Measuring gas for withdraw...");
  const withdrawTx = await strategyAave.connect(coordinator).withdraw(USDC_ADDRESS, testAmount);
  const withdrawReceipt = await withdrawTx.wait();
  console.log(`Gas used for withdraw: ${withdrawReceipt.gasUsed.toString()}`);
  
  const finalBalance = await usdc.balanceOf(coordinator.address);
  console.log(`Final coordinator USDC balance: ${ethers.formatUnits(finalBalance, 6)} USDC`);

  console.log("\nTest completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
