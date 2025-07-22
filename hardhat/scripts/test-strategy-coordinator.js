const { ethers } = require("hardhat");

// Mainnet addresses
const AAVE_POOL_V3 = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"; // Aave V3 Pool on Ethereum mainnet
const COMPOUND_COMET_USDC = "0xc3d688B66703497DAA19211EEdff47f25384cdc3"; // Compound v3 USDC market (Comet)
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC on Ethereum mainnet
const USDC_WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8"; // Example USDC whale address

async function main() {
  console.log("Testing StrategyCoordinator with Aave and Compound on forked mainnet...");

  // Get signers
  const [deployer, vault] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Vault address: ${vault.address}`);

  // Deploy StrategyAave
  console.log("\nDeploying StrategyAave...");
  const StrategyAave = await ethers.getContractFactory("StrategyAave");
  const strategyAave = await StrategyAave.deploy();
  await strategyAave.waitForDeployment();
  console.log(`StrategyAave deployed to: ${await strategyAave.getAddress()}`);

  // Deploy StrategyCompoundComet
  console.log("\nDeploying StrategyCompoundComet...");
  const StrategyCompoundComet = await ethers.getContractFactory("StrategyCompoundComet");
  const strategyCompound = await StrategyCompoundComet.deploy();
  await strategyCompound.waitForDeployment();
  console.log(`StrategyCompoundComet deployed to: ${await strategyCompound.getAddress()}`);

  // Deploy StrategyCoordinator
  console.log("\nDeploying StrategyCoordinator...");
  const StrategyCoordinator = await ethers.getContractFactory("StrategyCoordinator");
  const strategyCoordinator = await StrategyCoordinator.deploy(
    await strategyAave.getAddress(),
    await strategyCompound.getAddress()
  );
  await strategyCoordinator.waitForDeployment();
  console.log(`StrategyCoordinator deployed to: ${await strategyCoordinator.getAddress()}`);

  // Set up strategies
  console.log("\nSetting up strategies...");
  await strategyAave.setCoordinator(await strategyCoordinator.getAddress());
  console.log(`StrategyAave coordinator set to: ${await strategyAave.coordinator()}`);
  
  await strategyCompound.setCoordinator(await strategyCoordinator.getAddress());
  console.log(`StrategyCompound coordinator set to: ${await strategyCompound.coordinator()}`);

  // Configure Aave strategy
  console.log("\nConfiguring Aave strategy...");
  await strategyAave.updatePoolSupport(AAVE_POOL_V3, USDC_ADDRESS, true);
  console.log(`Aave pool support updated for ${AAVE_POOL_V3}`);
  
  await strategyAave.updateTokenSupport(USDC_ADDRESS, true);
  console.log(`Aave token support updated for ${USDC_ADDRESS}`);

  // Configure Compound strategy
  console.log("\nConfiguring Compound strategy...");
  await strategyCompound.updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true);
  console.log(`Compound market support updated for ${COMPOUND_COMET_USDC}`);
  
  await strategyCompound.updateTokenSupport(USDC_ADDRESS, true);
  console.log(`Compound token support updated for ${USDC_ADDRESS}`);

  // Configure StrategyCoordinator
  console.log("\nConfiguring StrategyCoordinator...");
  await strategyCoordinator.updateVaultAddress(vault.address);
  console.log(`Vault address set to: ${await strategyCoordinator.vault()}`);
  
  // Get USDC from a whale
  console.log("\nGetting USDC from whale...");
  await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
  const usdcWhale = await ethers.getSigner(USDC_WHALE);
  
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  const testAmount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
  
  const whaleBalance = await usdc.balanceOf(usdcWhale.address);
  console.log(`Whale USDC balance: ${ethers.formatUnits(whaleBalance, 6)} USDC`);
  
  await usdc.connect(usdcWhale).transfer(vault.address, testAmount);
  console.log(`Transferred ${ethers.formatUnits(testAmount, 6)} USDC to vault`);
  
  const vaultBalance = await usdc.balanceOf(vault.address);
  console.log(`Vault USDC balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);

  // Test with Compound strategy first
  console.log("\n--- Testing with Compound Strategy First ---");
  await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 1); // 1 = COMPOUND
  console.log(`Strategy for USDC set to Compound`);
  
  // Approve USDC for the coordinator
  const compoundAmount = testAmount / 4n;
  await usdc.connect(vault).approve(await strategyCoordinator.getAddress(), compoundAmount);
  console.log("USDC approved for StrategyCoordinator");
  
  // Deposit USDC to Compound
  console.log("\nDepositing USDC to Compound via Coordinator...");
  console.log("Measuring gas for deposit...");
  const depositCompoundTx = await strategyCoordinator.connect(vault).deposit(USDC_ADDRESS, compoundAmount);
  const depositCompoundReceipt = await depositCompoundTx.wait();
  console.log(`Gas used for Compound deposit: ${depositCompoundReceipt.gasUsed.toString()}`);
  
  let compoundBalance = await strategyCoordinator.getStrategyBalance(USDC_ADDRESS);
  console.log(`Strategy Compound balance: ${ethers.formatUnits(compoundBalance, 6)} cUSDC equivalent`);

  // Test with Aave strategy
  console.log("\n--- Testing with Aave Strategy ---");
  await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 0); // 0 = AAVE
  console.log(`Strategy for USDC set to Aave`);
  
  // Approve USDC for the coordinator
  const aaveAmount = testAmount / 2n;
  await usdc.connect(vault).approve(await strategyCoordinator.getAddress(), aaveAmount);
  console.log("USDC approved for StrategyCoordinator");
  
  // Deposit USDC to Aave
  console.log("\nDepositing USDC to Aave via Coordinator...");
  console.log("Measuring gas for deposit...");
  const depositAaveTx = await strategyCoordinator.connect(vault).deposit(USDC_ADDRESS, aaveAmount);
  const depositAaveReceipt = await depositAaveTx.wait();
  console.log(`Gas used for Aave deposit: ${depositAaveReceipt.gasUsed.toString()}`);
  
  const aaveBalance = await strategyCoordinator.getStrategyBalance(USDC_ADDRESS);
  console.log(`Strategy Aave balance: ${ethers.formatUnits(aaveBalance, 6)} aUSDC equivalent`);

  // Withdraw USDC from Aave
  console.log("\nWithdrawing USDC from Aave via Coordinator...");
  console.log("Measuring gas for withdraw...");
  const withdrawAaveAmount = ethers.parseUnits("100", 6); // Withdraw a smaller amount
  const withdrawAaveTx = await strategyCoordinator.connect(vault).withdraw(USDC_ADDRESS, withdrawAaveAmount);
  const withdrawAaveReceipt = await withdrawAaveTx.wait();
  console.log(`Gas used for Aave withdraw: ${withdrawAaveReceipt.gasUsed.toString()}`);
  
  const vaultBalanceAfterAave = await usdc.balanceOf(vault.address);
  console.log(`Vault USDC balance after Aave withdraw: ${ethers.formatUnits(vaultBalanceAfterAave, 6)} USDC`);

  // Switch back to Compound strategy for testing
  console.log("\n--- Testing with Compound Strategy Again ---");
  await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 1); // 1 = COMPOUND
  console.log(`Strategy for USDC set to Compound`);
  
  // Withdraw USDC from Compound
  console.log("\nWithdrawing USDC from Compound via Coordinator...");
  console.log("Measuring gas for withdraw...");
  const withdrawCompoundAmount = ethers.parseUnits("50", 6); // Withdraw a smaller amount
  const withdrawCompoundTx = await strategyCoordinator.connect(vault).withdraw(USDC_ADDRESS, withdrawCompoundAmount);
  const withdrawCompoundReceipt = await withdrawCompoundTx.wait();
  console.log(`Gas used for Compound withdraw: ${withdrawCompoundReceipt.gasUsed.toString()}`);
  
  const vaultBalanceAfterCompound = await usdc.balanceOf(vault.address);
  console.log(`Vault USDC balance after Compound withdraw: ${ethers.formatUnits(vaultBalanceAfterCompound, 6)} USDC`);

  // Test emergency withdraw
  console.log("\n--- Testing Emergency Withdraw ---");
  console.log("Measuring gas for emergency withdraw...");
  const emergencyTx = await strategyCoordinator.emergencyWithdraw(USDC_ADDRESS);
  const emergencyReceipt = await emergencyTx.wait();
  console.log(`Gas used for emergency withdraw: ${emergencyReceipt.gasUsed.toString()}`);
  
  const finalBalance = await usdc.balanceOf(vault.address);
  console.log(`Final vault USDC balance: ${ethers.formatUnits(finalBalance, 6)} USDC`);

  console.log("\nTest completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
