// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/BriqVault.sol";
import "../contracts/BriqShares.sol";
import "../contracts/PriceFeedManager.sol";
import "../contracts/StrategyCoordinator.sol";
import "../contracts/strategies/StrategyAave.sol";
import "../contracts/strategies/StrategyCompoundComet.sol";
import "../contracts/BriqTimelock.sol";

contract BriqVaultTest is Test {
    BriqVault vault;
    BriqShares briqShares;
    PriceFeedManager priceFeedManager;
    StrategyCoordinator coordinator;
    StrategyAave strategyAave;
    StrategyCompoundComet strategyCompound;
    BriqTimelock timelock;
    
    address owner = address(0x1);
    address user1 = address(0x2);
    address user2 = address(0x3);
    address token1 = address(0x4);
    address token2 = address(0x5);
    address pythContract = address(0x6);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy core contracts
        timelock = new BriqTimelock(owner);
        priceFeedManager = new PriceFeedManager(address(timelock), pythContract);
        briqShares = new BriqShares("Briq Shares", "BRIQ");
        
        // Deploy strategies
        strategyAave = new StrategyAave();
        strategyCompound = new StrategyCompoundComet();
        
        // Deploy coordinator
        coordinator = new StrategyCoordinator(
            address(strategyAave),
            address(strategyCompound),
            address(timelock)
        );
        
        // Deploy vault
        vault = new BriqVault(
            address(coordinator),
            address(briqShares),
            address(priceFeedManager),
            address(timelock)
        );
        
        // Configure shares
        briqShares.setVault(address(vault));
        
        vm.stopPrank();
    }
    
    function testDeployment() public view {
        assertEq(address(vault.strategyCoordinator()), address(coordinator));
        assertEq(address(vault.briqShares()), address(briqShares));
        assertEq(address(vault.priceFeedManager()), address(priceFeedManager));
        assertEq(vault.timelock(), address(timelock));
        assertEq(vault.maxSlippageBps(), 20); // 0.2%
    }
    
    function testPauseUnpause() public {
        vm.prank(owner);
        vault.pause();
        assertTrue(vault.paused());
        
        vm.prank(owner);
        vault.unpause();
        assertFalse(vault.paused());
    }
    
    function testUpdateMaxSlippage() public {
        vm.prank(owner);
        vault.updateMaxSlippage(50); // 0.5%
        assertEq(vault.maxSlippageBps(), 50);
    }
    
    function testUpdateMaxSlippageRevertsOnExcessiveSlippage() public {
        vm.prank(owner);
        vm.expectRevert(Errors.InvalidAmount.selector);
        vault.updateMaxSlippage(301); // > 3%
    }
    

    
    // Fuzz Tests
    function testFuzzUpdateMaxSlippage(uint256 _slippageBps) public {
        vm.assume(_slippageBps <= 300); // Max 3%
        
        vm.prank(owner);
        vault.updateMaxSlippage(_slippageBps);
        assertEq(vault.maxSlippageBps(), _slippageBps);
    }
    

    
    function testFuzzAccessControl(address _caller) public {
        vm.assume(_caller != owner);
        vm.assume(_caller != address(timelock));
        
        // Non-owner should not be able to call admin functions
        vm.prank(_caller);
        vm.expectRevert();
        vault.pause();
        
        vm.prank(_caller);
        vm.expectRevert();
        vault.unpause();
        
        vm.prank(_caller);
        vm.expectRevert();
        vault.updateMaxSlippage(50);
        
        vm.prank(_caller);
        vm.expectRevert();
        vault.emergencyWithdraw(token1, 1000, _caller);
    }
    
    function testFuzzDepositValidation(address _token, uint256 _amount) public {
        vm.assume(_token != address(0));
        
        if (_amount == 0) {
            // Zero amount should revert
            vm.prank(user1);
            vm.expectRevert(Errors.InvalidAmount.selector);
            vault.deposit(_token, _amount);
        } else {
            // Non-zero amounts should revert due to no price feed
            vm.prank(user1);
            vm.expectRevert(Errors.PriceFeedNotFound.selector);
            vault.deposit(_token, _amount);
        }
    }
    
    function testFuzzWithdrawValidation(address _token, uint256 _shares, uint256 _minAmountOut) public {
        vm.assume(_token != address(0));
        
        if (_shares == 0) {
            // Zero shares should revert
            vm.prank(user1);
            vm.expectRevert(Errors.InvalidAmount.selector);
            vault.withdraw(_token, _shares, _minAmountOut);
        } else {
            // Non-zero shares should revert due to insufficient balance
            vm.prank(user1);
            vm.expectRevert(Errors.InvalidShares.selector);
            vault.withdraw(_token, _shares, _minAmountOut);
        }
    }
    
    function testFuzzEmergencyWithdraw(address _token, uint256 _amount, address _recipient) public {
        vm.assume(_token != address(0));
        vm.assume(_recipient != address(0));
        vm.assume(_amount > 0);
        
        // Should revert for non-owner
        vm.prank(user1);
        vm.expectRevert();
        vault.emergencyWithdraw(_token, _amount, _recipient);
        
        // Should work for owner (but will revert due to no tokens)
        vm.prank(owner);
        vm.expectRevert();
        vault.emergencyWithdraw(_token, _amount, _recipient);
    }
    
    function testFuzzCheckWithdrawalAvailability(address _token, uint256 _shares) public view {
        (bool canWithdrawFull, uint256 availableAmount, uint256 idealAmount) = 
            vault.checkWithdrawalAvailability(_token, _shares);
        
        if (_shares == 0) {
            assertFalse(canWithdrawFull);
            assertEq(availableAmount, 0);
            assertEq(idealAmount, 0);
        } else {
            // With no deposits, should return false and zeros
            assertFalse(canWithdrawFull);
            assertEq(availableAmount, 0);
            assertEq(idealAmount, 0);
        }
    }
    
    function testFuzzGetTotalVaultValueInUSD() public view {
        // Should return 0 with no deposits
        uint256 totalValue = vault.getTotalVaultValueInUSD();
        assertEq(totalValue, 0);
    }
    
    function testFuzzGetSupportedTokens() public view {
        // Should return empty array initially
        address[] memory supportedTokens = vault.getSupportedTokens();
        assertEq(supportedTokens.length, 0);
    }
    
    function testFuzzPauseWhenPaused() public {
        vm.startPrank(owner);
        vault.pause();
        
        // Should revert when pausing already paused contract
        vm.expectRevert();
        vault.pause();
        
        vm.stopPrank();
    }
    
    function testFuzzUnpauseWhenNotPaused() public {
        vm.startPrank(owner);
        
        // Should revert when unpausing already unpaused contract
        vm.expectRevert();
        vault.unpause();
        
        vm.stopPrank();
    }
    
    function testFuzzSlippageValidation(uint256 _slippageBps) public {
        if (_slippageBps > 300) {
            // Should revert for excessive slippage
            vm.prank(owner);
            vm.expectRevert(Errors.InvalidAmount.selector);
            vault.updateMaxSlippage(_slippageBps);
        } else {
            // Should work for valid slippage
            vm.prank(owner);
            vault.updateMaxSlippage(_slippageBps);
            assertEq(vault.maxSlippageBps(), _slippageBps);
        }
    }
    
    function testFuzzBoundaryConditions(uint256 _amount, uint256 _shares) public {
        // Test with maximum values
        if (_amount == type(uint256).max) {
            vm.prank(user1);
            vm.expectRevert(Errors.PriceFeedNotFound.selector);
            vault.deposit(token1, _amount);
        }
        
        if (_shares == type(uint256).max) {
            vm.prank(user1);
            vm.expectRevert(Errors.InvalidShares.selector);
            vault.withdraw(token1, _shares, 0);
        }
    }
    
    function testFuzzEventEmission(uint256 _slippageBps, address _newManager) public {
        vm.assume(_slippageBps <= 300);
        vm.assume(_newManager != address(0));
        
        vm.startPrank(owner);
        
        // Test SlippageUpdated event
        vm.expectEmit(true, true, false, true);
        emit BriqVault.SlippageUpdated(vault.maxSlippageBps(), _slippageBps);
        vault.updateMaxSlippage(_slippageBps);
        
        vm.stopPrank();
    }
    
    function testFuzzConstructorValidation(
        address _coordinator,
        address _briqShares,
        address _priceFeedManager,
        address _timelock
    ) public {
        // Test zero address validation in constructor
        if (_coordinator == address(0) || _briqShares == address(0) || 
            _priceFeedManager == address(0) || _timelock == address(0)) {
            
            vm.expectRevert(Errors.InvalidAddress.selector);
            new BriqVault(_coordinator, _briqShares, _priceFeedManager, _timelock);
        } else {
            // Should deploy successfully with valid addresses
            BriqVault newVault = new BriqVault(_coordinator, _briqShares, _priceFeedManager, _timelock);
            assertEq(address(newVault.strategyCoordinator()), _coordinator);
            assertEq(address(newVault.briqShares()), _briqShares);
            assertEq(address(newVault.priceFeedManager()), _priceFeedManager);
            assertEq(newVault.timelock(), _timelock);
        }
    }
    
    function testFuzzTimelockAccess(address _caller) public {
        vm.assume(_caller != owner);
        
        // Timelock should be able to call admin functions
        if (_caller == address(timelock)) {
            vm.prank(_caller);
            vault.pause();
            assertTrue(vault.paused());
            
            vm.prank(_caller);
            vault.unpause();
            assertFalse(vault.paused());
        } else {
            // Non-timelock should not be able to call admin functions
            vm.prank(_caller);
            vm.expectRevert();
            vault.pause();
        }
    }
}
