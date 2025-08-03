const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const fs = require('fs');

describe("BriqVault", function () {
  this.timeout(60000);

  let USDC_ADDRESS, AAVE_POOL_V3, COMPOUND_COMET_USDC, USDC_WHALE;

  async function deployBriqVaultFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const chainId = (await ethers.provider.getNetwork()).chainId;

    const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const chainConfig = configData.CHAIN_CONFIG[chainId.toString()];
    if (!chainConfig) throw new Error(`No config for chain ID ${chainId}`);

    USDC_WHALE = chainConfig.usdcWhale;
    AAVE_POOL_V3 = chainConfig.aavePoolV3;
    COMPOUND_COMET_USDC = chainConfig.compoundMarketUSDC;
    USDC_ADDRESS = chainConfig.usdcAddress;

    const BriqShares = await ethers.getContractFactory("BriqShares");
    const briqShares = await BriqShares.deploy("Briq", "BRIQ");
    await briqShares.waitForDeployment();

    const StrategyAave = await ethers.getContractFactory("StrategyAave");
    const strategyAave = await StrategyAave.deploy();
    await strategyAave.waitForDeployment();

    const StrategyCompoundComet = await ethers.getContractFactory("StrategyCompoundComet");
    const strategyCompound = await StrategyCompoundComet.deploy();
    await strategyCompound.waitForDeployment();

    const StrategyCoordinator = await ethers.getContractFactory("StrategyCoordinator");
    const strategyCoordinator = await StrategyCoordinator.deploy(
      await strategyAave.getAddress(),
      await strategyCompound.getAddress()
    );
    await strategyCoordinator.waitForDeployment();

    const BriqVault = await ethers.getContractFactory("BriqVault");
    const briqVault = await BriqVault.deploy(
      await strategyCoordinator.getAddress(),
      await briqShares.getAddress()
    );
    await briqVault.waitForDeployment();

    await (await briqShares.setVault(await briqVault.getAddress())).wait();
    await (await strategyAave.setCoordinator(await strategyCoordinator.getAddress())).wait();
    await (await strategyCompound.setCoordinator(await strategyCoordinator.getAddress())).wait();
    await (await strategyCoordinator.updateVaultAddress(await briqVault.getAddress())).wait();

    await (await strategyAave.updatePoolSupport(AAVE_POOL_V3, USDC_ADDRESS, true)).wait();
    await (await strategyAave.updateTokenSupport(USDC_ADDRESS, true)).wait();

    await (await strategyCompound.updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true)).wait();
    await (await strategyCompound.updateTokenSupport(USDC_ADDRESS, true)).wait();

    await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 0)).wait();

    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    const usdcWhale = await ethers.getSigner(USDC_WHALE);

    // Fund the whale account with ETH for gas fees
    await ethers.provider.send("hardhat_setBalance", [
      USDC_WHALE,
      "0x1000000000000000000" // 1 ETH in hex
    ]);

    const testAmount = ethers.parseUnits("1000", 6);
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

  async function prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user, amount) {
    await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 1)).wait();
    const compoundAmount = amount / 4n;
    await (await usdc.connect(user).approve(await briqVault.getAddress(), compoundAmount)).wait();
    await (await briqVault.connect(user).deposit(USDC_ADDRESS, compoundAmount)).wait();
    
    await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 0)).wait();
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
      
      const depositAmount = ethers.parseUnits("100", 6);
      
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount)).wait();
      
      const initialShares = await briqShares.balanceOf(user1.address);
      expect(initialShares).to.equal(0);
      
      const tx = await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount);
      await tx.wait();
      
      const finalShares = await briqShares.balanceOf(user1.address);
      expect(finalShares).to.be.gt(0);
    });

    it("should emit UserDeposited event with correct parameters", async function () {
      const { briqVault, briqShares, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      const depositAmount = ethers.parseUnits("100", 6);
      
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount)).wait();
      
      const tx = await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'UserDeposited'
      );
      
      expect(event).to.not.be.undefined;
      
      const [eventUser, eventToken, eventAmount, eventShares] = event.args;
      expect(eventUser).to.equal(user1.address);
      expect(eventToken).to.equal(USDC_ADDRESS);
      expect(eventAmount).to.equal(depositAmount);
      expect(eventShares).to.be.gt(0);
    });

    it("should revert when depositing zero amount", async function () {
      const { briqVault, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      const zeroAmount = ethers.parseUnits("0", 6);
      
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), zeroAmount)).wait();
      
      await expect(
        briqVault.connect(user1).deposit(USDC_ADDRESS, zeroAmount)
      ).to.be.revertedWithCustomError(briqVault, "InvalidAmount");
    });

    it("should calculate shares correctly for first deposit", async function () {
      const { briqVault, briqShares, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      const depositAmount = ethers.parseUnits("100", 6);
      
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount)).wait();
      
      await (await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount)).wait();
      
      const expectedShares = depositAmount * 1000000000000n;
      const actualShares = await briqShares.balanceOf(user1.address);
      
      expect(actualShares).to.equal(expectedShares);
    });

    it("should calculate shares correctly for subsequent deposits", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, user2, usdc } = await loadFixture(deployBriqVaultFixture);
      
      const firstDepositAmount = ethers.parseUnits("100", 6);
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), firstDepositAmount)).wait();
      await (await briqVault.connect(user1).deposit(USDC_ADDRESS, firstDepositAmount)).wait();
      
      const secondDepositAmount = ethers.parseUnits("50", 6);
      await (await usdc.connect(user2).approve(await briqVault.getAddress(), secondDepositAmount)).wait();
      await (await briqVault.connect(user2).deposit(USDC_ADDRESS, secondDepositAmount)).wait();
      
      const user1Shares = await briqShares.balanceOf(user1.address);
      const user2Shares = await briqShares.balanceOf(user2.address);
      const totalShares = await briqShares.totalSupply();
      
      expect(totalShares).to.equal(user1Shares + user2Shares);
      
      const totalBalance = await strategyCoordinator.getTotalTokenBalance(USDC_ADDRESS);
      const user1ShareRatio = user1Shares * 100n / totalShares;
      const user2ShareRatio = user2Shares * 100n / totalShares;
      
      expect(user1ShareRatio).to.be.closeTo(66n, 1n);
      expect(user2ShareRatio).to.be.closeTo(33n, 1n);
    });
  });

  describe("Withdraw", function () {
    it("should allow users to withdraw USDC by burning shares", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, usdc, testAmount } = await loadFixture(deployBriqVaultFixture);
      
      await prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user1, testAmount);
      
      const userShares = await briqShares.balanceOf(user1.address);
      const sharesToWithdraw = userShares / 4n;
      
      const initialBalance = await usdc.balanceOf(user1.address);
      
      const tx = await briqVault.connect(user1).withdraw(USDC_ADDRESS, sharesToWithdraw);
      await tx.wait();
      
      const finalBalance = await usdc.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(initialBalance);
      
      const finalShares = await briqShares.balanceOf(user1.address);
      expect(finalShares).to.equal(userShares - sharesToWithdraw);
    });

    it("should emit UserWithdrew event with correct parameters", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, usdc, testAmount } = await loadFixture(deployBriqVaultFixture);
      
      await prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user1, testAmount);
      
      const userShares = await briqShares.balanceOf(user1.address);
      const sharesToWithdraw = userShares / 4n;
      
      const tx = await briqVault.connect(user1).withdraw(USDC_ADDRESS, sharesToWithdraw);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'UserWithdrew'
      );
      
      expect(event).to.not.be.undefined;
      
      const [eventUser, eventToken, eventAmount, eventShares] = event.args;
      expect(eventUser).to.equal(user1.address);
      expect(eventToken).to.equal(USDC_ADDRESS);
      expect(eventAmount).to.be.gt(0);
      expect(eventShares).to.equal(sharesToWithdraw);
    });

    it("should revert when withdrawing zero shares", async function () {
      const { briqVault, user1 } = await loadFixture(deployBriqVaultFixture);
      
      const zeroShares = 0n;
      
      await expect(
        briqVault.connect(user1).withdraw(USDC_ADDRESS, zeroShares)
      ).to.be.revertedWithCustomError(briqVault, "InvalidAmount");
    });

    it("should revert when withdrawing more shares than owned", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, usdc, testAmount } = await loadFixture(deployBriqVaultFixture);
      
      await prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user1, testAmount);
      
      const userShares = await briqShares.balanceOf(user1.address);
      const tooManyShares = userShares + 1n;
      
      await expect(
        briqVault.connect(user1).withdraw(USDC_ADDRESS, tooManyShares)
      ).to.be.revertedWithCustomError(briqVault, "InvalidShares");
    });

    it("should calculate withdrawal amount correctly", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, usdc, testAmount } = await loadFixture(deployBriqVaultFixture);
      
      await prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user1, testAmount);
      
      const userShares = await briqShares.balanceOf(user1.address);
      const sharesToWithdraw = userShares / 4n;
      
      const initialBalance = await usdc.balanceOf(user1.address);
      
      await (await briqVault.connect(user1).withdraw(USDC_ADDRESS, sharesToWithdraw)).wait();
      
      const finalBalance = await usdc.balanceOf(user1.address);
      const withdrawnAmount = finalBalance - initialBalance;
      
      const totalDeposited = testAmount / 4n + testAmount / 2n;
      const expectedWithdrawal = totalDeposited / 4n;
      
      expect(withdrawnAmount).to.be.closeTo(expectedWithdrawal, ethers.parseUnits("1", 6));
    });
  });

  describe("Integration", function () {
    it("should handle multiple deposits and withdrawals from different users", async function () {
      const { briqVault, briqShares, strategyCoordinator, user1, user2, usdc, testAmount } = await loadFixture(deployBriqVaultFixture);
      
      await prepareStrategiesWithBalances(strategyCoordinator, briqVault, usdc, user1, testAmount);
      
      const depositAmount2 = ethers.parseUnits("200", 6);
      await (await usdc.connect(user2).approve(await briqVault.getAddress(), depositAmount2)).wait();
      await (await briqVault.connect(user2).deposit(USDC_ADDRESS, depositAmount2)).wait();
      
      const initialShares1 = await briqShares.balanceOf(user1.address);
      const initialShares2 = await briqShares.balanceOf(user2.address);
      const initialBalance1 = await usdc.balanceOf(user1.address);
      const initialBalance2 = await usdc.balanceOf(user2.address);
      
      const sharesToWithdraw1 = initialShares1 / 4n;
      await (await briqVault.connect(user1).withdraw(USDC_ADDRESS, sharesToWithdraw1)).wait();
      
      const sharesToWithdraw2 = initialShares2 / 2n;
      await (await briqVault.connect(user2).withdraw(USDC_ADDRESS, sharesToWithdraw2)).wait();
      
      const finalShares1 = await briqShares.balanceOf(user1.address);
      const finalShares2 = await briqShares.balanceOf(user2.address);
      const finalBalance1 = await usdc.balanceOf(user1.address);
      const finalBalance2 = await usdc.balanceOf(user2.address);
      
      expect(finalShares1).to.equal(initialShares1 - sharesToWithdraw1);
      expect(finalShares2).to.equal(initialShares2 - sharesToWithdraw2);
      
      expect(finalBalance1).to.be.gt(initialBalance1);
      expect(finalBalance2).to.be.gt(initialBalance2);
    });

    it("should handle switching between strategies", async function () {
      const { briqVault, strategyCoordinator, user1, usdc } = await loadFixture(deployBriqVaultFixture);
      
      const depositAmount = ethers.parseUnits("100", 6);
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount)).wait();
      await (await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount)).wait();
      
      await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 1)).wait();
      
      await (await usdc.connect(user1).approve(await briqVault.getAddress(), depositAmount)).wait();
      await (await briqVault.connect(user1).deposit(USDC_ADDRESS, depositAmount)).wait();
      
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
      
      expect(aaveBalance).to.be.gt(0);
      expect(compoundBalance).to.be.gt(0);
    });
  });
});
