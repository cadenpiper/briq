import { network } from "hardhat";
import fs from 'fs';
import { updateFrontendAddresses } from './updateFrontendAddresses.js';

async function main() {
  console.log("⚙️  Configuring Briq Protocol with Chainlink Price Feeds\n");
  
  // Load deployment addresses
  if (!fs.existsSync('./deployment.json')) {
    throw new Error("deployment.json not found. Run deploy script first.");
  }
  
  const deploymentData = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  const contracts = deploymentData.contracts;
  
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  
  console.log(`Connected to chain ID: ${chainId}`);
  
  // Load network configuration
  const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  
  // Map hardhat local chain ID to mainnet fork config
  let configChainId = chainId.toString();
  if (chainId.toString() === "31337") {
    configChainId = "31337"; // Use hardhat fork config
  }
  
  const chainConfig = configData.CHAIN_CONFIG[configChainId];
  if (!chainConfig) {
    throw new Error(`No configuration found for chain ID ${chainId}`);
  }

  // Extract network addresses
  const {
    aavePoolV3: AAVE_POOL_V3,
    compoundMarketUSDC: COMPOUND_COMET_USDC,
    compoundMarketWETH: COMPOUND_COMET_WETH,
    usdcAddress: USDC_ADDRESS,
    wethAddress: WETH_ADDRESS,
    priceFeeds: PRICE_FEEDS
  } = chainConfig;
  
  // Verify we're on Arbitrum fork by checking if USDC contract exists
  try {
    const usdcCode = await publicClient.getCode({ address: USDC_ADDRESS });
    if (usdcCode && usdcCode !== '0x') {
      console.log("✅ Arbitrum fork detected - USDC contract found");
    } else {
      console.log("⚠️  Not on Arbitrum fork - USDC contract not found");
    }
  } catch (error) {
    console.log("⚠️  Fork verification failed:", error.message);
  }

  // Use price feeds from config.json
  const CHAINLINK_FEEDS = {
    USDC_USD: PRICE_FEEDS.USDC, // USDC/USD
    ETH_USD: PRICE_FEEDS.WETH   // ETH/USD
  };

  console.log("📊 Setting up Chainlink price feeds...");
  
  // Get contract instances AFTER loading deployment addresses
  const priceFeedManager = await viem.getContractAt("PriceFeedManager", contracts.PriceFeedManager);
  const briqVault = await viem.getContractAt("BriqVault", contracts.BriqVault);
  const briqShares = await viem.getContractAt("BriqShares", contracts.BriqShares);
  const strategyAave = await viem.getContractAt("StrategyAave", contracts.StrategyAave);
  const strategyCompound = await viem.getContractAt("StrategyCompoundComet", contracts.StrategyCompoundComet);
  const strategyCoordinator = await viem.getContractAt("StrategyCoordinator", contracts.StrategyCoordinator);
  
  console.log(`   Using PriceFeedManager at: ${contracts.PriceFeedManager}`);
  
  // Configure USDC price feed (6 decimals)
  console.log(`   Setting USDC price feed: ${USDC_ADDRESS} -> ${CHAINLINK_FEEDS.USDC_USD}`);
  const usdcTx = await priceFeedManager.write.setPriceFeed([
    USDC_ADDRESS,
    CHAINLINK_FEEDS.USDC_USD,
    6
  ]);
  const usdcReceipt = await publicClient.waitForTransactionReceipt({ hash: usdcTx });
  console.log(`   USDC tx status: ${usdcReceipt.status} (success=1, reverted=0)`);
  console.log(`   ✅ USDC/USD price feed: ${CHAINLINK_FEEDS.USDC_USD}`);
  
  // Configure WETH price feed (18 decimals)
  console.log(`   Setting WETH price feed: ${WETH_ADDRESS} -> ${CHAINLINK_FEEDS.ETH_USD}`);
  const wethTx = await priceFeedManager.write.setPriceFeed([
    WETH_ADDRESS,
    CHAINLINK_FEEDS.ETH_USD,
    18
  ]);
  const wethReceipt = await publicClient.waitForTransactionReceipt({ hash: wethTx });
  console.log(`   WETH tx status: ${wethReceipt.status} (success=1, reverted=0)`);
  console.log(`   ✅ WETH/USD price feed: ${CHAINLINK_FEEDS.ETH_USD}`);

  // Test price feeds are working
  try {
    console.log("🔍 Debugging price feeds...");
    
    // Import the AggregatorV3Interface ABI from @chainlink/contracts
    const aggregatorV3ABI = JSON.parse(
      await fs.promises.readFile(
        './node_modules/@chainlink/contracts/abi/v0.8/shared/AggregatorV3Interface.abi.json',
        'utf8'
      )
    );
    
    console.log(`   Testing Chainlink USDC feed at: ${CHAINLINK_FEEDS.USDC_USD}`);
    const usdcFeedData = await publicClient.readContract({
      address: CHAINLINK_FEEDS.USDC_USD,
      abi: aggregatorV3ABI,
      functionName: 'latestRoundData'
    });
    console.log(`   Chainlink USDC price: $${Number(usdcFeedData[1]) / 1e8}`);
    
    console.log(`   Testing Chainlink ETH feed at: ${CHAINLINK_FEEDS.ETH_USD}`);
    const ethFeedData = await publicClient.readContract({
      address: CHAINLINK_FEEDS.ETH_USD,
      abi: aggregatorV3ABI,
      functionName: 'latestRoundData'
    });
    console.log(`   Chainlink ETH price: $${Number(ethFeedData[1]) / 1e8}`);
    
    // Now test our PriceFeedManager step by step
    console.log("   Testing PriceFeedManager step by step...");
    
    // First check if the contract exists at the address
    const contractCode = await publicClient.getCode({ address: contracts.PriceFeedManager });
    console.log(`   PriceFeedManager contract code length: ${contractCode ? contractCode.length : 0} bytes`);
    
    if (!contractCode || contractCode === '0x') {
      console.log(`   ❌ No contract found at address ${contracts.PriceFeedManager}`);
      return;
    }
    
    // Try simpler read functions first
    try {
      console.log("   Testing simple contract reads...");
      const pythContract = await priceFeedManager.read.pythContract();
      console.log(`   Pyth contract address: ${pythContract}`);
      
      const timelock = await priceFeedManager.read.timelock();
      console.log(`   Timelock address: ${timelock}`);
      
    } catch (error) {
      console.log(`   Simple reads failed: ${error.message}`);
    }
    
    // Now try price feed functions
    try {
      console.log("   Testing price feed functions...");
      const usdcPrice = await priceFeedManager.read.getTokenPrice([USDC_ADDRESS]);
      console.log(`   📈 PriceFeedManager USDC price: $${Number(usdcPrice) / 1e8}`);
      
      const wethPrice = await priceFeedManager.read.getTokenPrice([WETH_ADDRESS]);
      console.log(`   📈 PriceFeedManager WETH price: $${Number(wethPrice) / 1e8}`);
      
    } catch (error) {
      console.log(`   Price feed functions failed: ${error.message}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Price feed test failed: ${error.message}`);
  }

  console.log("\n🔗 Setting up contract relationships...");
  
  // Set vault address in shares contract
  await briqShares.write.setVault([contracts.BriqVault]);
  
  // Set coordinator addresses in strategies
  await strategyAave.write.setCoordinator([contracts.StrategyCoordinator]);
  await strategyCompound.write.setCoordinator([contracts.StrategyCoordinator]);
  
  // Set vault address in coordinator
  await strategyCoordinator.write.updateVaultAddress([contracts.BriqVault]);
  
  console.log("✅ Contract relationships established");

  console.log("\n🏦 Configuring Aave strategy...");
  
  // Set Aave pool address and supported tokens
  await strategyAave.write.setAavePool([AAVE_POOL_V3]);
  await strategyAave.write.addSupportedToken([USDC_ADDRESS]);
  await strategyAave.write.addSupportedToken([WETH_ADDRESS]);
  
  console.log("✅ Aave strategy configured");

  console.log("\n🏛️  Configuring Compound strategy...");
  
  // Set Compound market addresses and supported tokens
  await strategyCompound.write.updateMarketSupport([COMPOUND_COMET_USDC, USDC_ADDRESS, true]);
  await strategyCompound.write.updateMarketSupport([COMPOUND_COMET_WETH, WETH_ADDRESS, true]);
  await strategyCompound.write.updateTokenSupport([USDC_ADDRESS, true]);
  await strategyCompound.write.updateTokenSupport([WETH_ADDRESS, true]);
  
  console.log("✅ Compound strategy configured");

  console.log("\n🎯 Setting up token routing...");
  
  // Route USDC to Aave (strategy 0) and WETH to Compound (strategy 1)
  await strategyCoordinator.write.setStrategyForToken([USDC_ADDRESS, 0]);
  await strategyCoordinator.write.setStrategyForToken([WETH_ADDRESS, 1]);
  
  console.log("✅ Token routing: USDC → Aave, WETH → Compound");

  console.log("\n🔄 Updating frontend addresses...");
  
  // Update frontend with deployed contract addresses
  const deployedAddresses = {
    VAULT: contracts.BriqVault,
    SHARES: contracts.BriqShares,
    PRICE_FEED_MANAGER: contracts.PriceFeedManager,
    STRATEGY_COORDINATOR: contracts.StrategyCoordinator,
    STRATEGY_AAVE: contracts.StrategyAave,
    STRATEGY_COMPOUND: contracts.StrategyCompoundComet,
    USDC: USDC_ADDRESS,
    WETH: WETH_ADDRESS
  };
  
  updateFrontendAddresses(deployedAddresses);
  console.log("✅ Frontend addresses synchronized");

  console.log("\n✅ Configuration complete!");
  
  console.log("\n🎉 Briq Protocol Features:");
  console.log("   • USD-normalized share distribution ✅");
  console.log("   • Real-time Chainlink price feeds ✅");
  console.log("   • Fair shares regardless of deposit token ✅");
  console.log("   • Multi-strategy yield optimization ✅");
  console.log("   • USDC and WETH support ✅");
  
  console.log("\n💡 Users can now deposit USDC or WETH and receive");
  console.log("   equivalent USD-value shares for maximum fairness!");
  
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Configuration failed:", error);
    process.exit(1);
  });
