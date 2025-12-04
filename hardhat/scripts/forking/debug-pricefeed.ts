import { network } from "hardhat";
import fs from 'fs';

async function main() {
  console.log("🔍 Debugging PriceFeedManager step by step\n");
  
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  
  // Check current block info
  const currentBlock = await publicClient.getBlock();
  console.log(`Current block number: ${currentBlock.number}`);
  console.log(`Current block timestamp: ${currentBlock.timestamp} (${new Date(Number(currentBlock.timestamp) * 1000).toISOString()})\n`);
  
  // Load deployment addresses
  const deploymentData = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  const contracts = deploymentData.contracts;
  
  // Load config
  const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  const chainConfig = configData.CHAIN_CONFIG["31337"];
  const USDC_ADDRESS = chainConfig.usdcAddress;
  const CHAINLINK_FEEDS = {
    USDC_USD: chainConfig.priceFeeds.USDC,
  };
  
  const priceFeedManager = await viem.getContractAt("PriceFeedManager", contracts.PriceFeedManager);
  
  console.log("1. Testing if price feed is set...");
  try {
    const usdcPriceFeedAddr = await publicClient.readContract({
      address: contracts.PriceFeedManager,
      abi: priceFeedManager.abi,
      functionName: 'priceFeeds',
      args: [USDC_ADDRESS]
    });
    console.log(`   USDC price feed address: ${usdcPriceFeedAddr}`);
    
    if (usdcPriceFeedAddr === '0x0000000000000000000000000000000000000000') {
      console.log("   ❌ Price feed not set! This is the issue.");
      return;
    }
  } catch (error) {
    console.log(`   ❌ Failed to read price feed mapping: ${error.message}`);
    return;
  }
  
  console.log("2. Testing direct Chainlink call...");
  try {
    const aggregatorV3ABI = JSON.parse(
      await fs.promises.readFile(
        './node_modules/@chainlink/contracts/abi/v0.8/shared/AggregatorV3Interface.abi.json',
        'utf8'
      )
    );
    
    const feedData = await publicClient.readContract({
      address: CHAINLINK_FEEDS.USDC_USD,
      abi: aggregatorV3ABI,
      functionName: 'latestRoundData'
    });
    
    console.log(`   Chainlink roundId: ${feedData[0]}`);
    console.log(`   Chainlink answer: ${feedData[1]} (${Number(feedData[1]) / 1e8})`);
    console.log(`   Chainlink updatedAt: ${feedData[3]}`);
    console.log(`   Chainlink answeredInRound: ${feedData[4]}`);
    
    // Check staleness
    const blockTimestamp = await publicClient.getBlock().then(block => Number(block.timestamp));
    const priceUpdatedAt = Number(feedData[3]);
    const staleness = blockTimestamp - priceUpdatedAt;
    
    console.log(`   Block timestamp: ${blockTimestamp} (${new Date(blockTimestamp * 1000).toISOString()})`);
    console.log(`   Price updated at: ${priceUpdatedAt} (${new Date(priceUpdatedAt * 1000).toISOString()})`);
    console.log(`   Staleness: ${staleness} seconds (${Math.floor(staleness / 86400)} days)`);
    console.log(`   Staleness threshold: 3600 seconds (1 hour)`);
    
    if (staleness > 3600) {
      console.log(`   ❌ Price is stale! Need block within 1 hour of price update.`);
      console.log(`   💡 Price was updated at block timestamp ${priceUpdatedAt}`);
      console.log(`   💡 We need a fork block with timestamp >= ${priceUpdatedAt - 3600} (1 hour buffer)`);
    }
    
    // Check if answer is valid
    if (Number(feedData[1]) <= 0) {
      console.log("   ❌ Invalid price: answer <= 0");
    }
    
    // Check if answeredInRound < roundId
    if (Number(feedData[4]) < Number(feedData[0])) {
      console.log("   ❌ Invalid price: answeredInRound < roundId");
    }
    
  } catch (error) {
    console.log(`   ❌ Direct Chainlink call failed: ${error.message}`);
  }
  
  console.log("3. Testing getChainlinkPrice...");
  try {
    const chainlinkPrice = await priceFeedManager.read.getChainlinkPrice([USDC_ADDRESS]);
    console.log(`   ✅ getChainlinkPrice success: ${Number(chainlinkPrice) / 1e8}`);
  } catch (error) {
    console.log(`   ❌ getChainlinkPrice failed: ${error.message}`);
  }
  
  console.log("4. Testing getTokenPrice...");
  try {
    const tokenPrice = await priceFeedManager.read.getTokenPrice([USDC_ADDRESS]);
    console.log(`   ✅ getTokenPrice success: ${Number(tokenPrice) / 1e8}`);
  } catch (error) {
    console.log(`   ❌ getTokenPrice failed: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  });
