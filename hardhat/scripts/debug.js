const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🔍 Debugging Contract State\n");
  
  // Load deployment addresses
  const deploymentData = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  const contracts = deploymentData.contracts;
  
  console.log("📋 Contract Addresses:");
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });
  
  // Get contract instances
  const vault = await ethers.getContractAt("BriqVault", contracts.BriqVault);
  const shares = await ethers.getContractAt("BriqShares", contracts.BriqShares);
  
  console.log("\n🔧 Vault Functions:");
  const vaultFunctions = Object.keys(vault.interface.functions);
  vaultFunctions.forEach(func => console.log(`   ${func}`));
  
  console.log("\n📊 Contract State:");
  try {
    const sharesAddress = await vault.sharesToken();
    console.log(`   Vault shares token: ${sharesAddress}`);
    
    const coordinatorAddress = await vault.strategyCoordinator();
    console.log(`   Vault coordinator: ${coordinatorAddress}`);
    
    const vaultAddress = await shares.vault();
    console.log(`   Shares vault: ${vaultAddress}`);
    
  } catch (error) {
    console.log(`   Error reading state: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  });
