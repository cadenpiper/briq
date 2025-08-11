/**
 * Time Travel Script - Fast Forward Time for Rewards Testing
 * 
 * This script allows you to fast-forward time on the forked network to see
 * rewards accrual in action. It focuses on testing rewards functionality
 * without worrying about price feed staleness (development-only issue).
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

    // Check rewards from both strategies
    if (fs.existsSync('./deployment.json')) {
      console.log("💰 Checking rewards after time travel...");
      
      const deploymentData = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
      const contracts = deploymentData.contracts;
      
      const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
      const chainConfig = configData.CHAIN_CONFIG["31337"];
      const { usdcAddress: USDC_ADDRESS, wethAddress: WETH_ADDRESS } = chainConfig;

      // Check Aave Strategy Rewards
      if (contracts.StrategyAave) {
        console.log("📊 Aave Strategy Rewards:");
        await checkStrategyRewards(contracts.StrategyAave, "StrategyAave", USDC_ADDRESS, WETH_ADDRESS);
      }

      // Check Compound Strategy Rewards
      if (contracts.StrategyCompoundComet) {
        console.log("\n📊 Compound Strategy Rewards:");
        await checkCompoundStrategyRewards(contracts.StrategyCompoundComet, USDC_ADDRESS, WETH_ADDRESS);
      }
    }

    console.log("\n🎉 Time travel complete!");
    console.log("💡 Refresh your frontend to see updated rewards!");
    console.log("🔄 You can run this script again to travel further in time.");
    console.log("📊 Note: USD values may not display due to stale price feeds (development only)");

  } catch (error) {
    console.error("❌ Time travel failed:", error.message);
    process.exit(1);
  }
}

async function checkStrategyRewards(strategyAddress, strategyName, USDC_ADDRESS, WETH_ADDRESS) {
  try {
    const strategy = await ethers.getContractAt(strategyName, strategyAddress);
    const supportedTokens = await strategy.getSupportedTokens();
    
    for (const tokenAddress of supportedTokens) {
      try {
        const [
          currentBalance,
          totalDeposits,
          totalWithdrawals,
          netDeposits,
          accruedRewards,
          currentAPY
        ] = await strategy.getTokenAnalytics(tokenAddress);
        
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
          }
        }
        
      } catch (error) {
        console.log(`   ⚠️  Could not get analytics for token: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`⚠️  Could not access ${strategyName}: ${error.message}`);
  }
}

async function checkCompoundStrategyRewards(strategyAddress, USDC_ADDRESS, WETH_ADDRESS) {
  try {
    const strategy = await ethers.getContractAt("StrategyCompoundComet", strategyAddress);
    const [supportedTokens, analyticsArray] = await strategy.getAllTokenAnalytics();
    
    for (let i = 0; i < supportedTokens.length; i++) {
      const tokenAddress = supportedTokens[i];
      const analytics = analyticsArray[i];
      
      const [
        currentBalance,
        totalDeposits,
        totalWithdrawals,
        netDeposits,
        interestRewards,
        protocolRewards,
        currentAPY
      ] = analytics;
      
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
      
      const interestRewardsFormatted = parseFloat(ethers.formatUnits(interestRewards, decimals));
      const protocolRewardsFormatted = parseFloat(ethers.formatUnits(protocolRewards, 6)); // Protocol rewards scaled by 10^6
      const depositsFormatted = parseFloat(ethers.formatUnits(totalDeposits, decimals));
      const balanceFormatted = parseFloat(ethers.formatUnits(currentBalance, decimals));
      const apyFormatted = (Number(currentAPY) / 100).toFixed(2);
      
      if (depositsFormatted > 0) {
        console.log(`\n   ${tokenSymbol}:`);
        console.log(`   💰 Total Deposits: ${depositsFormatted.toFixed(6)} ${tokenSymbol}`);
        console.log(`   💎 Current Balance: ${balanceFormatted.toFixed(6)} ${tokenSymbol}`);
        console.log(`   🎁 Interest Rewards: ${interestRewardsFormatted.toFixed(6)} ${tokenSymbol}`);
        console.log(`   🏆 Protocol Rewards: ${protocolRewardsFormatted.toFixed(6)} COMP`);
        console.log(`   📈 Current APY: ${apyFormatted}%`);
        
        if (interestRewardsFormatted > 0) {
          const rewardPercentage = (interestRewardsFormatted / depositsFormatted * 100).toFixed(4);
          console.log(`   📊 Interest Rate: ${rewardPercentage}% of deposits`);
        }
      }
    }
    
  } catch (error) {
    console.log(`⚠️  Could not access Compound strategy: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
