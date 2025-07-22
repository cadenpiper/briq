const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Mainnet addresses
const AAVE_POOL_V3 = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"; // Aave V3 Pool on Ethereum mainnet
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC on Ethereum mainnet
const AUSDC_ADDRESS = "0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c"; // aUSDC on Ethereum mainnet

describe("StrategyAave", function () {
  // Increase timeout for forked network tests
  this.timeout(60000);

  async function deployStrategyAaveFixture() {
    // Get signers
    const [owner, coordinator, user] = await ethers.getSigners();

    // Deploy StrategyAave
    const StrategyAave = await ethers.getContractFactory("StrategyAave");
    const strategyAave = await StrategyAave.deploy();
    await strategyAave.waitForDeployment();

    // Get USDC contract instance
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

    // Get a USDC whale to fund our tests
    const USDC_WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8"; // Example USDC whale address
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    const usdcWhale = await ethers.getSigner(USDC_WHALE);

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

    it("should update token support", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      // First set up the pool for the token
      const tx1 = await strategyAave.connect(owner).updatePoolSupport(AAVE_POOL_V3, USDC_ADDRESS, true);
      await tx1.wait();
      
      // Then enable token support
      const tx2 = await strategyAave.connect(owner).updateTokenSupport(USDC_ADDRESS, true);
      await tx2.wait();
      
      expect(await strategyAave.supportedTokens(USDC_ADDRESS)).to.be.true;
    });

    it("should update pool support and set token mappings", async function () {
      const { strategyAave, owner } = await loadFixture(deployStrategyAaveFixture);
      
      const tx = await strategyAave.connect(owner).updatePoolSupport(AAVE_POOL_V3, USDC_ADDRESS, true);
      await tx.wait();
      
      expect(await strategyAave.supportedPools(AAVE_POOL_V3)).to.be.true;
      
      // Check that token mappings are set correctly
      const poolAddress = await strategyAave.tokenToPool(USDC_ADDRESS);
      expect(poolAddress.toLowerCase()).to.equal(AAVE_POOL_V3.toLowerCase());
      
      const aTokenAddress = await strategyAave.tokenToAToken(USDC_ADDRESS);
      expect(aTokenAddress.toLowerCase()).to.equal(AUSDC_ADDRESS.toLowerCase());
    });
  });

  describe("Deposit and Withdraw", function () {
    it("should deposit USDC to Aave and receive aUSDC", async function () {
      const { strategyAave, owner, coordinator, usdc, testAmount } = await loadFixture(deployStrategyAaveFixture);
      
      // Set up the strategy
      await (await strategyAave.connect(owner).setCoordinator(coordinator.address)).wait();
      await (await strategyAave.connect(owner).updatePoolSupport(AAVE_POOL_V3, USDC_ADDRESS, true)).wait();
      await (await strategyAave.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      
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
      await (await strategyAave.connect(owner).updatePoolSupport(AAVE_POOL_V3, USDC_ADDRESS, true)).wait();
      await (await strategyAave.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      
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
      await (await strategyAave.connect(owner).updatePoolSupport(AAVE_POOL_V3, USDC_ADDRESS, true)).wait();
      await (await strategyAave.connect(owner).updateTokenSupport(USDC_ADDRESS, true)).wait();
      
      // Try to deposit as non-coordinator
      await expect(
        strategyAave.connect(user).deposit(USDC_ADDRESS, testAmount)
      ).to.be.revertedWith("Only Coordinator");
    });
  });
});
