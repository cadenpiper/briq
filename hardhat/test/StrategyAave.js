const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const fs = require('fs');

describe("StrategyAave", function () {
  // Increase timeout for forked network tests
  this.timeout(60000);

  let USDC_ADDRESS, WETH_ADDRESS, AAVE_POOL_V3, USDC_WHALE, WETH_WHALE;

  async function deployStrategyAaveFixture() {
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

  describe("Deployment", function () {
    it("should set the right owner", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      expect(await strategyAave.owner()).to.equal(owner.address);
    });

    it("should have no coordinator initially", async function () {
      const { strategyAave } = await loadFixture(deployStrategyAaveFixture);
      expect(await strategyAave.coordinator()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Configuration", function () {
    it("should set coordinator correctly", async function () {
      const { strategyAave, owner, coordinator } = await loadFixture(deployStrategyAaveFixture);
      
      const tx = await strategyAave.connect(owner).setCoordinator(coordinator.address);
      await tx.wait();
      
      expect(await strategyAave.coordinator()).to.equal(coordinator.address);
    });

    it("should revert when setting zero address as coordinator", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      await expect(
        strategyAave.connect(owner).setCoordinator(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(strategyAave, "InvalidAddress");
    });

    it("should set Aave pool correctly", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      const tx = await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3);
      await tx.wait();
      
      expect(await strategyAave.aavePool()).to.equal(AAVE_POOL_V3);
    });

    it("should revert when setting zero address as Aave pool", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      await expect(
        strategyAave.connect(owner).setAavePool(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(strategyAave, "InvalidAddress");
    });

    it("should add supported token correctly", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      // First set the Aave pool
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      
      // Then add token support
      const tx = await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS);
      await tx.wait();
      
      expect(await strategyAave.isTokenSupported(USDC_ADDRESS)).to.be.true;
      
      // Check that token is in the supported tokens array
      const supportedTokens = await strategyAave.getSupportedTokens();
      expect(supportedTokens).to.include(USDC_ADDRESS);
      
      // Check that aToken mapping is set correctly
      const aTokenAddress = await strategyAave.tokenToAToken(USDC_ADDRESS);
      expect(aTokenAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should revert when adding token without setting pool first", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      await expect(
        strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)
      ).to.be.revertedWithCustomError(strategyAave, "NoPoolForToken");
    });

    it("should remove supported token correctly", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      // Set up pool and add token
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      // Remove token support
      const tx = await strategyAave.connect(owner).removeSupportedToken(USDC_ADDRESS);
      await tx.wait();
      
      expect(await strategyAave.isTokenSupported(USDC_ADDRESS)).to.be.false;
      
      // Check that token is removed from the supported tokens array
      const supportedTokens = await strategyAave.getSupportedTokens();
      expect(supportedTokens).to.not.include(USDC_ADDRESS);
      
      // Check that aToken mapping is cleared
      const aTokenAddress = await strategyAave.tokenToAToken(USDC_ADDRESS);
      expect(aTokenAddress).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Deposit and Withdraw", function () {
    it("should deposit USDC to Aave and receive aUSDC", async function () {
      const { strategyAave, owner, coordinator, usdc, usdcTestAmount } = await loadFixture(deployStrategyAaveFixture);
      
      // Set up the strategy
      await (await strategyAave.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      // Approve USDC for the strategy
      await (await usdc.connect(coordinator).approve(await strategyAave.getAddress(), usdcTestAmount)).wait();
      
      // Deposit USDC - this is the operation we want to measure gas for
      const tx = await strategyAave.connect(coordinator).deposit(USDC_ADDRESS, usdcTestAmount);
      await tx.wait();
      
      // Check balance
      const aaveBalance = await strategyAave.balanceOf(USDC_ADDRESS);
      expect(aaveBalance).to.be.gt(0); // Should have received aUSDC tokens
    });

    it("should withdraw USDC from Aave", async function () {
      const { strategyAave, owner, coordinator, usdc, usdcTestAmount } = await loadFixture(deployStrategyAaveFixture);
      
      // Set up the strategy
      await (await strategyAave.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      // Approve and deposit USDC
      await (await usdc.connect(coordinator).approve(await strategyAave.getAddress(), usdcTestAmount)).wait();
      await (await strategyAave.connect(coordinator).deposit(USDC_ADDRESS, usdcTestAmount)).wait();
      
      // Get coordinator's USDC balance before withdrawal
      const balanceBefore = await usdc.balanceOf(coordinator.address);
      
      // Withdraw USDC - this is the operation we want to measure gas for
      const tx = await strategyAave.connect(coordinator).withdraw(USDC_ADDRESS, usdcTestAmount);
      await tx.wait();
      
      // Check that coordinator received USDC
      const balanceAfter = await usdc.balanceOf(coordinator.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should revert when non-coordinator tries to deposit", async function () {
      const { strategyAave, owner, user, usdc, usdcTestAmount } = await loadFixture(deployStrategyAaveFixture);
      
      // Set up the strategy
      await (await strategyAave.connect(owner).setCoordinator(owner.address)).wait(); // Set owner as coordinator
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      // Try to deposit as non-coordinator
      await expect(
        strategyAave.connect(user).deposit(USDC_ADDRESS, usdcTestAmount)
      ).to.be.revertedWith("Only Coordinator");
    });
  });

  describe("Multi-Token Configuration", function () {
    it("should set up Aave pool and support both USDC and WETH", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
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
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
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
      } = await loadFixture(deployStrategyAaveFixture);
      
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
      } = await loadFixture(deployStrategyAaveFixture);
      
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
      } = await loadFixture(deployStrategyAaveFixture);
      
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

  describe("Multi-Token Error Handling", function () {
    it("should revert when trying to deposit unsupported token", async function () {
      const { strategyAave, owner, coordinator, usdc, usdcTestAmount } = await loadFixture(deployStrategyAaveFixture);
      
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
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      // Try to add token without setting pool first
      await expect(
        strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)
      ).to.be.revertedWithCustomError(strategyAave, "NoPoolForToken");
    });

    it("should revert when trying to add the same token twice", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      // Try to add the same token again
      await expect(
        strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)
      ).to.be.revertedWithCustomError(strategyAave, "TokenSupportUnchanged");
    });
  });

  describe("APY Functionality", function () {
    it("should return current APY for supported token", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      // Set up Aave pool and add USDC support
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      // Get current APY from the live Aave pool
      const apy = await strategyAave.getCurrentAPY(USDC_ADDRESS);
      
      // APY should be a reasonable value (between 0 and 50% = 5000 basis points)
      expect(apy).to.be.gte(0);
      expect(apy).to.be.lte(5000);
    });

    it("should return zero APY for unsupported token", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      // Set up Aave pool and add USDC support
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      const apy = await strategyAave.getCurrentAPY(WETH_ADDRESS);
      expect(apy).to.equal(0);
    });

    it("should return zero APY when no Aave pool is set", async function () {
      const { strategyAave } = await loadFixture(deployStrategyAaveFixture);
      
      const apy = await strategyAave.getCurrentAPY(USDC_ADDRESS);
      expect(apy).to.equal(0);
    });

    it("should return consistent APY values", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      // Set up Aave pool and add USDC support
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      // Call APY function multiple times and ensure consistency
      const apy1 = await strategyAave.getCurrentAPY(USDC_ADDRESS);
      const apy2 = await strategyAave.getCurrentAPY(USDC_ADDRESS);
      
      expect(apy1).to.equal(apy2);
    });
  });
});
