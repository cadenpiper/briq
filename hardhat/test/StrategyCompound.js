const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Mainnet addresses
const COMPOUND_COMET_USDC = "0xc3d688B66703497DAA19211EEdff47f25384cdc3"; // Compound v3 USDC market (Comet)
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC on Ethereum mainnet

describe("StrategyCompoundComet", function () {
  // Increase timeout for forked network tests
  this.timeout(60000);

  async function deployStrategyCompoundFixture() {
    // Get signers
    const [owner, coordinator, user] = await ethers.getSigners();

    // Deploy StrategyCompoundComet
    const StrategyCompoundComet = await ethers.getContractFactory("StrategyCompoundComet");
    const strategyCompound = await StrategyCompoundComet.deploy();
    await strategyCompound.waitForDeployment();

    // Get USDC contract instance
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

    // Get a USDC whale to fund our tests
    const USDC_WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8"; // Example USDC whale address
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    const usdcWhale = await ethers.getSigner(USDC_WHALE);

    // Transfer some USDC to the coordinator for testing
    const testAmount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
    await usdc.connect(usdcWhale).transfer(coordinator.address, testAmount);

    return { strategyCompound, owner, coordinator, user, usdc, testAmount };
  }

  describe("Deployment", function () {
    it("should set the right owner", async function () {
      const { strategyCompound, owner } = await loadFixture(deployStrategyCompoundFixture);
      expect(await strategyCompound.owner()).to.equal(owner.address);
    });

    it("should have no coordinator initially", async function () {
      const { strategyCompound } = await loadFixture(deployStrategyCompoundFixture);
      expect(await strategyCompound.coordinator()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Configuration", function () {
    it("should set coordinator correctly", async function () {
      const { strategyCompound, owner, coordinator } = await loadFixture(deployStrategyCompoundFixture);
      
      const tx = await strategyCompound.connect(owner).setCoordinator(coordinator.address);
      await tx.wait();
      
      expect(await strategyCompound.coordinator()).to.equal(coordinator.address);
    });

    it("should revert when setting zero address as coordinator", async function () {
      const { strategyCompound, owner } = await loadFixture(deployStrategyCompoundFixture);
      
      await expect(
        strategyCompound.connect(owner).setCoordinator(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(strategyCompound, "InvalidAddress");
    });

    it("should update token support", async function () {
      const { strategyCompound, owner } = await loadFixture(deployStrategyCompoundFixture);
      
      // First set up the market for the token
      const tx1 = await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true);
      await tx1.wait();
      
      // Then enable token support
      const tx2 = await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true);
      await tx2.wait();
      
      expect(await strategyCompound.supportedTokens(USDC_ADDRESS)).to.be.true;
    });

    it("should update market support and set token mappings", async function () {
      const { strategyCompound, owner } = await loadFixture(deployStrategyCompoundFixture);
      
      const tx = await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true);
      await tx.wait();
      
      expect(await strategyCompound.supportedMarkets(COMPOUND_COMET_USDC)).to.be.true;
      
      // Check that token mappings are set correctly
      const cometAddress = await strategyCompound.tokenToComet(USDC_ADDRESS);
      expect(cometAddress.toLowerCase()).to.equal(COMPOUND_COMET_USDC.toLowerCase());
    });
  });

  describe("Deposit and Withdraw", function () {
    it("should deposit USDC to Compound and receive cUSDC", async function () {
      const { strategyCompound, owner, coordinator, usdc, testAmount } = await loadFixture(deployStrategyCompoundFixture);
      
      // Set up the strategy
      await (await strategyCompound.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      
      // Approve USDC for the strategy
      await (await usdc.connect(coordinator).approve(await strategyCompound.getAddress(), testAmount)).wait();
      
      // Deposit USDC - this is the operation we want to measure gas for
      const tx = await strategyCompound.connect(coordinator).deposit(USDC_ADDRESS, testAmount);
      await tx.wait();
      
      // Check balance
      const compoundBalance = await strategyCompound.balanceOf(USDC_ADDRESS);
      expect(compoundBalance).to.be.gt(0); // Should have received cUSDC tokens
    });

    it("should withdraw USDC from Compound", async function () {
      const { strategyCompound, owner, coordinator, usdc, testAmount } = await loadFixture(deployStrategyCompoundFixture);
      
      // Set up the strategy
      await (await strategyCompound.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      
      // Approve and deposit USDC
      await (await usdc.connect(coordinator).approve(await strategyCompound.getAddress(), testAmount)).wait();
      await (await strategyCompound.connect(coordinator).deposit(USDC_ADDRESS, testAmount)).wait();
      
      // Get coordinator's USDC balance before withdrawal
      const balanceBefore = await usdc.balanceOf(coordinator.address);
      
      // Withdraw USDC - this is the operation we want to measure gas for
      const tx = await strategyCompound.connect(coordinator).withdraw(USDC_ADDRESS, testAmount);
      await tx.wait();
      
      // Check that coordinator received USDC
      const balanceAfter = await usdc.balanceOf(coordinator.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should revert when non-coordinator tries to deposit", async function () {
      const { strategyCompound, owner, user, usdc, testAmount } = await loadFixture(deployStrategyCompoundFixture);
      
      // Set up the strategy
      await (await strategyCompound.connect(owner).setCoordinator(owner.address)).wait(); // Set owner as coordinator
      await (await strategyCompound.connect(owner).updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true)).wait();
      await (await strategyCompound.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      
      // Try to deposit as non-coordinator
      await expect(
        strategyCompound.connect(user).deposit(USDC_ADDRESS, testAmount)
      ).to.be.revertedWith("Only Coordinator");
    });
  });
});
