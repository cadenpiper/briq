const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Mainnet addresses
const AAVE_POOL_V3 = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"; // Aave V3 Pool on Ethereum mainnet
const COMPOUND_COMET_USDC = "0xc3d688B66703497DAA19211EEdff47f25384cdc3"; // Compound v3 USDC market (Comet)
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC on Ethereum mainnet

describe("BriqVault", function () {
  // Increase timeout for forked network tests
  this.timeout(60000);

  async function deployBriqVaultFixture() {
    // Get signers
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy BriqShares
    const BriqShares = await ethers.getContractFactory("BriqShares");
    const briqShares = await BriqShares.deploy("Briq", "BRIQ");
    await briqShares.waitForDeployment();

    // Deploy StrategyAave
    const StrategyAave = await ethers.getContractFactory("StrategyAave");
    const strategyAave = await StrategyAave.deploy();
    await strategyAave.waitForDeployment();

    // Deploy StrategyCompoundComet
    const StrategyCompoundComet = await ethers.getContractFactory("StrategyCompoundComet");
    const strategyCompound = await StrategyCompoundComet.deploy();
    await strategyCompound.waitForDeployment();

    // Deploy StrategyCoordinator
    const StrategyCoordinator = await ethers.getContractFactory("StrategyCoordinator");
    const strategyCoordinator = await StrategyCoordinator.deploy(
      await strategyAave.getAddress(),
      await strategyCompound.getAddress()
    );
    await strategyCoordinator.waitForDeployment();

    // Deploy BriqVault
    const BriqVault = await ethers.getContractFactory("BriqVault");
    const briqVault = await BriqVault.deploy(
      await strategyCoordinator.getAddress(),
      await briqShares.getAddress()
    );
    await briqVault.waitForDeployment();

    // Set up contracts
    await (await briqShares.setVault(await briqVault.getAddress())).wait();
    await (await strategyAave.setCoordinator(await strategyCoordinator.getAddress())).wait();
    await (await strategyCompound.setCoordinator(await strategyCoordinator.getAddress())).wait();
    await (await strategyCoordinator.updateVaultAddress(await briqVault.getAddress())).wait();

    // Configure Aave strategy
    await (await strategyAave.updatePoolSupport(AAVE_POOL_V3, USDC_ADDRESS, true)).wait();
    await (await strategyAave.updateTokenSupport(USDC_ADDRESS, true)).wait();

    // Configure Compound strategy
    await (await strategyCompound.updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true)).wait();
    await (await strategyCompound.updateTokenSupport(USDC_ADDRESS, true)).wait();

    // Set strategy for USDC - Set both strategies
    await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 0)).wait(); // 0 = AAVE
    
    // Get USDC contract instance
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

    // Get a USDC whale to fund our tests
    const USDC_WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8"; // Example USDC whale address
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    const usdcWhale = await ethers.getSigner(USDC_WHALE);

    // Transfer some USDC to users for testing
    const testAmount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
    await usdc.connect(usdcWhale).transfer(user1.address, testAmount);
    await usdc.connect(usdcWhale).transfer(user2.address, testAmount);

    return { 
      briqVault, 
      briqShares, 
      strategyCoordinator, 
      strategyAave, 
      strategyCompound, 
      owner, 
      user1, 
      user2, 
      usdc, 
      testAmount 
    };
  }

  // Helper function to prepare both strategies with balances
  async function prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user, amount) {
    // First deposit to Compound
    await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 1)).wait(); // 1 = COMPOUND
    const compoundAmount = amount / 4n;
    await (await usdc.connect(user).approve(await briqVault.getAddress(), compoundAmount)).wait();
    await (await briqVault.connect(user).deposit(USDC_ADDRESS, compoundAmount)).wait();
    
    // Then deposit to Aave
    await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 0)).wait(); // 0 = AAVE
    const aaveAmount = amount / 2n;
    await (await usdc.connect(user).approve(await briqVault.getAddress(), aaveAmount)).wait();
    await (await briqVault.connect(user).deposit(USDC_ADDRESS, aaveAmount)).wait();
    
    return { compoundAmount, aaveAmount };
  }

  describe("Deployment", function () {
    it("should set the right owner", async function () {
      const { briqVault, owner } = await loadFixture(deployBriqVaultFixture);
      expect(await briqVault.owner()).to.equal(owner.address);
    });

    it("should set the correct strategyCoordinator and briqShares addresses", async function () {
      const { briqVault, strategyCoordinator, briqShares } = await loadFixture(deployBriqVaultFixture);
      expect(await briqVault.strategyCoordinator()).to.equal(await strategyCoordinator.getAddress());
      expect(await briqVault.briqShares()).to.equal(await briqShares.getAddress());
    });
  });

  describe("Deposit", function () {
    it("should allow users to deposit USDC and receive shares", async function () {
      const { briqVault, briqShares, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      const depositAmount = ethers.parseUnits("100", 6); // 100 USDC
      
      // Approve USDC for the vault
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount)).wait();
      
      // Check initial state
      const initialShares = await briqShares.balanceOf(user1.address);
      expect(initialShares).to.equal(0);
      
      // Deposit USDC - this is the operation we want to measure gas for
      const tx = await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount);
      await tx.wait();
      
      // Check that user received shares
      const finalShares = await briqShares.balanceOf(user1.address);
      expect(finalShares).to.be.gt(0);
    });

    it("should emit UserDeposited event with correct parameters", async function () {
      const { briqVault, briqShares, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      const depositAmount = ethers.parseUnits("100", 6); // 100 USDC
      
      // Approve USDC for the vault
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount)).wait();
      
      // Deposit USDC
      const tx = await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount);
      const receipt = await tx.wait();
      
      // Find the UserDeposited event
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'UserDeposited'
      );
      
      // Verify the event was emitted
      expect(event).to.not.be.undefined;
      
      // Verify the event parameters
      const [eventUser, eventToken, eventAmount, eventShares] = event.args;
      expect(eventUser).to.equal(user1.address);
      expect(eventToken).to.equal(USDC_ADDRESS);
      expect(eventAmount).to.equal(depositAmount);
      expect(eventShares).to.be.gt(0);
    });

    it("should revert when depositing zero amount", async function () {
      const { briqVault, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      const zeroAmount = ethers.parseUnits("0", 6);
      
      // Approve USDC for the vault
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), zeroAmount)).wait();
      
      // Try to deposit zero USDC
      await expect(
        briqVault.connect(user1).deposit(USDC_ADDRESS, zeroAmount)
      ).to.be.revertedWithCustomError(briqVault, "InvalidAmount");
    });

    it("should calculate shares correctly for first deposit", async function () {
      const { briqVault, briqShares, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      const depositAmount = ethers.parseUnits("100", 6); // 100 USDC
      
      // Approve USDC for the vault
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount)).wait();
      
      // Deposit USDC
      await (await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount)).wait();
      
      // For first deposit, shares should be amount * 1e12
      const expectedShares = depositAmount * 1000000000000n;
      const actualShares = await briqShares.balanceOf(user1.address);
      
      expect(actualShares).to.equal(expectedShares);
    });

    it("should calculate shares correctly for subsequent deposits", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, user2, usdc } = await loadFixture(deployBriqVaultFixture);
      
      // First deposit
      const firstDepositAmount = ethers.parseUnits("100", 6); // 100 USDC
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), firstDepositAmount)).wait();
      await (await briqVault.connect(user1).deposit(USDC_ADDRESS, firstDepositAmount)).wait();
      
      // Second deposit
      const secondDepositAmount = ethers.parseUnits("50", 6); // 50 USDC
      await (await usdc.connect(user2).approve(await briqVault.getAddress(), secondDepositAmount)).wait();
      await (await briqVault.connect(user2).deposit(USDC_ADDRESS, secondDepositAmount)).wait();
      
      // Check shares
      const user1Shares = await briqShares.balanceOf(user1.address);
      const user2Shares = await briqShares.balanceOf(user2.address);
      const totalShares = await briqShares.totalSupply();
      
      // Verify total shares equals sum of individual shares
      expect(totalShares).to.equal(user1Shares + user2Shares);
      
      // Verify share ratio is proportional to deposit amounts
      const totalBalance = await strategyCoordinator.getTotalTokenBalance(USDC_ADDRESS);
      const user1ShareRatio = user1Shares * 100n / totalShares;
      const user2ShareRatio = user2Shares * 100n / totalShares;
      
      // User1 should have approximately 2/3 of shares (100 of 150 total USDC)
      expect(user1ShareRatio).to.be.closeTo(66n, 1n);
      // User2 should have approximately 1/3 of shares (50 of 150 total USDC)
      expect(user2ShareRatio).to.be.closeTo(33n, 1n);
    });
  });

  describe("Withdraw", function () {
    it("should allow users to withdraw USDC by burning shares", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, usdc, testAmount } = await loadFixture(deployBriqVaultFixture);
      
      // Prepare both strategies with balances to avoid InvalidAmount error
      await prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user1, testAmount);
      
      // Get user's shares
      const userShares = await briqShares.balanceOf(user1.address);
      const sharesToWithdraw = userShares / 4n; // Withdraw a quarter of shares
      
      // Check initial USDC balance
      const initialBalance = await usdc.balanceOf(user1.address);
      
      // Withdraw USDC - this is the operation we want to measure gas for
      const tx = await briqVault.connect(user1).withdraw(USDC_ADDRESS, sharesToWithdraw);
      await tx.wait();
      
      // Check that user received USDC
      const finalBalance = await usdc.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(initialBalance);
      
      // Check that shares were burned
      const finalShares = await briqShares.balanceOf(user1.address);
      expect(finalShares).to.equal(userShares - sharesToWithdraw);
    });

    it("should emit UserWithdrew event with correct parameters", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, usdc, testAmount } = await loadFixture(deployBriqVaultFixture);
      
      // Prepare both strategies with balances to avoid InvalidAmount error
      await prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user1, testAmount);
      
      // Get user's shares
      const userShares = await briqShares.balanceOf(user1.address);
      const sharesToWithdraw = userShares / 4n; // Withdraw a quarter of shares
      
      // Withdraw USDC
      const tx = await briqVault.connect(user1).withdraw(USDC_ADDRESS, sharesToWithdraw);
      const receipt = await tx.wait();
      
      // Find the UserWithdrew event
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'UserWithdrew'
      );
      
      // Verify the event was emitted
      expect(event).to.not.be.undefined;
      
      // Verify the event parameters
      const [eventUser, eventToken, eventAmount, eventShares] = event.args;
      expect(eventUser).to.equal(user1.address);
      expect(eventToken).to.equal(USDC_ADDRESS);
      expect(eventAmount).to.be.gt(0);
      expect(eventShares).to.equal(sharesToWithdraw);
    });

    it("should revert when withdrawing zero shares", async function () {
      const { briqVault, user1 } = await loadFixture(deployBriqVaultFixture);
      
      const zeroShares = 0n;
      
      // Try to withdraw with zero shares
      await expect(
        briqVault.connect(user1).withdraw(USDC_ADDRESS, zeroShares)
      ).to.be.revertedWithCustomError(briqVault, "InvalidAmount");
    });

    it("should revert when withdrawing more shares than owned", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, usdc, testAmount } = await loadFixture(deployBriqVaultFixture);
      
      // Prepare both strategies with balances to avoid InvalidAmount error
      await prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user1, testAmount);
      
      // Get user's shares
      const userShares = await briqShares.balanceOf(user1.address);
      const tooManyShares = userShares + 1n; // More shares than owned
      
      // Try to withdraw too many shares
      await expect(
        briqVault.connect(user1).withdraw(USDC_ADDRESS, tooManyShares)
      ).to.be.revertedWithCustomError(briqVault, "InvalidShares");
    });

    it("should calculate withdrawal amount correctly", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, usdc, testAmount } = await loadFixture(deployBriqVaultFixture);
      
      // Prepare both strategies with balances to avoid InvalidAmount error
      await prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user1, testAmount);
      
      // Get user's shares
      const userShares = await briqShares.balanceOf(user1.address);
      const sharesToWithdraw = userShares / 4n; // Withdraw a quarter of shares
      
      // Get initial balance
      const initialBalance = await usdc.balanceOf(user1.address);
      
      // Withdraw USDC
      await (await briqVault.connect(user1).withdraw(USDC_ADDRESS, sharesToWithdraw)).wait();
      
      // Get final balance
      const finalBalance = await usdc.balanceOf(user1.address);
      const withdrawnAmount = finalBalance - initialBalance;
      
      // Should have withdrawn approximately a quarter of the deposit amount
      const totalDeposited = testAmount / 4n + testAmount / 2n; // compoundAmount + aaveAmount
      const expectedWithdrawal = totalDeposited / 4n; // 1/4 of total deposited
      
      expect(withdrawnAmount).to.be.closeTo(expectedWithdrawal, ethers.parseUnits("1", 6)); // Allow 1 USDC tolerance
    });
  });

  describe("Integration", function () {
    it("should handle multiple deposits and withdrawals from different users", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, user2, usdc, testAmount } = await loadFixture(deployBriqVaultFixture);
      
      // Prepare both strategies with balances for user1
      await prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user1, testAmount);
      
      // User2 deposits
      const depositAmount2 = ethers.parseUnits("200", 6); // 200 USDC
      await (await usdc.connect(user2).approve(await briqVault.getAddress(), depositAmount2)).wait();
      await (await briqVault.connect(user2).deposit(USDC_ADDRESS, depositAmount2)).wait();
      
      // Get initial balances
      const initialShares1 = await briqShares.balanceOf(user1.address);
      const initialShares2 = await briqShares.balanceOf(user2.address);
      const initialBalance1 = await usdc.balanceOf(user1.address);
      const initialBalance2 = await usdc.balanceOf(user2.address);
      
      // User1 withdraws a quarter
      const sharesToWithdraw1 = initialShares1 / 4n;
      await (await briqVault.connect(user1).withdraw(USDC_ADDRESS, sharesToWithdraw1)).wait();
      
      // User2 withdraws half
      const sharesToWithdraw2 = initialShares2 / 2n;
      await (await briqVault.connect(user2).withdraw(USDC_ADDRESS, sharesToWithdraw2)).wait();
      
      // Check final balances
      const finalShares1 = await briqShares.balanceOf(user1.address);
      const finalShares2 = await briqShares.balanceOf(user2.address);
      const finalBalance1 = await usdc.balanceOf(user1.address);
      const finalBalance2 = await usdc.balanceOf(user2.address);
      
      // Verify shares
      expect(finalShares1).to.equal(initialShares1 - sharesToWithdraw1);
      expect(finalShares2).to.equal(initialShares2 - sharesToWithdraw2);
      
      // Verify balances increased
      expect(finalBalance1).to.be.gt(initialBalance1);
      expect(finalBalance2).to.be.gt(initialBalance2);
    });

    it("should handle switching between strategies", async function () {
      const { briqVault, strategyCoordinator, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      // User deposits with Aave strategy (default)
      const depositAmount = ethers.parseUnits("100", 6); // 100 USDC
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount)).wait();
      await (await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount)).wait();
      
      // Switch to Compound strategy
      await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 1)).wait(); // 1 = COMPOUND
      
      // User deposits again with Compound strategy
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount)).wait();
      await (await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount)).wait();
      
      // Verify balances in both strategies
      const aaveBalance = await strategyCoordinator.strategyAave().then(addr => 
        ethers.getContractAt("StrategyAave", addr).then(contract => 
          contract.balanceOf(USDC_ADDRESS)
        )
      );
      
      const compoundBalance = await strategyCoordinator.strategyCompound().then(addr => 
        ethers.getContractAt("StrategyCompoundComet", addr).then(contract => 
          contract.balanceOf(USDC_ADDRESS)
        )
      );
      
      // Both strategies should have balances
      expect(aaveBalance).to.be.gt(0);
      expect(compoundBalance).to.be.gt(0);
    });
  });
});
