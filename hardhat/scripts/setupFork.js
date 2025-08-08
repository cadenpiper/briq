const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Deploying Briq Protocol...\n");
  
  // Get deployer info
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // Deploy contracts in dependency order
  console.log("📄 Deploying contracts...");

  // 1. BriqShares - ERC20 token for vault shares
  const BriqShares = await ethers.getContractFactory("BriqShares");
  const briqShares = await BriqShares.deploy("Briq Shares", "BRIQ");
  await briqShares.waitForDeployment();
  console.log(`   BriqShares: ${await briqShares.getAddress()}`);

  // 2. StrategyAave - Aave lending strategy
  const StrategyAave = await ethers.getContractFactory("StrategyAave");
  const strategyAave = await StrategyAave.deploy();
  await strategyAave.waitForDeployment();
  console.log(`   StrategyAave: ${await strategyAave.getAddress()}`);

  // 3. StrategyCompoundComet - Compound v3 strategy
  const StrategyCompoundComet = await ethers.getContractFactory("StrategyCompoundComet");
  const strategyCompound = await StrategyCompoundComet.deploy();
  await strategyCompound.waitForDeployment();
  console.log(`   StrategyCompoundComet: ${await strategyCompound.getAddress()}`);

  // 4. StrategyCoordinator - Routes between strategies
  const StrategyCoordinator = await ethers.getContractFactory("StrategyCoordinator");
  const strategyCoordinator = await StrategyCoordinator.deploy(
    await strategyAave.getAddress(),
    await strategyCompound.getAddress()
  );
  await strategyCoordinator.waitForDeployment();
  console.log(`   StrategyCoordinator: ${await strategyCoordinator.getAddress()}`);

  // 5. BriqVault - Main vault contract
  const BriqVault = await ethers.getContractFactory("BriqVault");
  const briqVault = await BriqVault.deploy(
    await strategyCoordinator.getAddress(),
    await briqShares.getAddress()
  );
  await briqVault.waitForDeployment();
  console.log(`   BriqVault: ${await briqVault.getAddress()}`);

  console.log("\n✅ Deployment complete!");
  
  // Configuration phase
  console.log("\n⚙️  Configuring contracts...");
  
  // Load network configuration
  const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  
  // Map hardhat local chain ID to appropriate mainnet config
  let configChainId = chainId.toString();
  if (chainId.toString() === "31337") {
    console.log("   Detected Hardhat local network, using mainnet fork config");
    configChainId = "31337";
  }
  
  const chainConfig = configData.CHAIN_CONFIG[configChainId];
  if (!chainConfig) {
    console.log(`❌ No configuration found for chain ID ${chainId}`);
    console.log("Available configurations:", Object.keys(configData.CHAIN_CONFIG));
    throw new Error(`No configuration found for chain ID ${chainId}`);
  }

  const {
    aavePoolV3: AAVE_POOL_V3,
    compoundMarketUSDC: COMPOUND_COMET_USDC,
    compoundMarketWETH: COMPOUND_COMET_WETH,
    usdcAddress: USDC_ADDRESS,
    wethAddress: WETH_ADDRESS
  } = chainConfig;

  // 1. Set up contract relationships
  console.log("🔗 Setting up contract relationships...");
  await (await briqShares.setVault(await briqVault.getAddress())).wait();
  await (await strategyAave.setCoordinator(await strategyCoordinator.getAddress())).wait();
  await (await strategyCompound.setCoordinator(await strategyCoordinator.getAddress())).wait();
  await (await strategyCoordinator.updateVaultAddress(await briqVault.getAddress())).wait();
  console.log("   ✅ Contract relationships established");

  // 2. Configure Aave strategy
  console.log("🏦 Configuring Aave strategy...");
  await (await strategyAave.setAavePool(AAVE_POOL_V3)).wait();
  await (await strategyAave.addSupportedToken(USDC_ADDRESS)).wait();
  await (await strategyAave.addSupportedToken(WETH_ADDRESS)).wait();
  console.log("   ✅ Aave strategy configured");

  // 3. Configure Compound strategy
  console.log("🏛️  Configuring Compound strategy...");
  await (await strategyCompound.updateMarketSupport(COMPOUND_COMET_USDC, USDC_ADDRESS, true)).wait();
  await (await strategyCompound.updateMarketSupport(COMPOUND_COMET_WETH, WETH_ADDRESS, true)).wait();
  await (await strategyCompound.updateTokenSupport(USDC_ADDRESS, true)).wait();
  await (await strategyCompound.updateTokenSupport(WETH_ADDRESS, true)).wait();
  console.log("   ✅ Compound strategy configured");

  // 4. Set token routing
  console.log("🎯 Setting up token routing...");
  await (await strategyCoordinator.setStrategyForToken(USDC_ADDRESS, 0)).wait(); // Aave
  await (await strategyCoordinator.setStrategyForToken(WETH_ADDRESS, 1)).wait(); // Compound
  console.log("   ✅ USDC → Aave, WETH → Compound");

  console.log("\n✅ Configuration complete!");
  
  // Funding phase
  console.log("\n💰 Funding hardhat account 0...");
  
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
  
  const { usdcWhale, wethWhale } = chainConfig;
  
  // Impersonate whale accounts
  await ethers.provider.send("hardhat_impersonateAccount", [usdcWhale]);
  await ethers.provider.send("hardhat_impersonateAccount", [wethWhale]);
  
  const usdcWhaleSigner = await ethers.getSigner(usdcWhale);
  const wethWhaleSigner = await ethers.getSigner(wethWhale);
  
  // Fund whales with ETH for gas
  await ethers.provider.send("hardhat_setBalance", [usdcWhale, "0x1000000000000000000"]);
  await ethers.provider.send("hardhat_setBalance", [wethWhale, "0x1000000000000000000"]);
  
  // Transfer tokens to deployer (hardhat account 0)
  const usdcAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
  const wethAmount = ethers.parseUnits("10", 18);   // 10 WETH
  
  await usdc.connect(usdcWhaleSigner).transfer(deployer.address, usdcAmount);
  await weth.connect(wethWhaleSigner).transfer(deployer.address, wethAmount);
  
  console.log(`   ✅ Funded ${deployer.address} with:`);
  console.log(`      - 10,000 USDC`);
  console.log(`      - 10 WETH`);
  
  // Balance verification
  console.log("\n🔍 Verifying balances...");
  
  const finalUsdcBalance = await usdc.balanceOf(deployer.address);
  const finalWethBalance = await weth.balanceOf(deployer.address);
  const ethBalance = await ethers.provider.getBalance(deployer.address);
  
  console.log(`   ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
  console.log(`   USDC Balance: ${ethers.formatUnits(finalUsdcBalance, 6)} USDC`);
  console.log(`   WETH Balance: ${ethers.formatUnits(finalWethBalance, 18)} WETH`);
  
  // Verify expected amounts
  const expectedUsdc = ethers.parseUnits("10000", 6);
  const expectedWeth = ethers.parseUnits("10", 18);
  
  if (finalUsdcBalance >= expectedUsdc && finalWethBalance >= expectedWeth) {
    console.log("\n✅ Funding verification successful!");
  } else {
    console.log("\n❌ Funding verification failed:");
    if (finalUsdcBalance < expectedUsdc) {
      console.log(`   Expected USDC: ${ethers.formatUnits(expectedUsdc, 6)}, Got: ${ethers.formatUnits(finalUsdcBalance, 6)}`);
    }
    if (finalWethBalance < expectedWeth) {
      console.log(`   Expected WETH: ${ethers.formatUnits(expectedWeth, 18)}, Got: ${ethers.formatUnits(finalWethBalance, 18)}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
