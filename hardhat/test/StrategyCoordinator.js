const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const fs = require('fs');

describe("StrategyCoordinator", function () {
  // Increase timeout for forked network tests
  this.timeout(60000);

  let USDC_ADDRESS, AAVE_POOL_V3, COMPOUND_COMET_USDC, USDC_WHALE;

  async function deployStrategyCoordinatorFixture() {
    // Get signers
    const [owner, vault, user] = await ethers.getSigners();

    const chainId = (await ethers.provider.getNetwork()).chainId;

    const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const chainConfig = configData.CHAIN_CONFIG[chainId.toString()];
    if (!chainConfig) throw new Error(`No config for chain ID ${chainId}`);

    USDC_WHALE = chainConfig.usdcWhale;
    AAVE_POOL_V3 = chainConfig.aavePoolV3;
    COMPOUND_COMET_USDC = chainConfig.compoundMarketUSDC;
    USDC_ADDRESS = chainConfig.usdcAddress;

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

    // Set up strategies
    await (await strategyAave.setCoordinator(await strategyCoordinator.getAddress())).wait();
    await (await strategyCompound.setCoordinator(await strategyCoordinator.getAddress())).wait();

    // Configure Aave strategy
    await (await strategyAave.setAavePool(AAVE_POOL_V3)).wait();
    await (await strategyAave.addSupportedToken(USDC_ADDRESS)).wait();

    // Configure Compound strategy
    await (await strategyCompound.updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true)).wait();
    await (await strategyCompound.updateTokenSupport(USDC_ADDRESS, true)).wait();

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

    // Transfer some USDC to the vault for testing
    const testAmount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
    await usdc.connect(usdcWhale).transfer(vault.address, testAmount);

    return { 
      strategyCoordinator, 
      strategyAave, 
      strategyCompound, 
      owner, 
      vault, 
      user, 
      usdc, 
      testAmount 
    };
  }

  describe("Deployment", function () {
    it("should set the right owner", async function () {
      const { strategyCoordinator, owner } = await loadFixture(deployStrategyCoordinatorFixture);
      expect(await strategyCoordinator.owner()).to.equal(owner.address);
    });

    it("should set the correct strategy addresses", async function () {
      const { strategyCoordinator, strategyAave, strategyCompound } = await loadFixture(deployStrategyCoordinatorFixture);
      expect(await strategyCoordinator.strategyAave()).to.equal(await strategyAave.getAddress());
      expect(await strategyCoordinator.strategyCompound()).to.equal(await strategyCompound.getAddress());
    });
  });

  describe("Configuration", function () {
    it("should set vault address correctly", async function () {
      const { strategyCoordinator, owner, vault } = await loadFixture(deployStrategyCoordinatorFixture);
      
      const tx = await strategyCoordinator.connect(owner).updateVaultAddress(vault.address);
      await tx.wait();
      
      expect(await strategyCoordinator.vault()).to.equal(vault.address);
    });

    it("should revert when setting zero address as vault", async function () {
      const { strategyCoordinator, owner } = await loadFixture(deployStrategyCoordinatorFixture);
      
      await expect(
        strategyCoordinator.connect(owner).updateVaultAddress(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(strategyCoordinator, "InvalidAddress");
    });

    it("should set strategy for token correctly", async function () {
      const { strategyCoordinator, owner } = await loadFixture(deployStrategyCoordinatorFixture);
      
      const tx = await strategyCoordinator.connect(owner).setStrategyForToken(USDC_ADDRESS, 0); // 0 = AAVE
      await tx.wait();
      
      expect(await strategyCoordinator.supportedTokens(USDC_ADDRESS)).to.be.true;
      expect(await strategyCoordinator.tokenToStrategy(USDC_ADDRESS)).to.equal(0); // 0 = AAVE
    });

    it("should revert when setting strategy for unsupported token", async function () {
      const { strategyCoordinator, owner } = await loadFixture(deployStrategyCoordinatorFixture);
      
      const UNSUPPORTED_TOKEN = "0x1111111111111111111111111111111111111111";
      
      await expect(
        strategyCoordinator.connect(owner).setStrategyForToken(UNSUPPORTED_TOKEN, 0)
      ).to.be.revertedWithCustomError(strategyCoordinator, "UnsupportedToken");
    });
  });

  describe("Deposit and Withdraw", function () {
    it("should deposit USDC to Aave strategy", async function () {
      const { strategyCoordinator, strategyAave, owner, vault, usdc, testAmount } = await loadFixture(deployStrategyCoordinatorFixture);
      
      // Set up the coordinator
      await (await strategyCoordinator.connect(owner).updateVaultAddress(vault.address)).wait();
      await (await strategyCoordinator.connect(owner).setStrategyForToken(USDC_ADDRESS, 0)).wait(); // 0 = AAVE
      
      // Approve USDC for the coordinator
      await (await usdc.connect(vault).approve(await strategyCoordinator.getAddress(), testAmount)).wait();
      
      // Deposit USDC - this is the operation we want to measure gas for
      const tx = await strategyCoordinator.connect(vault).deposit(USDC_ADDRESS, testAmount);
      await tx.wait();
      
      // Check balance
      const strategyBalance = await strategyCoordinator.getStrategyBalance(USDC_ADDRESS);
      expect(strategyBalance).to.be.gt(0);
      
      // Check that it went to Aave
      const aaveBalance = await strategyAave.balanceOf(USDC_ADDRESS);
      expect(aaveBalance).to.be.gt(0);
    });

    it("should deposit USDC to Compound strategy", async function () {
      const { strategyCoordinator, strategyCompound, owner, vault, usdc, testAmount } = await loadFixture(deployStrategyCoordinatorFixture);
      
      // Set up the coordinator
      await (await strategyCoordinator.connect(owner).updateVaultAddress(vault.address)).wait();
      await (await strategyCoordinator.connect(owner).setStrategyForToken(USDC_ADDRESS, 1)).wait(); // 1 = COMPOUND
      
      // Approve USDC for the coordinator
      await (await usdc.connect(vault).approve(await strategyCoordinator.getAddress(), testAmount)).wait();
      
      // Deposit USDC - this is the operation we want to measure gas for
      const tx = await strategyCoordinator.connect(vault).deposit(USDC_ADDRESS, testAmount);
      await tx.wait();
      
      // Check balance
      const strategyBalance = await strategyCoordinator.getStrategyBalance(USDC_ADDRESS);
      expect(strategyBalance).to.be.gt(0);
      
      // Check that it went to Compound
      const compoundBalance = await strategyCompound.balanceOf(USDC_ADDRESS);
      expect(compoundBalance).to.be.gt(0);
    });

    it("should withdraw USDC from Aave strategy", async function () {
      const { strategyCoordinator, owner, vault, usdc, testAmount } = await loadFixture(deployStrategyCoordinatorFixture);
      
      // Set up the coordinator
      await (await strategyCoordinator.connect(owner).updateVaultAddress(vault.address)).wait();
      
      // First deposit to Compound via coordinator
      await (await strategyCoordinator.connect(owner).setStrategyForToken(USDC_ADDRESS, 1)).wait(); // 1 = COMPOUND
      const compoundAmount = testAmount / 4n;
      await (await usdc.connect(vault).approve(await strategyCoordinator.getAddress(), compoundAmount)).wait();
      await (await strategyCoordinator.connect(vault).deposit(USDC_ADDRESS, compoundAmount)).wait();
      
      // Then deposit to Aave via coordinator
      await (await strategyCoordinator.connect(owner).setStrategyForToken(USDC_ADDRESS, 0)).wait(); // 0 = AAVE
      const aaveAmount = testAmount / 2n;
      await (await usdc.connect(vault).approve(await strategyCoordinator.getAddress(), aaveAmount)).wait();
      await (await strategyCoordinator.connect(vault).deposit(USDC_ADDRESS, aaveAmount)).wait();
      
      // Get vault's USDC balance before withdrawal
      const balanceBefore = await usdc.balanceOf(vault.address);
      
      // Withdraw USDC - this is the operation we want to measure gas for
      const withdrawAmount = ethers.parseUnits("100", 6); // Withdraw a smaller amount
      const tx = await strategyCoordinator.connect(vault).withdraw(USDC_ADDRESS, withdrawAmount);
      await tx.wait();
      
      // Check that vault received USDC
      const balanceAfter = await usdc.balanceOf(vault.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should revert when non-vault tries to deposit", async function () {
      const { strategyCoordinator, owner, user, usdc, testAmount } = await loadFixture(deployStrategyCoordinatorFixture);
      
      // Set up the coordinator
      await (await strategyCoordinator.connect(owner).updateVaultAddress(owner.address)).wait(); // Set owner as vault
      await (await strategyCoordinator.connect(owner).setStrategyForToken(USDC_ADDRESS, 0)).wait(); // 0 = AAVE
      
      // Try to deposit as non-vault
      await expect(
        strategyCoordinator.connect(user).deposit(USDC_ADDRESS, testAmount)
      ).to.be.revertedWithCustomError(strategyCoordinator, "OnlyVault");
    });
  });

  describe("Emergency Functions", function () {
    it("should allow owner to emergency withdraw", async function () {
      const { strategyCoordinator, owner, vault, usdc, testAmount } = await loadFixture(deployStrategyCoordinatorFixture);
      
      // Set up the coordinator
      await (await strategyCoordinator.connect(owner).updateVaultAddress(vault.address)).wait();
      await (await strategyCoordinator.connect(owner).setStrategyForToken(USDC_ADDRESS, 0)).wait(); // 0 = AAVE
      
      // Approve and deposit USDC
      await (await usdc.connect(vault).approve(await strategyCoordinator.getAddress(), testAmount)).wait();
      await (await strategyCoordinator.connect(vault).deposit(USDC_ADDRESS, testAmount)).wait();
      
      // Set vault address to receive emergency withdrawal
      await (await strategyCoordinator.connect(owner).updateVaultAddress(vault.address)).wait();
      
      // Get vault's USDC balance before emergency withdrawal
      const balanceBefore = await usdc.balanceOf(vault.address);
      
      // Emergency withdraw
      const tx = await strategyCoordinator.connect(owner).emergencyWithdraw(USDC_ADDRESS);
      await tx.wait();
      
      // Check that vault received USDC
      const balanceAfter = await usdc.balanceOf(vault.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("APY Functionality", function () {
    it("should return APY for USDC from Aave strategy", async function () {
      const { strategyCoordinator, owner } = await loadFixture(deployStrategyCoordinatorFixture);
      
      // Set up strategies for USDC
      await (await strategyCoordinator.connect(owner).setStrategyForToken(USDC_ADDRESS, 0)).wait(); // AAVE
      
      const apy = await strategyCoordinator.getStrategyAPY(USDC_ADDRESS);
      
      // APY should be a reasonable value (between 0 and 50% = 5000 basis points)
      expect(apy).to.be.gte(0);
      expect(apy).to.be.lte(5000);
    });

    it("should return zero APY for unsupported token", async function () {
      const { strategyCoordinator } = await loadFixture(deployStrategyCoordinatorFixture);
      
      // Use a random address as unsupported token
      const randomToken = "0x1234567890123456789012345678901234567890";
      const apy = await strategyCoordinator.getStrategyAPY(randomToken);
      expect(apy).to.equal(0);
    });

    it("should delegate APY calls to correct strategies", async function () {
      const { strategyCoordinator, owner } = await loadFixture(deployStrategyCoordinatorFixture);
      
      // Set up strategy for USDC
      await (await strategyCoordinator.connect(owner).setStrategyForToken(USDC_ADDRESS, 0)).wait(); // AAVE
      
      // Get APY for USDC
      const usdcAPY = await strategyCoordinator.getStrategyAPY(USDC_ADDRESS);
      
      // Should return valid APY value
      expect(usdcAPY).to.be.gte(0);
      expect(usdcAPY).to.be.lte(5000);
    });
  });
});
