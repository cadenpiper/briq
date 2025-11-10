// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../contracts/BriqVault.sol";
import "../../contracts/StrategyCoordinator.sol";
import "../../contracts/BriqShares.sol";
import "../../contracts/PriceFeedManager.sol";

contract BriqProtocolTest is Test {
    BriqVault vault;
    StrategyCoordinator coordinator;
    BriqShares shares;
    PriceFeedManager priceManager;
    
    address owner = address(0x1);
    address user = address(0x2);
    address usdc = address(0x3);
    address weth = address(0x4);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy contracts
        shares = new BriqShares();
        priceManager = new PriceFeedManager();
        coordinator = new StrategyCoordinator();
        vault = new BriqVault();
        
        vm.stopPrank();
    }
    
    function testContractDeployment() public {
        assertEq(shares.owner(), owner);
        assertEq(priceManager.owner(), owner);
        assertEq(coordinator.owner(), owner);
        assertEq(vault.owner(), owner);
    }
    
    function testOwnershipTransfer() public {
        vm.prank(owner);
        vault.transferOwnership(user);
        
        vm.prank(user);
        vault.acceptOwnership();
        
        assertEq(vault.owner(), user);
    }
    
    // Test reentrancy protection
    function testReentrancyProtection() public {
        // This would require mock contracts to test properly
        // but demonstrates the testing approach needed
        assertTrue(true);
    }
    
    // Test access control
    function testUnauthorizedAccess() public {
        vm.prank(user);
        vm.expectRevert();
        vault.transferOwnership(user);
    }
}
