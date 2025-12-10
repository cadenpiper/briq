import { network } from "hardhat";

async function main() {
  // Compound V3 WETH market on Arbitrum
  const COMPOUND_WETH_MARKET = "0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486";

  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  console.log("\n📊 Compound V3 WETH Market (Arbitrum One):");
  console.log("===========================================");
  console.log(`Market Address: ${COMPOUND_WETH_MARKET}\n`);

  // Get utilization
  const utilization = await publicClient.readContract({
    address: COMPOUND_WETH_MARKET as `0x${string}`,
    abi: [{
      name: "getUtilization",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }]
    }],
    functionName: "getUtilization"
  });

  console.log(`Utilization: ${(Number(utilization) / 1e18 * 100).toFixed(2)}%`);

  // Get supply rate
  const supplyRate = await publicClient.readContract({
    address: COMPOUND_WETH_MARKET as `0x${string}`,
    abi: [{
      name: "getSupplyRate",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "utilization", type: "uint256" }],
      outputs: [{ name: "", type: "uint64" }]
    }],
    functionName: "getSupplyRate",
    args: [utilization]
  });

  console.log(`Supply Rate (per second): ${supplyRate}`);

  // Calculate APY
  const secondsPerYear = 365 * 24 * 60 * 60;
  const aprBasisPoints = (Number(supplyRate) * secondsPerYear * 10000) / 1e18;
  const apyPercent = aprBasisPoints / 100;

  console.log(`\nCalculated APY: ${apyPercent.toFixed(2)}%`);
  console.log(`APY in basis points: ${aprBasisPoints.toFixed(0)}\n`);

  // Also check total supply and total borrow for context
  const totalSupply = await publicClient.readContract({
    address: COMPOUND_WETH_MARKET as `0x${string}`,
    abi: [{
      name: "totalSupply",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }]
    }],
    functionName: "totalSupply"
  });

  const totalBorrow = await publicClient.readContract({
    address: COMPOUND_WETH_MARKET as `0x${string}`,
    abi: [{
      name: "totalBorrow",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }]
    }],
    functionName: "totalBorrow"
  });

  console.log(`Total Supply: ${(Number(totalSupply) / 1e18).toFixed(2)} WETH`);
  console.log(`Total Borrow: ${(Number(totalBorrow) / 1e18).toFixed(2)} WETH\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
