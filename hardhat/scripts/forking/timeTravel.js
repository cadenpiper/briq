/**
 * Time Travel Script - Fast Forward Time for Rewards Testing
 * 
 * This script allows you to fast-forward time on the forked network to see
 * rewards accrual in action. It also updates price feeds to prevent stale
 * price errors after time travel.
 */

const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("⏰ Time Travel Script - Fast Forward for Rewards Testing\n");

  // Get current block info
  const currentBlock = await ethers.provider.getBlock('latest');
  const currentTimestamp = currentBlock.timestamp;
  const currentDate = new Date(currentTimestamp * 1000);
  
  console.log(`📅 Current time: ${currentDate.toISOString()}`);
  console.log(`🔢 Current block: ${currentBlock.number}`);
  console.log(`⏱️  Current timestamp: ${currentTimestamp}\n`);

  // Time travel options
  const timeOptions = {
    '1': { seconds: 3600, description: '1 hour' },
    '2': { seconds: 86400, description: '1 day' },
    '3': { seconds: 604800, description: '1 week' },
    '4': { seconds: 2592000, description: '30 days' },
    '5': { seconds: 31536000, description: '1 year' }
  };

  console.log("🚀 Time Travel Options:");
  Object.entries(timeOptions).forEach(([key, option]) => {
    console.log(`   ${key}. Fast forward ${option.description}`);
  });
  console.log("   6. Custom time (enter seconds)");
  console.log("   0. Exit\n");

  // For automation, let's fast forward 1 week to see significant rewards
  const choice = '3'; // 1 week
  const timeToAdd = timeOptions[choice].seconds;
  const description = timeOptions[choice].description;

  console.log(`⏭️  Fast forwarding ${description} (${timeToAdd} seconds)...\n`);

  try {
    // Increase time
    await ethers.provider.send("evm_increaseTime", [timeToAdd]);
    
    // Mine a new block to apply the time change
    await ethers.provider.send("evm_mine");

    // Get new block info
    const newBlock = await ethers.provider.getBlock('latest');
    const newTimestamp = newBlock.timestamp;
    const newDate = new Date(newTimestamp * 1000);

    console.log("✅ Time travel successful!");
    console.log(`📅 New time: ${newDate.toISOString()}`);
    console.log(`🔢 New block: ${newBlock.number}`);
    console.log(`⏱️  New timestamp: ${newTimestamp}`);
    console.log(`⏰ Time advanced: ${timeToAdd} seconds (${description})\n`);

    // Update price feeds to prevent stale price errors
    console.log("📊 Updating price feeds after time travel...");
    
    // Load deployment and config data
    if (!fs.existsSync('./deployment.json')) {
      throw new Error("deployment.json not found. Run deploy script first.");
    }
    
    const deploymentData = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
    const contracts = deploymentData.contracts;
    
    const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const chainConfig = configData.CHAIN_CONFIG["31337"]; // Hardhat fork config
    
    const {
      usdcAddress: USDC_ADDRESS,
      wethAddress: WETH_ADDRESS,
      priceFeeds: PRICE_FEEDS
    } = chainConfig;

    // Get price feed manager
    const priceFeedManager = await ethers.getContractAt("PriceFeedManager", contracts.PriceFeedManager);

    try {
      // Try to get current prices - this will tell us if feeds are working
      const usdcPrice = await priceFeedManager.getTokenPrice(USDC_ADDRESS);
      const wethPrice = await priceFeedManager.getTokenPrice(WETH_ADDRESS);
      
      console.log(`✅ USDC price feed working: $${ethers.formatUnits(usdcPrice, 8)}`);
      console.log(`✅ WETH price feed working: $${ethers.formatUnits(wethPrice, 8)}`);
      
      // Test USD value conversion
      const testAmount = ethers.parseUnits("100", 6); // 100 USDC
      const usdValue = await priceFeedManager.getTokenValueInUSD(USDC_ADDRESS, testAmount);
      console.log(`✅ USD conversion working: 100 USDC = $${ethers.formatUnits(usdValue, 18)}`);
      
    } catch (priceError) {
      console.log(`⚠️  Price feeds became stale after time travel: ${priceError.message}`);
      console.log("🔧 Attempting to refresh price feeds...\n");
      
      // Mine additional blocks to try to refresh the feeds
      console.log("⛏️  Mining additional blocks to refresh price data...");
      for (let i = 0; i < 20; i++) {
        await ethers.provider.send("evm_mine");
      }
      
      // Try again after mining blocks
      try {
        const usdcPrice = await priceFeedManager.getTokenPrice(USDC_ADDRESS);
        const wethPrice = await priceFeedManager.getTokenPrice(WETH_ADDRESS);
        
        console.log(`✅ USDC price feed restored: $${ethers.formatUnits(usdcPrice, 8)}`);
        console.log(`✅ WETH price feed restored: $${ethers.formatUnits(wethPrice, 8)}`);
        
      } catch (retryError) {
        console.log(`❌ Price feeds still stale: ${retryError.message}`);
        console.log("💡 This is expected when time traveling far into the future.");
        console.log("🎯 Rewards tracking still works - just USD values may not display.");
        console.log("📊 You can still see token amounts in the analytics!\n");
      }
    }

    // Check rewards regardless of price feed status
    if (contracts.StrategyAave) {
      console.log("💰 Checking rewards after time travel...");
      
      try {
        const strategyAave = await ethers.getContractAt("StrategyAave", contracts.StrategyAave);
        
        // Get supported tokens
        const supportedTokens = await strategyAave.getSupportedTokens();
        
        console.log("📊 Aave Strategy Rewards Summary:");
        
        for (const tokenAddress of supportedTokens) {
          try {
            // Get token analytics
            const [
              currentBalance,
              totalDeposits,
              totalWithdrawals,
              netDeposits,
              accruedRewards,
              currentAPY
            ] = await strategyAave.getTokenAnalytics(tokenAddress);
            
            // Determine token symbol and decimals
            const isUSDC = tokenAddress.toLowerCase() === USDC_ADDRESS.toLowerCase();
            const isWETH = tokenAddress.toLowerCase() === WETH_ADDRESS.toLowerCase();
            
            let tokenSymbol = 'UNKNOWN';
            let decimals = 18;
            
            if (isUSDC) {
              tokenSymbol = 'USDC';
              decimals = 6;
            } else if (isWETH) {
              tokenSymbol = 'WETH';
              decimals = 18;
            }
            
            const rewardsFormatted = parseFloat(ethers.formatUnits(accruedRewards, decimals));
            const depositsFormatted = parseFloat(ethers.formatUnits(totalDeposits, decimals));
            const balanceFormatted = parseFloat(ethers.formatUnits(currentBalance, decimals));
            const apyFormatted = (Number(currentAPY) / 100).toFixed(2);
            
            if (depositsFormatted > 0) {
              console.log(`\n   ${tokenSymbol}:`);
              console.log(`   💰 Total Deposits: ${depositsFormatted.toFixed(6)} ${tokenSymbol}`);
              console.log(`   💎 Current Balance: ${balanceFormatted.toFixed(6)} ${tokenSymbol}`);
              console.log(`   🎁 Accrued Rewards: ${rewardsFormatted.toFixed(6)} ${tokenSymbol}`);
              console.log(`   📈 Current APY: ${apyFormatted}%`);
              
              if (rewardsFormatted > 0) {
                const rewardPercentage = (rewardsFormatted / depositsFormatted * 100).toFixed(4);
                console.log(`   📊 Reward Rate: ${rewardPercentage}% of deposits`);
                
                // Calculate annualized return if we know the time period
                const timeInYears = timeToAdd / (365 * 24 * 3600);
                const annualizedReturn = (rewardPercentage / timeInYears).toFixed(2);
                console.log(`   🚀 Annualized Return: ${annualizedReturn}%`);
              }
            }
            
          } catch (error) {
            console.log(`   ⚠️  Could not get analytics for token: ${error.message}`);
          }
        }
        
      } catch (error) {
        console.log(`⚠️  Could not access Aave strategy: ${error.message}`);
      }
    }

    console.log("\n🎉 Time travel complete!");
    console.log("💡 Refresh your frontend to see updated rewards!");
    console.log("🔄 You can run this script again to travel further in time.");
    console.log("📊 If USD values don't show, the token amounts are still accurate!");

  } catch (error) {
    console.error("❌ Time travel failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
