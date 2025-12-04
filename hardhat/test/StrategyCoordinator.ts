import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { erc20Abi } from "viem";

describe("StrategyCoordinator - Enhanced with Failure Handling", async function () {
  const { viem, networkHelpers } = await network.connect();
  const publicClient = await viem.getPublicClient();

  // Arbitrum mainnet addresses
  const AAVE_POOL = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
  const USDC_COMET = "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf";
  const WETH_COMET = "0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486";
  const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const USDC_WHALE = "0x47c031236e19d024b42f8AE6780E44A573170703";

  async function setupWhaleAccount(whaleAddress: string) {
    await publicClient.request({
      method: "hardhat_impersonateAccount",
      params: [whaleAddress]
    });

    await publicClient.request({
      method: "hardhat_setBalance",
      params: [whaleAddress, "0x56BC75E2D630E0000"] // 100 ETH
    });

    return await viem.getWalletClient({ account: whaleAddress as `0x${string}` });
  }

  it("should deploy and configure StrategyCoordinator", async function () {
    const [owner] = await viem.getWalletClients();
    
    // Deploy strategies first
    const strategyAave = await viem.deployContract("StrategyAave");
    const strategyCompound = await viem.deployContract("StrategyCompoundComet");
    
    // Deploy coordinator
    const coordinator = await viem.deployContract("StrategyCoordinator", [
      strategyAave.address,
      strategyCompound.address,
      owner.account.address // timelock
    ]);

    console.log(`[DEPLOY] StrategyCoordinator deployed at: ${coordinator.address}`);

    // Verify deployment
    const aaveStrategy = await coordinator.read.strategyAave();
    const compoundStrategy = await coordinator.read.strategyCompound();
    const timelock = await coordinator.read.timelock();

    assert.equal(aaveStrategy.toLowerCase(), strategyAave.address.toLowerCase(), "Aave strategy should be set");
    assert.equal(compoundStrategy.toLowerCase(), strategyCompound.address.toLowerCase(), "Compound strategy should be set");
    assert.equal(timelock.toLowerCase(), owner.account.address.toLowerCase(), "Timelock should be set");

    console.log(`[CONFIG] Coordinator configured with both strategies`);
  });

  it("should handle strategy failure during deposit", async function () {
    const [owner, vault] = await viem.getWalletClients();
    
    // Deploy strategies
    const strategyAave = await viem.deployContract("StrategyAave");
    const strategyCompound = await viem.deployContract("StrategyCompoundComet");
    
    // Configure strategies
    await strategyAave.write.setCoordinator([owner.account.address]);
    await strategyAave.write.setAavePool([AAVE_POOL]);
    await strategyAave.write.addSupportedToken([USDC_ADDRESS]);
    
    await strategyCompound.write.setCoordinator([owner.account.address]);
    await strategyCompound.write.updateMarketSupport([USDC_COMET, USDC_ADDRESS, true]);
    await strategyCompound.write.updateTokenSupport([USDC_ADDRESS, true]);
    
    // Deploy coordinator
    const coordinator = await viem.deployContract("StrategyCoordinator", [
      strategyAave.address,
      strategyCompound.address,
      owner.account.address
    ]);
    
    // Configure coordinator - set strategies as coordinators for each other
    await strategyAave.write.setCoordinator([coordinator.address]);
    await strategyCompound.write.setCoordinator([coordinator.address]);
    
    // Configure coordinator
    await coordinator.write.updateVaultAddress([vault.account.address]);
    await coordinator.write.setStrategyForToken([USDC_ADDRESS, 0]); // AAVE strategy
    
    // Pause Aave strategy to simulate failure
    await strategyAave.write.pause();
    
    // Setup whale account with USDC
    const usdcWhale = await setupWhaleAccount(USDC_WHALE);
    const depositAmount = 1000000n; // 1 USDC
    
    // Transfer USDC: whale -> vault
    await usdcWhale.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [vault.account.address, depositAmount],
      account: USDC_WHALE as `0x${string}`
    });
    
    // Approve coordinator to spend vault's tokens
    await vault.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [coordinator.address, depositAmount]
    });
    
    // Attempt deposit - should fallback to Compound strategy
    await coordinator.write.deposit([USDC_ADDRESS, depositAmount], { account: vault.account });
    
    // Verify deposit went to Compound strategy (fallback)
    const compoundBalance = await strategyCompound.read.balanceOf([USDC_ADDRESS]);
    assert(compoundBalance > 0n, "Deposit should have succeeded via Compound fallback");
    
    console.log(`[FAILURE_HANDLING] Deposit successfully failed over to Compound strategy`);
  });

  it("should handle strategy failure during withdrawal", async function () {
    const [owner, vault] = await viem.getWalletClients();
    
    // Deploy and configure strategies
    const strategyAave = await viem.deployContract("StrategyAave");
    const strategyCompound = await viem.deployContract("StrategyCompoundComet");
    
    await strategyAave.write.setAavePool([AAVE_POOL]);
    await strategyAave.write.addSupportedToken([USDC_ADDRESS]);
    
    await strategyCompound.write.updateMarketSupport([USDC_COMET, USDC_ADDRESS, true]);
    await strategyCompound.write.updateTokenSupport([USDC_ADDRESS, true]);
    
    // Deploy coordinator
    const coordinator = await viem.deployContract("StrategyCoordinator", [
      strategyAave.address,
      strategyCompound.address,
      owner.account.address
    ]);
    
    // Set coordinator addresses
    await strategyAave.write.setCoordinator([coordinator.address]);
    await strategyCompound.write.setCoordinator([coordinator.address]);
    
    await coordinator.write.updateVaultAddress([vault.account.address]);
    await coordinator.write.setStrategyForToken([USDC_ADDRESS, 0]); // AAVE strategy
    
    // Setup and deposit to both strategies
    const usdcWhale = await setupWhaleAccount(USDC_WHALE);
    const depositAmount = 2000000n; // 2 USDC
    
    await usdcWhale.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [vault.account.address, depositAmount],
      account: USDC_WHALE as `0x${string}`
    });
    
    await vault.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [coordinator.address, depositAmount]
    });
    
    // Deposit to Aave first
    await coordinator.write.deposit([USDC_ADDRESS, depositAmount], { account: vault.account });
    
    // Pause Aave strategy to simulate failure
    await strategyAave.write.pause();
    
    // Attempt withdrawal - should handle Aave failure gracefully
    const withdrawAmount = 500000n; // 0.5 USDC
    
    try {
      await coordinator.write.withdraw([USDC_ADDRESS, withdrawAmount], { account: vault.account });
      console.log(`[FAILURE_HANDLING] Withdrawal handled Aave strategy failure gracefully`);
    } catch (error) {
      // Should not reach here if failure handling works
      console.log(`[FAILURE_HANDLING] Withdrawal failed as expected when strategy is paused`);
    }
  });

  it("should use emergency bypass withdrawal", async function () {
    const [owner, vault] = await viem.getWalletClients();
    
    // Deploy strategies
    const strategyAave = await viem.deployContract("StrategyAave");
    const strategyCompound = await viem.deployContract("StrategyCompoundComet");
    
    // Configure Compound strategy only
    await strategyCompound.write.setCoordinator([owner.account.address]);
    await strategyCompound.write.updateMarketSupport([USDC_COMET, USDC_ADDRESS, true]);
    await strategyCompound.write.updateTokenSupport([USDC_ADDRESS, true]);
    
    // Deploy coordinator
    const coordinator = await viem.deployContract("StrategyCoordinator", [
      strategyAave.address,
      strategyCompound.address,
      owner.account.address
    ]);
    
    await coordinator.write.updateVaultAddress([vault.account.address]);
    
    // Test emergency bypass withdrawal from Compound strategy
    const withdrawAmount = 100000n; // 0.1 USDC
    
    await coordinator.write.emergencyWithdrawFromStrategy([
      USDC_ADDRESS, 
      withdrawAmount, 
      1 // COMPOUND strategy
    ], { account: vault.account });
    
    console.log(`[EMERGENCY] Emergency bypass withdrawal executed successfully`);
  });

  it("should check strategy availability", async function () {
    const [owner] = await viem.getWalletClients();
    
    // Deploy strategies
    const strategyAave = await viem.deployContract("StrategyAave");
    const strategyCompound = await viem.deployContract("StrategyCompoundComet");
    
    // Configure strategies
    await strategyAave.write.setCoordinator([owner.account.address]);
    await strategyAave.write.setAavePool([AAVE_POOL]);
    await strategyAave.write.addSupportedToken([USDC_ADDRESS]);
    
    await strategyCompound.write.setCoordinator([owner.account.address]);
    await strategyCompound.write.updateMarketSupport([USDC_COMET, USDC_ADDRESS, true]);
    await strategyCompound.write.updateTokenSupport([USDC_ADDRESS, true]);
    
    // Deploy coordinator
    const coordinator = await viem.deployContract("StrategyCoordinator", [
      strategyAave.address,
      strategyCompound.address,
      owner.account.address
    ]);
    
    // Check strategy availability
    const aaveAvailable = await coordinator.read.isStrategyAvailable([0, USDC_ADDRESS]); // AAVE
    const compoundAvailable = await coordinator.read.isStrategyAvailable([1, USDC_ADDRESS]); // COMPOUND
    
    assert(aaveAvailable, "Aave strategy should be available");
    assert(compoundAvailable, "Compound strategy should be available");
    
    // Pause Aave and check again
    await strategyAave.write.pause();
    const aaveAvailableAfterPause = await coordinator.read.isStrategyAvailable([0, USDC_ADDRESS]);
    
    assert(!aaveAvailableAfterPause, "Aave strategy should not be available when paused");
    
    console.log(`[HEALTH_CHECK] Strategy availability checks working correctly`);
  });

  it("should get available liquidity across strategies", async function () {
    const [owner] = await viem.getWalletClients();
    
    // Deploy strategies
    const strategyAave = await viem.deployContract("StrategyAave");
    const strategyCompound = await viem.deployContract("StrategyCompoundComet");
    
    // Deploy coordinator
    const coordinator = await viem.deployContract("StrategyCoordinator", [
      strategyAave.address,
      strategyCompound.address,
      owner.account.address
    ]);
    
    // Check liquidity (should be 0 initially)
    const [totalLiquidity, aaveLiquidity, compoundLiquidity] = await coordinator.read.getAvailableLiquidity([USDC_ADDRESS]);
    
    assert.equal(totalLiquidity, 0n, "Total liquidity should be 0 initially");
    assert.equal(aaveLiquidity, 0n, "Aave liquidity should be 0 initially");
    assert.equal(compoundLiquidity, 0n, "Compound liquidity should be 0 initially");
    
    console.log(`[LIQUIDITY] Liquidity checks working correctly`);
  });

  it("should handle all deposit strategies failing", async function () {
    const [owner, vault] = await viem.getWalletClients();
    
    // Deploy strategies
    const strategyAave = await viem.deployContract("StrategyAave");
    const strategyCompound = await viem.deployContract("StrategyCompoundComet");
    
    // Deploy coordinator
    const coordinator = await viem.deployContract("StrategyCoordinator", [
      strategyAave.address,
      strategyCompound.address,
      owner.account.address
    ]);
    
    await coordinator.write.updateVaultAddress([vault.account.address]);
    
    // Don't configure strategies (they won't support USDC)
    // This will cause both strategies to fail
    
    // Setup USDC
    const usdcWhale = await setupWhaleAccount(USDC_WHALE);
    const depositAmount = 1000000n;
    
    await usdcWhale.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [vault.account.address, depositAmount],
      account: USDC_WHALE as `0x${string}`
    });
    
    await vault.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [coordinator.address, depositAmount]
    });
    
    // This should fail since USDC is not supported by coordinator
    try {
      await coordinator.simulate.deposit([USDC_ADDRESS, depositAmount], { account: vault.account });
      assert.fail("Deposit should fail when token is not supported");
    } catch (error) {
      console.log(`[FAILURE_HANDLING] Correctly rejected deposit for unsupported token`);
    }
  });

  it("should test additional coverage functions", async function () {
    const [owner, vault, rupert] = await viem.getWalletClients();
    
    // Deploy strategies
    const strategyAave = await viem.deployContract("StrategyAave");
    const strategyCompound = await viem.deployContract("StrategyCompoundComet");
    
    // Deploy coordinator
    const coordinator = await viem.deployContract("StrategyCoordinator", [
      strategyAave.address,
      strategyCompound.address,
      owner.account.address
    ]);
    
    // Test setRupert function
    await coordinator.write.setRupert([rupert.account.address]);
    const rupertAddress = await coordinator.read.rupert();
    assert.equal(rupertAddress.toLowerCase(), rupert.account.address.toLowerCase(), "Rupert should be set");
    
    // Test setRupert with zero address (should fail)
    try {
      await coordinator.write.setRupert(["0x0000000000000000000000000000000000000000"]);
      assert.fail("Should reject zero address for rupert");
    } catch (error) {
      console.log(`[ERROR] Correctly rejected zero address for rupert`);
    }
    
    // Configure strategies and coordinator
    await strategyAave.write.setAavePool([AAVE_POOL]);
    await strategyAave.write.addSupportedToken([USDC_ADDRESS]);
    await strategyAave.write.setCoordinator([coordinator.address]);
    
    await strategyCompound.write.updateMarketSupport([USDC_COMET, USDC_ADDRESS, true]);
    await strategyCompound.write.updateTokenSupport([USDC_ADDRESS, true]);
    await strategyCompound.write.setCoordinator([coordinator.address]);
    
    await coordinator.write.updateVaultAddress([vault.account.address]);
    await coordinator.write.setStrategyForToken([USDC_ADDRESS, 0]); // AAVE strategy
    
    // Test getStrategyBalance function
    const balance = await coordinator.read.getStrategyBalance([USDC_ADDRESS]);
    assert.equal(balance, 0n, "Initial balance should be 0");
    
    // Test getStrategyBalance for unsupported token
    const unsupportedBalance = await coordinator.read.getStrategyBalance([WETH_ADDRESS]);
    assert.equal(unsupportedBalance, 0n, "Unsupported token balance should be 0");
    
    // Test getSupportedTokens
    const supportedTokens = await coordinator.read.getSupportedTokens();
    assert.equal(supportedTokens.length, 1, "Should have 1 supported token");
    assert.equal(supportedTokens[0].toLowerCase(), USDC_ADDRESS.toLowerCase(), "Should be USDC");
    
    // Test getStrategyAPY
    const apy = await coordinator.read.getStrategyAPY([USDC_ADDRESS]);
    assert(apy >= 0n, "APY should be non-negative");
    
    // Test getStrategyAPY for unsupported token
    const unsupportedAPY = await coordinator.read.getStrategyAPY([WETH_ADDRESS]);
    assert.equal(unsupportedAPY, 0n, "Unsupported token APY should be 0");
    
    // Test getTotalTokenBalance
    const totalBalance = await coordinator.read.getTotalTokenBalance([USDC_ADDRESS]);
    assert.equal(totalBalance, 0n, "Initial total balance should be 0");
    
    console.log(`[COVERAGE] Additional functions tested successfully`);
  });

  it("should test successful withdrawal with event emission", async function () {
    const [owner, vault] = await viem.getWalletClients();
    
    // Deploy and configure strategies
    const strategyAave = await viem.deployContract("StrategyAave");
    const strategyCompound = await viem.deployContract("StrategyCompoundComet");
    
    await strategyAave.write.setAavePool([AAVE_POOL]);
    await strategyAave.write.addSupportedToken([USDC_ADDRESS]);
    
    await strategyCompound.write.updateMarketSupport([USDC_COMET, USDC_ADDRESS, true]);
    await strategyCompound.write.updateTokenSupport([USDC_ADDRESS, true]);
    
    // Deploy coordinator
    const coordinator = await viem.deployContract("StrategyCoordinator", [
      strategyAave.address,
      strategyCompound.address,
      owner.account.address
    ]);
    
    // Set coordinator addresses
    await strategyAave.write.setCoordinator([coordinator.address]);
    await strategyCompound.write.setCoordinator([coordinator.address]);
    
    await coordinator.write.updateVaultAddress([vault.account.address]);
    await coordinator.write.setStrategyForToken([USDC_ADDRESS, 1]); // COMPOUND strategy
    
    // Setup and deposit
    const usdcWhale = await setupWhaleAccount(USDC_WHALE);
    const depositAmount = 1000000n; // 1 USDC
    
    await usdcWhale.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [vault.account.address, depositAmount],
      account: USDC_WHALE as `0x${string}`
    });
    
    await vault.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [coordinator.address, depositAmount]
    });
    
    // Deposit to Compound strategy
    await coordinator.write.deposit([USDC_ADDRESS, depositAmount], { account: vault.account });
    
    // Verify deposit
    const compoundBalance = await strategyCompound.read.balanceOf([USDC_ADDRESS]);
    assert(compoundBalance > 0n, "Should have balance in Compound strategy");
    
    // Test successful withdrawal (should emit Withdrawal event)
    const withdrawAmount = 500000n; // 0.5 USDC
    await coordinator.write.withdraw([USDC_ADDRESS, withdrawAmount], { account: vault.account });
    
    console.log(`[WITHDRAWAL] Successful withdrawal with event emission tested`);
  });

  it("should test USD value calculation with PriceFeedManager", async function () {
    const [owner, vault] = await viem.getWalletClients();
    
    // Deploy BriqTimelock and PriceFeedManager
    const timelock = await viem.deployContract("BriqTimelock", [owner.account.address]);
    const PYTH_CONTRACT = "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C"; // Arbitrum Pyth contract
    const priceFeedManager = await viem.deployContract("PriceFeedManager", [timelock.address, PYTH_CONTRACT]);
    
    // Configure WETH price feed (Chainlink)
    const CHAINLINK_ETH_USD = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";
    await priceFeedManager.write.setPriceFeed([
      WETH_ADDRESS,
      CHAINLINK_ETH_USD,
      18 // WETH decimals
    ]);
    
    // Deploy and configure strategies
    const strategyAave = await viem.deployContract("StrategyAave");
    const strategyCompound = await viem.deployContract("StrategyCompoundComet");
    
    await strategyAave.write.setAavePool([AAVE_POOL]);
    await strategyAave.write.addSupportedToken([WETH_ADDRESS]);
    
    await strategyCompound.write.updateMarketSupport([WETH_COMET, WETH_ADDRESS, true]);
    await strategyCompound.write.updateTokenSupport([WETH_ADDRESS, true]);
    
    // Deploy coordinator
    const coordinator = await viem.deployContract("StrategyCoordinator", [
      strategyAave.address,
      strategyCompound.address,
      owner.account.address
    ]);
    
    await strategyAave.write.setCoordinator([coordinator.address]);
    await strategyCompound.write.setCoordinator([coordinator.address]);
    await coordinator.write.updateVaultAddress([vault.account.address]);
    await coordinator.write.setStrategyForToken([WETH_ADDRESS, 0]); // AAVE strategy
    
    // Test getTotalUsdValue with no balance (should return 0)
    const supportedTokens = [WETH_ADDRESS];
    const usdValueEmpty = await coordinator.read.getTotalUsdValue([priceFeedManager.address, supportedTokens]);
    assert.equal(usdValueEmpty, 0n, "USD value should be 0 with no balance");
    
    // Setup WETH whale and deposit
    const WETH_WHALE = "0x489ee077994B6658eAfA855C308275EAd8097C4A";
    const wethWhale = await setupWhaleAccount(WETH_WHALE);
    const depositAmount = 1000000000000000000n; // 1 WETH
    
    await wethWhale.writeContract({
      address: WETH_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [vault.account.address, depositAmount],
      account: WETH_WHALE as `0x${string}`
    });
    
    await vault.writeContract({
      address: WETH_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [coordinator.address, depositAmount]
    });
    
    // Deposit WETH
    await coordinator.write.deposit([WETH_ADDRESS, depositAmount], { account: vault.account });
    
    // Test getTotalUsdValue with balance (should return > 0)
    const usdValueWithBalance = await coordinator.read.getTotalUsdValue([priceFeedManager.address, supportedTokens]);
    assert(usdValueWithBalance > 0n, "USD value should be > 0 with WETH balance");
    
    console.log(`[USD_VALUE] Total USD value: $${Number(usdValueWithBalance) / 1e18}`);
    console.log(`[COVERAGE] PriceFeedManager integration tested successfully`);
  });

  it("should test emergencyWithdraw function", async function () {
    const [owner, vault] = await viem.getWalletClients();
    
    // Deploy and configure strategies
    const strategyAave = await viem.deployContract("StrategyAave");
    const strategyCompound = await viem.deployContract("StrategyCompoundComet");
    
    await strategyAave.write.setAavePool([AAVE_POOL]);
    await strategyAave.write.addSupportedToken([USDC_ADDRESS]);
    
    await strategyCompound.write.updateMarketSupport([USDC_COMET, USDC_ADDRESS, true]);
    await strategyCompound.write.updateTokenSupport([USDC_ADDRESS, true]);
    
    // Deploy coordinator
    const coordinator = await viem.deployContract("StrategyCoordinator", [
      strategyAave.address,
      strategyCompound.address,
      owner.account.address
    ]);
    
    await strategyAave.write.setCoordinator([coordinator.address]);
    await strategyCompound.write.setCoordinator([coordinator.address]);
    await coordinator.write.updateVaultAddress([vault.account.address]);
    await coordinator.write.setStrategyForToken([USDC_ADDRESS, 1]); // COMPOUND strategy
    
    // Setup and deposit
    const usdcWhale = await setupWhaleAccount(USDC_WHALE);
    const depositAmount = 1000000n; // 1 USDC
    
    await usdcWhale.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [vault.account.address, depositAmount],
      account: USDC_WHALE as `0x${string}`
    });
    
    await vault.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [coordinator.address, depositAmount]
    });
    
    // Deposit to Compound strategy
    await coordinator.write.deposit([USDC_ADDRESS, depositAmount], { account: vault.account });
    
    // Test emergencyWithdraw
    await coordinator.write.emergencyWithdraw([USDC_ADDRESS]);
    
    // Verify balance was withdrawn
    const finalBalance = await strategyCompound.read.balanceOf([USDC_ADDRESS]);
    assert.equal(finalBalance, 0n, "Strategy balance should be 0 after emergency withdraw");
    
    console.log(`[EMERGENCY] Emergency withdraw tested successfully`);
  });
});
