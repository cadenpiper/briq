const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const fs = require('fs');

describe("StrategyAave - Multi-Token Integration", function () {
  // Increase timeout for forked network tests
  this.timeout(60000);

  let USDC_ADDRESS, WETH_ADDRESS, AAVE_POOL_V3, USDC_WHALE, WETH_WHALE;

  async function deployMultiTokenStrategyAaveFixture() {
    // Get signers
    const [owner, coordinator, user] = await ethers.getSigners();

    const chainId = (await ethers.provider.getNetwork()).chainId;

    const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const chainConfig = configData.CHAIN_CONFIG[chainId.toString()];
    if (!chainConfig) throw new Error(`No config for chain ID ${chainId}`);

    USDC_WHALE = chainConfig.usdcWhale;
    WETH_WHALE = chainConfig.wethWhale;
    AAVE_POOL_V3 = chainConfig.aavePoolV3;
    USDC_ADDRESS = chainConfig.usdcAddress;
    WETH_ADDRESS = chainConfig.wethAddress;

    // Deploy StrategyAave
    const StrategyAave = await ethers.getContractFactory("StrategyAave");
    const strategyAave = await StrategyAave.deploy();
    await strategyAave.waitForDeployment();

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
      strategyAave, 
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
    it("should set up Aave pool and support both USDC and WETH", async function () {
      const { strategyAave, owner } = await loadFixture(deployMultiTokenStrategyAaveFixture);
      
      // Set the Aave pool (same pool for all tokens)
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      expect(await strategyAave.aavePool()).to.equal(AAVE_POOL_V3);
      
      // Add USDC support
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      expect(await strategyAave.isTokenSupported(USDC_ADDRESS)).to.be.true;
      
      // Add WETH support to the same pool
      await (await strategyAave.connect(owner).addSupportedToken(WETH_ADDRESS)).wait();
      expect(await strategyAave.isTokenSupported(WETH_ADDRESS)).to.be.true;
      
      // Verify both tokens are in the supported tokens array
      const supportedTokens = await strategyAave.getSupportedTokens();
      expect(supportedTokens).to.include(USDC_ADDRESS);
      expect(supportedTokens).to.include(WETH_ADDRESS);
      expect(supportedTokens.length).to.equal(2);
      
      // Verify aToken mappings are set for both tokens
      const usdcAToken = await strategyAave.tokenToAToken(USDC_ADDRESS);
      const wethAToken = await strategyAave.tokenToAToken(WETH_ADDRESS);
      
      expect(usdcAToken).to.not.equal(ethers.ZeroAddress);
      expect(wethAToken).to.not.equal(ethers.ZeroAddress);
      expect(usdcAToken).to.not.equal(wethAToken); // Should be different aTokens
    });

    it("should handle token removal correctly", async function () {
      const { strategyAave, owner } = await loadFixture(deployMultiTokenStrategyAaveFixture);
      
      // Set up both tokens
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(WETH_ADDRESS)).wait();
      
      // Remove USDC support
      await (await strategyAave.connect(owner).removeSupportedToken(USDC_ADDRESS)).wait();
      
      // Verify USDC is removed but WETH remains
      expect(await strategyAave.isTokenSupported(USDC_ADDRESS)).to.be.false;
      expect(await strategyAave.isTokenSupported(WETH_ADDRESS)).to.be.true;
      
      const supportedTokens = await strategyAave.getSupportedTokens();
      expect(supportedTokens).to.not.include(USDC_ADDRESS);
      expect(supportedTokens).to.include(WETH_ADDRESS);
      expect(supportedTokens.length).to.equal(1);
      
      // Verify aToken mapping is cleared for USDC but not WETH
      expect(await strategyAave.tokenToAToken(USDC_ADDRESS)).to.equal(ethers.ZeroAddress);
      expect(await strategyAave.tokenToAToken(WETH_ADDRESS)).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Multi-Token Deposits and Withdrawals", function () {
    it("should deposit both USDC and WETH to the same Aave pool", async function () {
      const { 
        strategyAave, 
        owner, 
        coordinator, 
        usdc, 
        weth, 
        usdcTestAmount, 
        wethTestAmount 
      } = await loadFixture(deployMultiTokenStrategyAaveFixture);
      
      // Set up the strategy for both tokens
      await (await strategyAave.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(WETH_ADDRESS)).wait();
      
      // Approve tokens for the strategy
      await (await usdc.connect(coordinator).approve(await strategyAave.getAddress(), usdcTestAmount)).wait();
      await (await weth.connect(coordinator).approve(await strategyAave.getAddress(), wethTestAmount)).wait();
      
      // Deposit USDC
      await (await strategyAave.connect(coordinator).deposit(USDC_ADDRESS, usdcTestAmount)).wait();
      const usdcBalance = await strategyAave.balanceOf(USDC_ADDRESS);
      expect(usdcBalance).to.be.gt(0);
      
      // Deposit WETH
      await (await strategyAave.connect(coordinator).deposit(WETH_ADDRESS, wethTestAmount)).wait();
      const wethBalance = await strategyAave.balanceOf(WETH_ADDRESS);
      expect(wethBalance).to.be.gt(0);
    });

    it("should withdraw both USDC and WETH from Aave", async function () {
      const { 
        strategyAave, 
        owner, 
        coordinator, 
        usdc, 
        weth, 
        usdcTestAmount, 
        wethTestAmount 
      } = await loadFixture(deployMultiTokenStrategyAaveFixture);
      
      // Set up the strategy and deposit both tokens
      await (await strategyAave.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(WETH_ADDRESS)).wait();
      
      await (await usdc.connect(coordinator).approve(await strategyAave.getAddress(), usdcTestAmount)).wait();
      await (await weth.connect(coordinator).approve(await strategyAave.getAddress(), wethTestAmount)).wait();
      
      await (await strategyAave.connect(coordinator).deposit(USDC_ADDRESS, usdcTestAmount)).wait();
      await (await strategyAave.connect(coordinator).deposit(WETH_ADDRESS, wethTestAmount)).wait();
      
      // Get balances before withdrawal
      const usdcBalanceBefore = await usdc.balanceOf(coordinator.address);
      const wethBalanceBefore = await weth.balanceOf(coordinator.address);
      
      // Withdraw USDC
      await (await strategyAave.connect(coordinator).withdraw(USDC_ADDRESS, usdcTestAmount)).wait();
      const usdcBalanceAfter = await usdc.balanceOf(coordinator.address);
      expect(usdcBalanceAfter).to.be.gt(usdcBalanceBefore);
      
      // Withdraw WETH
      await (await strategyAave.connect(coordinator).withdraw(WETH_ADDRESS, wethTestAmount)).wait();
      const wethBalanceAfter = await weth.balanceOf(coordinator.address);
      expect(wethBalanceAfter).to.be.gt(wethBalanceBefore);
    });

    it("should handle partial withdrawals correctly for both tokens", async function () {
      const { 
        strategyAave, 
        owner, 
        coordinator, 
        usdc, 
        weth, 
        usdcTestAmount, 
        wethTestAmount 
      } = await loadFixture(deployMultiTokenStrategyAaveFixture);
      
      // Set up and deposit
      await (await strategyAave.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(WETH_ADDRESS)).wait();
      
      await (await usdc.connect(coordinator).approve(await strategyAave.getAddress(), usdcTestAmount)).wait();
      await (await weth.connect(coordinator).approve(await strategyAave.getAddress(), wethTestAmount)).wait();
      
      await (await strategyAave.connect(coordinator).deposit(USDC_ADDRESS, usdcTestAmount)).wait();
      await (await strategyAave.connect(coordinator).deposit(WETH_ADDRESS, wethTestAmount)).wait();
      
      // Withdraw half of each token
      const halfUsdcAmount = usdcTestAmount / 2n;
      const halfWethAmount = wethTestAmount / 2n;
      
      await (await strategyAave.connect(coordinator).withdraw(USDC_ADDRESS, halfUsdcAmount)).wait();
      await (await strategyAave.connect(coordinator).withdraw(WETH_ADDRESS, halfWethAmount)).wait();
      
      // Check remaining balances
      const remainingUsdcBalance = await strategyAave.balanceOf(USDC_ADDRESS);
      const remainingWethBalance = await strategyAave.balanceOf(WETH_ADDRESS);
      
      expect(remainingUsdcBalance).to.be.gt(0);
      expect(remainingWethBalance).to.be.gt(0);
    });
  });

  describe("Error Handling", function () {
    it("should revert when trying to deposit unsupported token", async function () {
      const { strategyAave, owner, coordinator, usdc, usdcTestAmount } = await loadFixture(deployMultiTokenStrategyAaveFixture);
      
      // Set up strategy with only USDC support
      await (await strategyAave.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      // Note: NOT adding WETH support
      
      await (await usdc.connect(coordinator).approve(await strategyAave.getAddress(), usdcTestAmount)).wait();
      
      // USDC deposit should work
      await expect(
        strategyAave.connect(coordinator).deposit(USDC_ADDRESS, usdcTestAmount)
      ).to.not.be.reverted;
      
      // WETH deposit should fail
      await expect(
        strategyAave.connect(coordinator).deposit(WETH_ADDRESS, ethers.parseUnits("1", 18))
      ).to.be.revertedWithCustomError(strategyAave, "UnsupportedToken");
    });

    it("should revert when trying to add token to non-existent pool", async function () {
      const { strategyAave, owner } = await loadFixture(deployMultiTokenStrategyAaveFixture);
      
      // Try to add token without setting pool first
      await expect(
        strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)
      ).to.be.revertedWithCustomError(strategyAave, "NoPoolForToken");
    });

    it("should revert when trying to add the same token twice", async function () {
      const { strategyAave, owner } = await loadFixture(deployMultiTokenStrategyAaveFixture);
      
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      // Try to add the same token again
      await expect(
        strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)
      ).to.be.revertedWithCustomError(strategyAave, "TokenSupportUnchanged");
    });
  });
});
