const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const fs = require('fs');

describe("StrategyAave", function () {
  // Increase timeout for forked network tests
  this.timeout(60000);

  let USDC_ADDRESS, AAVE_POOL_V3, USDC_WHALE;

  async function deployStrategyAaveFixture() {
    // Get signers
    const [owner, coordinator, user] = await ethers.getSigners();

    const chainId = (await ethers.provider.getNetwork()).chainId;

    const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const chainConfig = configData.CHAIN_CONFIG[chainId.toString()];
    if (!chainConfig) throw new Error(`No config for chain ID ${chainId}`);

    USDC_WHALE = chainConfig.usdcWhale;
    AAVE_POOL_V3 = chainConfig.aavePoolV3;
    USDC_ADDRESS = chainConfig.usdcAddress;

    // Deploy StrategyAave
    const StrategyAave = await ethers.getContractFactory("StrategyAave");
    const strategyAave = await StrategyAave.deploy();
    await strategyAave.waitForDeployment();

    // Get USDC contract instance
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

    // Get a USDC whale to fund our tests
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    const usdcWhale = await ethers.getSigner(USDC_WHALE);

    // Fund the whale with ETH for gas fees
    await ethers.provider.send("hardhat_setBalance", [
      USDC_WHALE,
      "0x56BC75E2D630E0000", // 100 ETH in hex
    ]);

    // Transfer some USDC to the coordinator for testing
    const testAmount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
    await usdc.connect(usdcWhale).transfer(coordinator.address, testAmount);

    return { strategyAave, owner, coordinator, user, usdc, testAmount };
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
      const { strategyAave, owner, coordinator, usdc, testAmount } = await loadFixture(deployStrategyAaveFixture);
      
      // Set up the strategy
      await (await strategyAave.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      // Approve USDC for the strategy
      await (await usdc.connect(coordinator).approve(await strategyAave.getAddress(), testAmount)).wait();
      
      // Deposit USDC - this is the operation we want to measure gas for
      const tx = await strategyAave.connect(coordinator).deposit(USDC_ADDRESS, testAmount);
      await tx.wait();
      
      // Check balance
      const aaveBalance = await strategyAave.balanceOf(USDC_ADDRESS);
      expect(aaveBalance).to.be.gt(0); // Should have received aUSDC tokens
    });

    it("should withdraw USDC from Aave", async function () {
      const { strategyAave, owner, coordinator, usdc, testAmount } = await loadFixture(deployStrategyAaveFixture);
      
      // Set up the strategy
      await (await strategyAave.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      // Approve and deposit USDC
      await (await usdc.connect(coordinator).approve(await strategyAave.getAddress(), testAmount)).wait();
      await (await strategyAave.connect(coordinator).deposit(USDC_ADDRESS, testAmount)).wait();
      
      // Get coordinator's USDC balance before withdrawal
      const balanceBefore = await usdc.balanceOf(coordinator.address);
      
      // Withdraw USDC - this is the operation we want to measure gas for
      const tx = await strategyAave.connect(coordinator).withdraw(USDC_ADDRESS, testAmount);
      await tx.wait();
      
      // Check that coordinator received USDC
      const balanceAfter = await usdc.balanceOf(coordinator.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should revert when non-coordinator tries to deposit", async function () {
      const { strategyAave, owner, user, usdc, testAmount } = await loadFixture(deployStrategyAaveFixture);
      
      // Set up the strategy
      await (await strategyAave.connect(owner).setCoordinator(owner.address)).wait(); // Set owner as coordinator
      await (await strategyAave.connect(owner).setAavePool(AAVE_POOL_V3)).wait();
      await (await strategyAave.connect(owner).addSupportedToken(USDC_ADDRESS)).wait();
      
      // Try to deposit as non-coordinator
      await expect(
        strategyAave.connect(user).deposit(USDC_ADDRESS, testAmount)
      ).to.be.revertedWith("Only Coordinator");
    });
  });
});
