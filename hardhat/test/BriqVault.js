const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const fs = require('fs');

describe("BriqVault - Complete Protocol", function () {
  this.timeout(60000);

  let USDC_ADDRESS, WETH_ADDRESS, AAVE_POOL_V3, COMPOUND_COMET_USDC, COMPOUND_COMET_WETH, USDC_WHALE, WETH_WHALE;

  async function deployBriqVaultFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const chainId = (await ethers.provider.getNetwork()).chainId;

    const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const chainConfig = configData.CHAIN_CONFIG[chainId.toString()];
    if (!chainConfig) throw new Error(`No config for chain ID ${chainId}`);

    // Set global variables from config
    USDC_WHALE = chainConfig.usdcWhale;
    WETH_WHALE = chainConfig.wethWhale;
    AAVE_POOL_V3 = chainConfig.aavePoolV3;
    COMPOUND_COMET_USDC = chainConfig.compoundMarketUSDC;
    COMPOUND_COMET_WETH = chainConfig.compoundMarketWETH;
    USDC_ADDRESS = chainConfig.usdcAddress;
    WETH_ADDRESS = chainConfig.wethAddress;

    // Deploy PriceFeedManager (core protocol component)
    const PriceFeedManager = await ethers.getContractFactory("PriceFeedManager");
    const priceFeedManager = await PriceFeedManager.deploy();
    await priceFeedManager.waitForDeployment();

    // Deploy BriqShares
    const BriqShares = await ethers.getContractFactory("BriqShares");
    const briqShares = await BriqShares.deploy("Briq Shares", "BRIQ");
    await briqShares.waitForDeployment();

    // Deploy strategies
    const StrategyAave = await ethers.getContractFactory("StrategyAave");
    const strategyAave = await StrategyAave.deploy();
    await strategyAave.waitForDeployment();

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

    // Deploy BriqVault with PriceFeedManager (core integration)
    const BriqVault = await ethers.getContractFactory("BriqVault");
    const briqVault = await BriqVault.deploy(
      await strategyCoordinator.getAddress(),
      await briqShares.getAddress(),
      await priceFeedManager.getAddress()
    );
    await briqVault.waitForDeployment();

    // Set up contract permissions
    await (await briqShares.setVault(await briqVault.getAddress())).wait();
    await (await strategyAave.setCoordinator(await strategyCoordinator.getAddress())).wait();
    await (await strategyCompound.setCoordinator(await strategyCoordinator.getAddress())).wait();
    await (await strategyCoordinator.updateVaultAddress(await briqVault.getAddress())).wait();

    // Configure price feeds (core protocol setup)
    const USDC_USD_FEED = "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6"; // USDC/USD Chainlink
    const ETH_USD_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";  // ETH/USD Chainlink
    await (await priceFeedManager.setPriceFeed(USDC_ADDRESS, USDC_USD_FEED, 6)).wait();
    await (await priceFeedManager.setPriceFeed(WETH_ADDRESS, ETH_USD_FEED, 18)).wait();

    // Configure Aave strategy
    await (await strategyAave.setAavePool(AAVE_POOL_V3)).wait();
    await (await strategyAave.addSupportedToken(USDC_ADDRESS)).wait();
    await (await strategyAave.addSupportedToken(WETH_ADDRESS)).wait();

    // Configure Compound strategy
    await (await strategyCompound.updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true)).wait();
    await (await strategyCompound.updateTokenSupport(USDC_ADDRESS, true)).wait();
    await (await strategyCompound.updateMarketSupport(COMPOUND_COMET_WETH, WETH_ADDRESS, true)).wait();
    await (await strategyCompound.updateTokenSupport(WETH_ADDRESS, true)).wait();

    // Set strategy assignments (register tokens in coordinator)
    await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 0)).wait(); // Aave
    await (await strategyCoordinator.setStrategyForToken(WETH_ADDRESS, 0)).wait(); // Aave

    // Get token contracts
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);

    // Fund test accounts with tokens
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    await ethers.provider.send("hardhat_impersonateAccount", [WETH_WHALE]);
    
    const usdcWhale = await ethers.getSigner(USDC_WHALE);
    const wethWhale = await ethers.getSigner(WETH_WHALE);

    // Fund whale accounts with ETH for gas
    await ethers.provider.send("hardhat_setBalance", [USDC_WHALE, "0x1000000000000000000"]);
    await ethers.provider.send("hardhat_setBalance", [WETH_WHALE, "0x1000000000000000000"]);

    // Transfer tokens to test accounts
    const usdcTestAmount = ethers.parseUnits("1000", 6);
    const wethTestAmount = ethers.parseUnits("1", 18);

    await usdc.connect(usdcWhale).transfer(user1.address, usdcTestAmount);
    await usdc.connect(usdcWhale).transfer(user2.address, usdcTestAmount);
    await usdc.connect(usdcWhale).transfer(user3.address, usdcTestAmount);

    await weth.connect(wethWhale).transfer(user1.address, wethTestAmount);
    await weth.connect(wethWhale).transfer(user2.address, wethTestAmount);
    await weth.connect(wethWhale).transfer(user3.address, wethTestAmount);

    return { 
      briqVault, 
      briqShares, 
      strategyCoordinator, 
      strategyAave, 
      strategyCompound, 
      priceFeedManager,
      owner, 
      user1, 
      user2, 
      user3,
      usdc, 
      weth,
      usdcTestAmount,
      wethTestAmount
    };
  }

  describe("Deployment", function () {
    it("should deploy with correct configuration", async function () {
      const { briqVault, strategyCoordinator, briqShares, priceFeedManager, owner } = await loadFixture(deployBriqVaultFixture);
      
      expect(await briqVault.owner()).to.equal(owner.address);
      expect(await briqVault.strategyCoordinator()).to.equal(await strategyCoordinator.getAddress());
      expect(await briqVault.briqShares()).to.equal(await briqShares.getAddress());
      expect(await briqVault.priceFeedManager()).to.equal(await priceFeedManager.getAddress());
    });

    it("should have price feeds configured for supported tokens", async function () {
      const { priceFeedManager } = await loadFixture(deployBriqVaultFixture);
      
      expect(await priceFeedManager.hasPriceFeed(USDC_ADDRESS)).to.be.true;
      expect(await priceFeedManager.hasPriceFeed(WETH_ADDRESS)).to.be.true;
      
      // Verify prices are accessible
      const usdcPrice = await priceFeedManager.getTokenPrice(USDC_ADDRESS);
      const wethPrice = await priceFeedManager.getTokenPrice(WETH_ADDRESS);
      
      expect(usdcPrice).to.be.gt(0);
      expect(wethPrice).to.be.gt(0);
    });

    it("should have dynamic supported tokens list", async function () {
      const { briqVault } = await loadFixture(deployBriqVaultFixture);
      
      const supportedTokens = await briqVault.getSupportedTokens();
      expect(supportedTokens).to.include(USDC_ADDRESS);
      expect(supportedTokens).to.include(WETH_ADDRESS);
      expect(supportedTokens.length).to.equal(2);
    });
  });

  describe("USD-Normalized Deposits", function () {
    it("should mint fair shares based on USD value for USDC deposits", async function () {
      const { briqVault, briqShares, priceFeedManager, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      const depositAmount = ethers.parseUnits("100", 6);
      const expectedUsdValue = await priceFeedManager.getTokenValueInUSD(USDC_ADDRESS, depositAmount);
      
      await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount);
      await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount);
      
      const userShares = await briqShares.balanceOf(user1.address);
      
      // Shares should equal USD value (1:1 ratio for first deposit)
      expect(userShares).to.equal(expectedUsdValue);
    });

    it("should mint fair shares based on USD value for WETH deposits", async function () {
      const { briqVault, briqShares, priceFeedManager, user1, weth } = await loadFixture(deployBriqVaultFixture);
      
      const depositAmount = ethers.parseUnits("0.1", 18); // 0.1 WETH
      const expectedUsdValue = await priceFeedManager.getTokenValueInUSD(WETH_ADDRESS, depositAmount);
      
      await weth.connect(user1).approve(await briqVault.getAddress(), depositAmount);
      await briqVault.connect(user1).deposit(WETH_ADDRESS, depositAmount);
      
      const userShares = await briqShares.balanceOf(user1.address);
      
      // Shares should equal USD value (1:1 ratio for first deposit)
      expect(userShares).to.equal(expectedUsdValue);
    });

    it("should provide fair share distribution across different tokens", async function () {
      const { briqVault, briqShares, priceFeedManager, user1, user2, usdc, weth } = await loadFixture(deployBriqVaultFixture);
      
      // User1 deposits 100 USDC
      const usdcAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await briqVault.getAddress(), usdcAmount);
      await briqVault.connect(user1).deposit(USDC_ADDRESS, usdcAmount);
      
      // User2 deposits equivalent USD value in WETH
      const targetUsdValue = ethers.parseEther("100"); // $100
      const wethPrice = await priceFeedManager.getTokenPrice(WETH_ADDRESS);
      const wethPriceIn18Decimals = ethers.parseUnits(ethers.formatUnits(wethPrice, 8), 18);
      const wethAmount = (targetUsdValue * ethers.parseEther("1")) / wethPriceIn18Decimals;
      
      await weth.connect(user2).approve(await briqVault.getAddress(), wethAmount);
      await briqVault.connect(user2).deposit(WETH_ADDRESS, wethAmount);
      
      const user1Shares = await briqShares.balanceOf(user1.address);
      const user2Shares = await briqShares.balanceOf(user2.address);
      
      // Both users should have similar shares (within 1% due to price precision)
      const shareRatio = parseFloat(ethers.formatEther(user1Shares)) / parseFloat(ethers.formatEther(user2Shares));
      expect(Math.abs(shareRatio - 1.0)).to.be.lessThan(0.01);
    });

    it("should emit UserDeposited event with correct USD value", async function () {
      const { briqVault, priceFeedManager, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      const depositAmount = ethers.parseUnits("50", 6);
      const expectedUsdValue = await priceFeedManager.getTokenValueInUSD(USDC_ADDRESS, depositAmount);
      
      await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount);
      
      await expect(briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount))
        .to.emit(briqVault, "UserDeposited")
        .withArgs(user1.address, USDC_ADDRESS, depositAmount, expectedUsdValue, expectedUsdValue);
    });
  });

  describe("USD-Normalized Withdrawals", function () {
    it("should allow fair withdrawals based on USD value", async function () {
      const { briqVault, briqShares, priceFeedManager, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      // Deposit first
      const depositAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount);
      await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount);
      
      const userShares = await briqShares.balanceOf(user1.address);
      const sharesToWithdraw = userShares / 2n; // Withdraw 50%
      
      const initialBalance = await usdc.balanceOf(user1.address);
      
      await briqVault.connect(user1).withdraw(USDC_ADDRESS, sharesToWithdraw);
      
      const finalBalance = await usdc.balanceOf(user1.address);
      const finalShares = await briqShares.balanceOf(user1.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
      expect(finalShares).to.equal(userShares - sharesToWithdraw);
    });

    it("should handle graceful partial withdrawals when insufficient tokens", async function () {
      const { briqVault, briqShares, user1, user2, usdc, weth } = await loadFixture(deployBriqVaultFixture);
      
      // User1 deposits USDC, User2 deposits WETH
      const usdcAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await briqVault.getAddress(), usdcAmount);
      await briqVault.connect(user1).deposit(USDC_ADDRESS, usdcAmount);
      
      const wethAmount = ethers.parseUnits("0.1", 18);
      await weth.connect(user2).approve(await briqVault.getAddress(), wethAmount);
      await briqVault.connect(user2).deposit(WETH_ADDRESS, wethAmount);
      
      // User2 tries to withdraw all their value as USDC (should be partial)
      const user2Shares = await briqShares.balanceOf(user2.address);
      const initialUsdcBalance = await usdc.balanceOf(user2.address);
      const initialShares = await briqShares.balanceOf(user2.address);
      
      await briqVault.connect(user2).withdraw(USDC_ADDRESS, user2Shares);
      
      const finalUsdcBalance = await usdc.balanceOf(user2.address);
      const finalShares = await briqShares.balanceOf(user2.address);
      
      // Should receive some USDC and burn some shares (partial withdrawal)
      expect(finalUsdcBalance).to.be.gt(initialUsdcBalance);
      expect(finalShares).to.be.lt(initialShares);
    });

    it("should provide withdrawal availability information", async function () {
      const { briqVault, briqShares, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      // Deposit first
      const depositAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount);
      await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount);
      
      const userShares = await briqShares.balanceOf(user1.address);
      const sharesToCheck = userShares / 2n;
      
      const [canWithdrawFull, availableAmount, idealAmount] = await briqVault.checkWithdrawalAvailability(USDC_ADDRESS, sharesToCheck);
      
      expect(canWithdrawFull).to.be.true;
      expect(availableAmount).to.be.gt(0);
      expect(idealAmount).to.be.gt(0);
      expect(availableAmount).to.be.gte(idealAmount);
    });

    it("should emit UserWithdrew event with correct values", async function () {
      const { briqVault, briqShares, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      // Deposit first
      const depositAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount);
      await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount);
      
      const userShares = await briqShares.balanceOf(user1.address);
      const sharesToWithdraw = userShares / 4n; // Withdraw 25%
      
      await expect(briqVault.connect(user1).withdraw(USDC_ADDRESS, sharesToWithdraw))
        .to.emit(briqVault, "UserWithdrew");
    });
  });

  describe("Multi-Token Protocol Integration", function () {
    it("should handle complete multi-user, multi-token deposit and withdrawal cycle", async function () {
      const { briqVault, briqShares, priceFeedManager, user1, user2, user3, usdc, weth } = await loadFixture(deployBriqVaultFixture);
      
      // Phase 1: Multi-token deposits
      const usdcAmount1 = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await briqVault.getAddress(), usdcAmount1);
      await briqVault.connect(user1).deposit(USDC_ADDRESS, usdcAmount1);
      
      const wethAmount = ethers.parseUnits("0.05", 18);
      await weth.connect(user2).approve(await briqVault.getAddress(), wethAmount);
      await briqVault.connect(user2).deposit(WETH_ADDRESS, wethAmount);
      
      const usdcAmount3 = ethers.parseUnits("50", 6);
      await usdc.connect(user3).approve(await briqVault.getAddress(), usdcAmount3);
      await briqVault.connect(user3).deposit(USDC_ADDRESS, usdcAmount3);
      
      // Verify vault state
      const totalVaultValue = await briqVault.getTotalVaultValueInUSD();
      const totalShares = await briqShares.totalSupply();
      
      expect(totalVaultValue).to.be.gt(0);
      expect(totalShares).to.be.gt(0);
      
      // Phase 2: Withdrawals
      const user1Shares = await briqShares.balanceOf(user1.address);
      const withdrawShares = user1Shares / 2n;
      
      await briqVault.connect(user1).withdraw(USDC_ADDRESS, withdrawShares);
      
      const remainingShares = await briqShares.balanceOf(user1.address);
      expect(remainingShares).to.equal(user1Shares - withdrawShares);
      
      // Verify vault maintains consistency
      const finalVaultValue = await briqVault.getTotalVaultValueInUSD();
      const finalTotalShares = await briqShares.totalSupply();
      
      expect(finalVaultValue).to.be.gt(0);
      expect(finalTotalShares).to.be.gt(0);
      expect(finalTotalShares).to.be.lt(totalShares); // Shares were burned
    });

    it("should maintain consistent share pricing throughout operations", async function () {
      const { briqVault, briqShares, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      // Initial deposit
      const depositAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount);
      await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount);
      
      const initialVaultValue = await briqVault.getTotalVaultValueInUSD();
      const initialShares = await briqShares.totalSupply();
      const initialSharePrice = parseFloat(ethers.formatEther(initialVaultValue)) / parseFloat(ethers.formatEther(initialShares));
      
      // Partial withdrawal
      const userShares = await briqShares.balanceOf(user1.address);
      await briqVault.connect(user1).withdraw(USDC_ADDRESS, userShares / 3n);
      
      const finalVaultValue = await briqVault.getTotalVaultValueInUSD();
      const finalShares = await briqShares.totalSupply();
      
      if (finalShares > 0) {
        const finalSharePrice = parseFloat(ethers.formatEther(finalVaultValue)) / parseFloat(ethers.formatEther(finalShares));
        
        // Share price should remain consistent (within small tolerance for rounding)
        expect(Math.abs(finalSharePrice - initialSharePrice)).to.be.lessThan(0.001);
      }
    });
  });

  describe("Error Handling", function () {
    it("should revert on invalid deposit amounts", async function () {
      const { briqVault, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      await expect(
        briqVault.connect(user1).deposit(USDC_ADDRESS, 0)
      ).to.be.revertedWithCustomError(briqVault, "InvalidAmount");
    });

    it("should revert on invalid withdrawal amounts", async function () {
      const { briqVault, user1 } = await loadFixture(deployBriqVaultFixture);
      
      await expect(
        briqVault.connect(user1).withdraw(USDC_ADDRESS, 0)
      ).to.be.revertedWithCustomError(briqVault, "InvalidAmount");
    });

    it("should revert when withdrawing more shares than owned", async function () {
      const { briqVault, briqShares, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      // Small deposit
      const depositAmount = ethers.parseUnits("10", 6);
      await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount);
      await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount);
      
      const userShares = await briqShares.balanceOf(user1.address);
      const tooManyShares = userShares + ethers.parseEther("1");
      
      await expect(
        briqVault.connect(user1).withdraw(USDC_ADDRESS, tooManyShares)
      ).to.be.revertedWithCustomError(briqVault, "InvalidShares");
    });

    it("should handle deposits without price feeds gracefully", async function () {
      const { briqVault, user1 } = await loadFixture(deployBriqVaultFixture);
      
      const unsupportedToken = "0x1234567890123456789012345678901234567890";
      
      await expect(
        briqVault.connect(user1).deposit(unsupportedToken, ethers.parseEther("1"))
      ).to.be.reverted; // Should revert due to no price feed
    });
  });

  describe("Vault State Management", function () {
    it("should accurately track total vault value in USD", async function () {
      const { briqVault, priceFeedManager, user1, user2, usdc, weth } = await loadFixture(deployBriqVaultFixture);
      
      // Deposit USDC
      const usdcAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await briqVault.getAddress(), usdcAmount);
      await briqVault.connect(user1).deposit(USDC_ADDRESS, usdcAmount);
      
      // Deposit WETH
      const wethAmount = ethers.parseUnits("0.1", 18);
      await weth.connect(user2).approve(await briqVault.getAddress(), wethAmount);
      await briqVault.connect(user2).deposit(WETH_ADDRESS, wethAmount);
      
      const totalVaultValue = await briqVault.getTotalVaultValueInUSD();
      
      // Calculate expected value
      const usdcValue = await priceFeedManager.getTokenValueInUSD(USDC_ADDRESS, usdcAmount);
      const wethValue = await priceFeedManager.getTokenValueInUSD(WETH_ADDRESS, wethAmount);
      const expectedValue = usdcValue + wethValue;
      
      // Should be very close (within small tolerance for strategy yields)
      const difference = totalVaultValue > expectedValue ? totalVaultValue - expectedValue : expectedValue - totalVaultValue;
      const tolerance = expectedValue / 100n; // 1% tolerance
      
      expect(difference).to.be.lte(tolerance);
    });

    it("should maintain accurate supported tokens list", async function () {
      const { briqVault, strategyCoordinator } = await loadFixture(deployBriqVaultFixture);
      
      const vaultTokens = await briqVault.getSupportedTokens();
      const coordinatorTokens = await strategyCoordinator.getSupportedTokens();
      
      expect(vaultTokens.length).to.equal(coordinatorTokens.length);
      expect(vaultTokens).to.deep.equal(coordinatorTokens);
    });
  });
});
