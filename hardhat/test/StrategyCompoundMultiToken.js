const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const fs = require('fs');

describe("StrategyCompound - Multi-Token Integration", function () {
  // Increase timeout for forked network tests
  this.timeout(60000);

  let USDC_ADDRESS, WETH_ADDRESS, COMPOUND_MARKET_USDC, COMPOUND_MARKET_WETH, USDC_WHALE, WETH_WHALE;

  async function deployMultiTokenStrategyCompoundFixture() {
    // Get signers
    const [owner, coordinator, user] = await ethers.getSigners();

    const chainId = (await ethers.provider.getNetwork()).chainId;

    const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const chainConfig = configData.CHAIN_CONFIG[chainId.toString()];
    if (!chainConfig) throw new Error(`No config for chain ID ${chainId}`);

    USDC_WHALE = chainConfig.usdcWhale;
    WETH_WHALE = chainConfig.wethWhale;
    COMPOUND_MARKET_USDC = chainConfig.compoundMarketUSDC;
    COMPOUND_MARKET_WETH = chainConfig.compoundMarketWETH;
    USDC_ADDRESS = chainConfig.usdcAddress;
    WETH_ADDRESS = chainConfig.wethAddress;

    // Deploy StrategyCompoundComet
    const StrategyCompoundComet = await ethers.getContractFactory("StrategyCompoundComet");
    const strategyCompound = await StrategyCompoundComet.deploy();
    await strategyCompound.waitForDeployment();

    // Get token contract instances
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);

    // Set up USDC whale
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    const usdcWhale = await ethers.getSigner(USDC_WHALE);
    await ethers.provider.send("hardhat_setBalance", [
      USDC_WHALE,
      "0x56BC75E2D630E0000", // 100 ETH in hex
    ]);

    // Set up WETH whale
    await ethers.provider.send("hardhat_impersonateAccount", [WETH_WHALE]);
    const wethWhale = await ethers.getSigner(WETH_WHALE);
    await ethers.provider.send("hardhat_setBalance", [
      WETH_WHALE,
      "0x56BC75E2D630E0000", // 100 ETH in hex
    ]);

    // Transfer tokens to coordinator for testing
    const usdcTestAmount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
    const wethTestAmount = ethers.parseUnits("1", 18); // 1 WETH (18 decimals)
    
    await usdc.connect(usdcWhale).transfer(coordinator.address, usdcTestAmount);
    await weth.connect(wethWhale).transfer(coordinator.address, wethTestAmount);

    return { 
      strategyCompound, 
      owner, 
      coordinator, 
      user, 
      usdc, 
      weth, 
      usdcTestAmount, 
      wethTestAmount,
      usdcWhale,
      wethWhale
    };
  }

  describe("Multi-Token Configuration", function () {
    it("should set up separate Compound markets for USDC and WETH", async function () {
      const { strategyCompound, owner } = await loadFixture(deployMultiTokenStrategyCompoundFixture);
      
      // Add USDC market support
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_USDC, USDC_ADDRESS, true)).wait();
      expect(await strategyCompound.supportedMarkets(COMPOUND_MARKET_USDC)).to.be.true;
      
      // Add WETH market support (different market address)
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_WETH, WETH_ADDRESS, true)).wait();
      expect(await strategyCompound.supportedMarkets(COMPOUND_MARKET_WETH)).to.be.true;
      
      // Enable token support
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      expect(await strategyCompound.supportedTokens(USDC_ADDRESS)).to.be.true;
      
      await (await strategyCompound.connect(owner).updateTokenSupport(WETH_ADDRESS, true)).wait();
      expect(await strategyCompound.supportedTokens(WETH_ADDRESS)).to.be.true;
      
      // Verify token-to-market mappings are different
      const usdcMarket = await strategyCompound.tokenToComet(USDC_ADDRESS);
      const wethMarket = await strategyCompound.tokenToComet(WETH_ADDRESS);
      
      expect(usdcMarket).to.equal(COMPOUND_MARKET_USDC);
      expect(wethMarket).to.equal(COMPOUND_MARKET_WETH);
      expect(usdcMarket).to.not.equal(wethMarket); // Different markets for different tokens
    });

    it("should handle market removal correctly", async function () {
      const { strategyCompound, owner } = await loadFixture(deployMultiTokenStrategyCompoundFixture);
      
      // Set up both markets and tokens
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_USDC, USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_WETH, WETH_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(WETH_ADDRESS, true)).wait();
      
      // Remove USDC market support
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_USDC, USDC_ADDRESS, false)).wait();
      
      // Verify USDC market is removed but WETH remains
      expect(await strategyCompound.supportedMarkets(COMPOUND_MARKET_USDC)).to.be.false;
      expect(await strategyCompound.supportedMarkets(COMPOUND_MARKET_WETH)).to.be.true;
      
      // Verify token mapping is cleared for USDC but not WETH
      expect(await strategyCompound.tokenToComet(USDC_ADDRESS)).to.equal(ethers.ZeroAddress);
      expect(await strategyCompound.tokenToComet(WETH_ADDRESS)).to.equal(COMPOUND_MARKET_WETH);
    });

    it("should handle token removal correctly", async function () {
      const { strategyCompound, owner } = await loadFixture(deployMultiTokenStrategyCompoundFixture);
      
      // Set up both markets and tokens
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_USDC, USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_WETH, WETH_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(WETH_ADDRESS, true)).wait();
      
      // Remove USDC token support
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, false)).wait();
      
      // Verify USDC token is removed but WETH remains
      expect(await strategyCompound.supportedTokens(USDC_ADDRESS)).to.be.false;
      expect(await strategyCompound.supportedTokens(WETH_ADDRESS)).to.be.true;
      
      // Market mappings should be cleared for USDC
      expect(await strategyCompound.tokenToComet(USDC_ADDRESS)).to.equal(ethers.ZeroAddress);
      expect(await strategyCompound.tokenToComet(WETH_ADDRESS)).to.equal(COMPOUND_MARKET_WETH);
    });
  });

  describe("Multi-Token Deposits and Withdrawals", function () {
    it("should deposit both USDC and WETH to their respective Compound markets", async function () {
      const { 
        strategyCompound, 
        owner, 
        coordinator, 
        usdc, 
        weth, 
        usdcTestAmount, 
        wethTestAmount 
      } = await loadFixture(deployMultiTokenStrategyCompoundFixture);
      
      // Set up the strategy for both tokens
      await (await strategyCompound.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_USDC, USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_WETH, WETH_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(WETH_ADDRESS, true)).wait();
      
      // Approve tokens for the strategy
      await (await usdc.connect(coordinator).approve(await strategyCompound.getAddress(), usdcTestAmount)).wait();
      await (await weth.connect(coordinator).approve(await strategyCompound.getAddress(), wethTestAmount)).wait();
      
      // Deposit USDC to its market
      await (await strategyCompound.connect(coordinator).deposit(USDC_ADDRESS, usdcTestAmount)).wait();
      const usdcBalance = await strategyCompound.balanceOf(USDC_ADDRESS);
      expect(usdcBalance).to.be.gt(0);
      
      // Deposit WETH to its market
      await (await strategyCompound.connect(coordinator).deposit(WETH_ADDRESS, wethTestAmount)).wait();
      const wethBalance = await strategyCompound.balanceOf(WETH_ADDRESS);
      expect(wethBalance).to.be.gt(0);
    });

    it("should withdraw both USDC and WETH from their respective Compound markets", async function () {
      const { 
        strategyCompound, 
        owner, 
        coordinator, 
        usdc, 
        weth, 
        usdcTestAmount, 
        wethTestAmount 
      } = await loadFixture(deployMultiTokenStrategyCompoundFixture);
      
      // Set up the strategy and deposit both tokens
      await (await strategyCompound.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_USDC, USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_WETH, WETH_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(WETH_ADDRESS, true)).wait();
      
      await (await usdc.connect(coordinator).approve(await strategyCompound.getAddress(), usdcTestAmount)).wait();
      await (await weth.connect(coordinator).approve(await strategyCompound.getAddress(), wethTestAmount)).wait();
      
      await (await strategyCompound.connect(coordinator).deposit(USDC_ADDRESS, usdcTestAmount)).wait();
      await (await strategyCompound.connect(coordinator).deposit(WETH_ADDRESS, wethTestAmount)).wait();
      
      // Get balances before withdrawal
      const usdcBalanceBefore = await usdc.balanceOf(coordinator.address);
      const wethBalanceBefore = await weth.balanceOf(coordinator.address);
      
      // Withdraw USDC
      await (await strategyCompound.connect(coordinator).withdraw(USDC_ADDRESS, usdcTestAmount)).wait();
      const usdcBalanceAfter = await usdc.balanceOf(coordinator.address);
      expect(usdcBalanceAfter).to.be.gt(usdcBalanceBefore);
      
      // Withdraw WETH
      await (await strategyCompound.connect(coordinator).withdraw(WETH_ADDRESS, wethTestAmount)).wait();
      const wethBalanceAfter = await weth.balanceOf(coordinator.address);
      expect(wethBalanceAfter).to.be.gt(wethBalanceBefore);
    });

    it("should handle partial withdrawals correctly for both tokens", async function () {
      const { 
        strategyCompound, 
        owner, 
        coordinator, 
        usdc, 
        weth, 
        usdcTestAmount, 
        wethTestAmount 
      } = await loadFixture(deployMultiTokenStrategyCompoundFixture);
      
      // Set up and deposit
      await (await strategyCompound.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_USDC, USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_WETH, WETH_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(WETH_ADDRESS, true)).wait();
      
      await (await usdc.connect(coordinator).approve(await strategyCompound.getAddress(), usdcTestAmount)).wait();
      await (await weth.connect(coordinator).approve(await strategyCompound.getAddress(), wethTestAmount)).wait();
      
      await (await strategyCompound.connect(coordinator).deposit(USDC_ADDRESS, usdcTestAmount)).wait();
      await (await strategyCompound.connect(coordinator).deposit(WETH_ADDRESS, wethTestAmount)).wait();
      
      // Withdraw half of each token
      const halfUsdcAmount = usdcTestAmount / 2n;
      const halfWethAmount = wethTestAmount / 2n;
      
      await (await strategyCompound.connect(coordinator).withdraw(USDC_ADDRESS, halfUsdcAmount)).wait();
      await (await strategyCompound.connect(coordinator).withdraw(WETH_ADDRESS, halfWethAmount)).wait();
      
      // Check remaining balances
      const remainingUsdcBalance = await strategyCompound.balanceOf(USDC_ADDRESS);
      const remainingWethBalance = await strategyCompound.balanceOf(WETH_ADDRESS);
      
      expect(remainingUsdcBalance).to.be.gt(0);
      expect(remainingWethBalance).to.be.gt(0);
    });
  });

  describe("Error Handling", function () {
    it("should revert when trying to deposit unsupported token", async function () {
      const { strategyCompound, owner, coordinator, usdc, usdcTestAmount } = await loadFixture(deployMultiTokenStrategyCompoundFixture);
      
      // Set up strategy with only USDC support
      await (await strategyCompound.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_USDC, USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      // Note: NOT adding WETH support
      
      await (await usdc.connect(coordinator).approve(await strategyCompound.getAddress(), usdcTestAmount)).wait();
      
      // USDC deposit should work
      await expect(
        strategyCompound.connect(coordinator).deposit(USDC_ADDRESS, usdcTestAmount)
      ).to.not.be.reverted;
      
      // WETH deposit should fail
      await expect(
        strategyCompound.connect(coordinator).deposit(WETH_ADDRESS, ethers.parseUnits("1", 18))
      ).to.be.revertedWithCustomError(strategyCompound, "UnsupportedToken");
    });

    it("should revert when trying to add token without market support", async function () {
      const { strategyCompound, owner } = await loadFixture(deployMultiTokenStrategyCompoundFixture);
      
      // Try to add token support without setting up market first
      await expect(
        strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)
      ).to.be.revertedWithCustomError(strategyCompound, "NoPoolForToken");
    });

    it("should revert when trying to add wrong token to market", async function () {
      const { strategyCompound, owner } = await loadFixture(deployMultiTokenStrategyCompoundFixture);
      
      // Try to add WETH to USDC market (should fail because base tokens don't match)
      await expect(
        strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_USDC, WETH_ADDRESS, true)
      ).to.be.revertedWithCustomError(strategyCompound, "UnsupportedTokenForPool");
    });

    it("should revert when trying to add the same token support twice", async function () {
      const { strategyCompound, owner } = await loadFixture(deployMultiTokenStrategyCompoundFixture);
      
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_USDC, USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      
      // Try to add the same token support again
      await expect(
        strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)
      ).to.be.revertedWithCustomError(strategyCompound, "TokenSupportUnchanged");
    });
  });

  describe("Architecture Validation", function () {
    it("should demonstrate independent market architecture", async function () {
      const { strategyCompound, owner } = await loadFixture(deployMultiTokenStrategyCompoundFixture);
      
      // Set up both markets
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_USDC, USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_MARKET_WETH, WETH_ADDRESS, true)).wait();
      
      // Verify each token maps to its own market
      const usdcMarket = await strategyCompound.tokenToComet(USDC_ADDRESS);
      const wethMarket = await strategyCompound.tokenToComet(WETH_ADDRESS);
      
      expect(usdcMarket).to.equal(COMPOUND_MARKET_USDC);
      expect(wethMarket).to.equal(COMPOUND_MARKET_WETH);
      expect(usdcMarket).to.not.equal(wethMarket);
      
      // Verify markets are properly supported
      expect(await strategyCompound.supportedMarkets(COMPOUND_MARKET_USDC)).to.be.true;
      expect(await strategyCompound.supportedMarkets(COMPOUND_MARKET_WETH)).to.be.true;
    });
  });
});
