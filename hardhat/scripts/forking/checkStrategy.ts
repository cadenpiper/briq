import { network } from "hardhat";

async function main() {
  const STRATEGY_COORDINATOR = "0x290e709e7f0b691ebc106639b405f329a39ead8d";
  const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const usdcAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  console.log("\n📊 Current Strategy Settings:");
  console.log("================================");

  // Read tokenToStrategy mapping
  const wethStrategy = await publicClient.readContract({
    address: STRATEGY_COORDINATOR as `0x${string}`,
    abi: [{
      name: "tokenToStrategy",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "_token", type: "address" }],
      outputs: [{ name: "", type: "uint8" }]
    }],
    functionName: "tokenToStrategy",
    args: [wethAddress as `0x${string}`]
  });

  const usdcStrategy = await publicClient.readContract({
    address: STRATEGY_COORDINATOR as `0x${string}`,
    abi: [{
      name: "tokenToStrategy",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "_token", type: "address" }],
      outputs: [{ name: "", type: "uint8" }]
    }],
    functionName: "tokenToStrategy",
    args: [usdcAddress as `0x${string}`]
  });

  console.log(`WETH Strategy: ${wethStrategy === 0 ? "Aave V3" : "Compound V3"} (${wethStrategy})`);
  console.log(`USDC Strategy: ${usdcStrategy === 0 ? "Aave V3" : "Compound V3"} (${usdcStrategy})`);

  // Get APYs
  const wethAPY = await publicClient.readContract({
    address: STRATEGY_COORDINATOR as `0x${string}`,
    abi: [{
      name: "getStrategyAPY",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "_token", type: "address" }],
      outputs: [{ name: "apy", type: "uint256" }]
    }],
    functionName: "getStrategyAPY",
    args: [wethAddress as `0x${string}`]
  });

  const usdcAPY = await publicClient.readContract({
    address: STRATEGY_COORDINATOR as `0x${string}`,
    abi: [{
      name: "getStrategyAPY",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "_token", type: "address" }],
      outputs: [{ name: "apy", type: "uint256" }]
    }],
    functionName: "getStrategyAPY",
    args: [usdcAddress as `0x${string}`]
  });

  console.log("\n📈 Current APYs:");
  console.log(`WETH APY: ${(Number(wethAPY) / 100).toFixed(2)}%`);
  console.log(`USDC APY: ${(Number(usdcAPY) / 100).toFixed(2)}%\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
