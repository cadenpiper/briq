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

    USDC_WHALE = chainConfig.whale;
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
      
      // Verify that we got a valid aToken address (not zero address)
      expect(aTokenAddress).to.not.equal(ethers.ZeroAddress);
      
      // Optionally, we can verify it's a valid aToken by checking it has the expected interface
      // The aToken address should be fetched from the Aave pool during updatePoolSupport
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
