const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Checking balances for:", deployer.address);
  
  // USDC contract
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  
  // WETH contract  
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
  
  try {
    const usdcBalance = await usdc.balanceOf(deployer.address);
    const wethBalance = await weth.balanceOf(deployer.address);
    const ethBalance = await ethers.provider.getBalance(deployer.address);
    
    console.log("ETH Balance:", ethers.formatEther(ethBalance));
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    console.log("WETH Balance:", ethers.formatUnits(wethBalance, 18));
    
    if (usdcBalance === 0n) {
      console.log("\n❌ USDC balance is 0 - the configuration script may not have run properly");
    } else {
      console.log("\n✅ USDC balance found - MetaMask might need to be refreshed or tokens re-imported");
    }
    
  } catch (error) {
    console.error("Error checking balances:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
