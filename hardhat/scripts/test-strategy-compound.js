const { ethers } = require("hardhat");

// Mainnet addresses
const COMPOUND_COMET_USDC = "0xc3d688B66703497DAA19211EEdff47f25384cdc3"; // Compound v3 USDC market (Comet)
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC on Ethereum mainnet
const USDC_WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8"; // Example USDC whale address

async function main() {
  console.log("Testing StrategyCompoundComet with Compound on forked mainnet...");

  // Get signers
  const [deployer, coordinator] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Coordinator address: ${coordinator.address}`);

  // Deploy StrategyCompoundComet
  console.log("\nDeploying StrategyCompoundComet...");
  const StrategyCompoundComet = await ethers.getContractFactory("StrategyCompoundComet");
  const strategyCompound = await StrategyCompoundComet.deploy();
  await strategyCompound.waitForDeployment();
  console.log(`StrategyCompoundComet deployed to: ${await strategyCompound.getAddress()}`);

  // Set up the strategy
  console.log("\nSetting up StrategyCompoundComet...");
  await strategyCompound.setCoordinator(coordinator.address);
  console.log(`Coordinator set to: ${await strategyCompound.coordinator()}`);
  
  await strategyCompound.updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true);
  console.log(`Market support updated for ${COMPOUND_COMET_USDC}`);
  
  await strategyCompound.updateTokenSupport(USDC_ADDRESS, true);
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

  // Deposit USDC to Compound
  console.log("\nDepositing USDC to Compound...");
  await usdc.connect(coordinator).approve(await strategyCompound.getAddress(), testAmount);
  console.log("USDC approved for StrategyCompoundComet");
  
  console.log("Measuring gas for deposit...");
  const depositTx = await strategyCompound.connect(coordinator).deposit(USDC_ADDRESS, testAmount);
  const depositReceipt = await depositTx.wait();
  console.log(`Gas used for deposit: ${depositReceipt.gasUsed.toString()}`);
  
  const compoundBalance = await strategyCompound.balanceOf(USDC_ADDRESS);
  console.log(`Strategy Compound balance: ${ethers.formatUnits(compoundBalance, 6)} cUSDC equivalent`);

  // Withdraw USDC from Compound
  console.log("\nWithdrawing USDC from Compound...");
  console.log("Measuring gas for withdraw...");
  const withdrawTx = await strategyCompound.connect(coordinator).withdraw(USDC_ADDRESS, testAmount);
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
