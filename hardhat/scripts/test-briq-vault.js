const { ethers } = require("hardhat");

// Mainnet addresses
const AAVE_POOL_V3 = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"; // Aave V3 Pool on Ethereum mainnet
const COMPOUND_COMET_USDC = "0xc3d688B66703497DAA19211EEdff47f25384cdc3"; // Compound v3 USDC market (Comet)
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC on Ethereum mainnet
const USDC_WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8"; // Example USDC whale address

async function main() {
  console.log("Testing BriqVault with Aave and Compound strategies on forked mainnet...");

  // Get signers
  const [deployer, user] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`User address: ${user.address}`);

  // Deploy BriqShares
  console.log("\nDeploying BriqShares...");
  const BriqShares = await ethers.getContractFactory("BriqShares");
  const briqShares = await BriqShares.deploy("Briq", "BRIQ");
  await briqShares.waitForDeployment();
  console.log(`BriqShares deployed to: ${await briqShares.getAddress()}`);

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

  // Deploy BriqVault
  console.log("\nDeploying BriqVault...");
  const BriqVault = await ethers.getContractFactory("BriqVault");
  const briqVault = await BriqVault.deploy(
    await strategyCoordinator.getAddress(),
    await briqShares.getAddress()
  );
  await briqVault.waitForDeployment();
  console.log(`BriqVault deployed to: ${await briqVault.getAddress()}`);

  // Set up contracts
  console.log("\nSetting up contracts...");
  
  // Set vault address in BriqShares
  await briqShares.setVault(await briqVault.getAddress());
  console.log(`BriqShares vault set to: ${await briqVault.getAddress()}`);
  
  // Set coordinator in strategies
  await strategyAave.setCoordinator(await strategyCoordinator.getAddress());
  console.log(`StrategyAave coordinator set to: ${await strategyCoordinator.getAddress()}`);
  
  await strategyCompound.setCoordinator(await strategyCoordinator.getAddress());
  console.log(`StrategyCompound coordinator set to: ${await strategyCoordinator.getAddress()}`);
  
  // Set vault address in coordinator
  await strategyCoordinator.updateVaultAddress(await briqVault.getAddress());
  console.log(`StrategyCoordinator vault set to: ${await briqVault.getAddress()}`);

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

  // Get USDC from a whale
  console.log("\nGetting USDC from whale...");
  await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
  const usdcWhale = await ethers.getSigner(USDC_WHALE);
  
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  const testAmount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
  
  const whaleBalance = await usdc.balanceOf(usdcWhale.address);
  console.log(`Whale USDC balance: ${ethers.formatUnits(whaleBalance, 6)} USDC`);
  
  await usdc.connect(usdcWhale).transfer(user.address, testAmount);
  console.log(`Transferred ${ethers.formatUnits(testAmount, 6)} USDC to user`);
  
  const userBalance = await usdc.balanceOf(user.address);
  console.log(`User USDC balance: ${ethers.formatUnits(userBalance, 6)} USDC`);

  // Test deposit with Aave strategy
  console.log("\n--- Testing Deposit with Aave Strategy ---");
  await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 0); // 0 = AAVE
  console.log(`Strategy for USDC set to Aave`);
  
  // Approve USDC for the vault
  const aaveDepositAmount = ethers.parseUnits("100", 6); // 100 USDC
  await usdc.connect(user).approve(await briqVault.getAddress(), aaveDepositAmount);
  console.log(`USDC approved for BriqVault: ${ethers.formatUnits(aaveDepositAmount, 6)} USDC`);
  
  // Deposit USDC to Aave via BriqVault
  console.log("\nDepositing USDC to Aave via BriqVault...");
  console.log("Measuring gas for deposit...");
  const depositAaveTx = await briqVault.connect(user).deposit(USDC_ADDRESS, aaveDepositAmount);
  const depositAaveReceipt = await depositAaveTx.wait();
  console.log(`Gas used for Aave deposit: ${depositAaveReceipt.gasUsed.toString()}`);
  
  // Check balances and shares
  const aaveBalance = await strategyCoordinator.getStrategyBalance(USDC_ADDRESS);
  console.log(`Strategy Aave balance: ${ethers.formatUnits(aaveBalance, 6)} aUSDC equivalent`);
  
  const userSharesAfterAave = await briqShares.balanceOf(user.address);
  console.log(`User shares after Aave deposit: ${ethers.formatUnits(userSharesAfterAave, 18)} BRIQ`);
  
  const totalSharesAfterAave = await briqShares.totalSupply();
  console.log(`Total shares after Aave deposit: ${ethers.formatUnits(totalSharesAfterAave, 18)} BRIQ`);

  // Test deposit with Compound strategy
  console.log("\n--- Testing Deposit with Compound Strategy ---");
  await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 1); // 1 = COMPOUND
  console.log(`Strategy for USDC set to Compound`);
  
  // Approve USDC for the vault
  const compoundDepositAmount = ethers.parseUnits("100", 6); // 100 USDC
  await usdc.connect(user).approve(await briqVault.getAddress(), compoundDepositAmount);
  console.log(`USDC approved for BriqVault: ${ethers.formatUnits(compoundDepositAmount, 6)} USDC`);
  
  // Deposit USDC to Compound via BriqVault
  console.log("\nDepositing USDC to Compound via BriqVault...");
  console.log("Measuring gas for deposit...");
  const depositCompoundTx = await briqVault.connect(user).deposit(USDC_ADDRESS, compoundDepositAmount);
  const depositCompoundReceipt = await depositCompoundTx.wait();
  console.log(`Gas used for Compound deposit: ${depositCompoundReceipt.gasUsed.toString()}`);
  
  // Check balances and shares
  const compoundBalance = await strategyCoordinator.getStrategyBalance(USDC_ADDRESS);
  console.log(`Strategy Compound balance: ${ethers.formatUnits(compoundBalance, 6)} cUSDC equivalent`);
  
  const userSharesAfterCompound = await briqShares.balanceOf(user.address);
  console.log(`User shares after Compound deposit: ${ethers.formatUnits(userSharesAfterCompound, 18)} BRIQ`);
  
  const totalSharesAfterCompound = await briqShares.totalSupply();
  console.log(`Total shares after Compound deposit: ${ethers.formatUnits(totalSharesAfterCompound, 18)} BRIQ`);

  // Test withdrawal
  console.log("\n--- Testing Withdrawal ---");
  
  // Get balances before withdrawal
  const userBalanceBeforeWithdraw = await usdc.balanceOf(user.address);
  const userSharesBeforeWithdraw = await briqShares.balanceOf(user.address);
  const aaveBalanceBeforeWithdraw = await strategyAave.balanceOf(USDC_ADDRESS);
  const compoundBalanceBeforeWithdraw = await strategyCompound.balanceOf(USDC_ADDRESS);
  
  console.log(`User USDC balance before withdraw: ${ethers.formatUnits(userBalanceBeforeWithdraw, 6)} USDC`);
  console.log(`User shares before withdraw: ${ethers.formatUnits(userSharesBeforeWithdraw, 18)} BRIQ`);
  console.log(`Aave balance before withdraw: ${ethers.formatUnits(aaveBalanceBeforeWithdraw, 6)} aUSDC`);
  console.log(`Compound balance before withdraw: ${ethers.formatUnits(compoundBalanceBeforeWithdraw, 6)} cUSDC`);
  
  // Withdraw a portion of shares
  const sharesToWithdraw = userSharesBeforeWithdraw / 4n; // Withdraw 25% of shares
  console.log(`\nWithdrawing ${ethers.formatUnits(sharesToWithdraw, 18)} BRIQ shares...`);
  console.log("Measuring gas for withdraw...");
  const withdrawTx = await briqVault.connect(user).withdraw(USDC_ADDRESS, sharesToWithdraw);
  const withdrawReceipt = await withdrawTx.wait();
  console.log(`Gas used for withdraw: ${withdrawReceipt.gasUsed.toString()}`);
  
  // Get balances after withdrawal
  const userBalanceAfterWithdraw = await usdc.balanceOf(user.address);
  const userSharesAfterWithdraw = await briqShares.balanceOf(user.address);
  const aaveBalanceAfterWithdraw = await strategyAave.balanceOf(USDC_ADDRESS);
  const compoundBalanceAfterWithdraw = await strategyCompound.balanceOf(USDC_ADDRESS);
  
  console.log(`\nUser USDC balance after withdraw: ${ethers.formatUnits(userBalanceAfterWithdraw, 6)} USDC`);
  console.log(`User shares after withdraw: ${ethers.formatUnits(userSharesAfterWithdraw, 18)} BRIQ`);
  console.log(`Aave balance after withdraw: ${ethers.formatUnits(aaveBalanceAfterWithdraw, 6)} aUSDC`);
  console.log(`Compound balance after withdraw: ${ethers.formatUnits(compoundBalanceAfterWithdraw, 6)} cUSDC`);
  
  // Calculate changes
  const usdcReceived = userBalanceAfterWithdraw - userBalanceBeforeWithdraw;
  const sharesBurned = userSharesBeforeWithdraw - userSharesAfterWithdraw;
  
  console.log(`\nUSCD received: ${ethers.formatUnits(usdcReceived, 6)} USDC`);
  console.log(`Shares burned: ${ethers.formatUnits(sharesBurned, 18)} BRIQ`);
  
  // Test full withdrawal
  console.log("\n--- Testing Full Withdrawal ---");
  
  // Withdraw all remaining shares
  const remainingShares = await briqShares.balanceOf(user.address);
  console.log(`\nWithdrawing all remaining shares: ${ethers.formatUnits(remainingShares, 18)} BRIQ...`);
  console.log("Measuring gas for full withdraw...");
  const fullWithdrawTx = await briqVault.connect(user).withdraw(USDC_ADDRESS, remainingShares);
  const fullWithdrawReceipt = await fullWithdrawTx.wait();
  console.log(`Gas used for full withdraw: ${fullWithdrawReceipt.gasUsed.toString()}`);
  
  // Get final balances
  const finalUserBalance = await usdc.balanceOf(user.address);
  const finalUserShares = await briqShares.balanceOf(user.address);
  const finalAaveBalance = await strategyAave.balanceOf(USDC_ADDRESS);
  const finalCompoundBalance = await strategyCompound.balanceOf(USDC_ADDRESS);
  
  console.log(`\nFinal user USDC balance: ${ethers.formatUnits(finalUserBalance, 6)} USDC`);
  console.log(`Final user shares: ${ethers.formatUnits(finalUserShares, 18)} BRIQ`);
  console.log(`Final Aave balance: ${ethers.formatUnits(finalAaveBalance, 6)} aUSDC`);
  console.log(`Final Compound balance: ${ethers.formatUnits(finalCompoundBalance, 6)} cUSDC`);

  console.log("\nTest completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
