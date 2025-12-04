// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/StrategyCoordinator.sol";
import "../contracts/strategies/StrategyAave.sol";
import "../contracts/strategies/StrategyCompoundComet.sol";
import "../contracts/BriqTimelock.sol";

contract StrategyCoordinatorTest is Test {
    StrategyCoordinator coordinator;
    StrategyAave strategyAave;
    StrategyCompoundComet strategyCompound;
    BriqTimelock timelock;
    
    address owner = address(0x1);
    address vault = address(0x2);
    address rupert = address(0x3);
    address token1 = address(0x4);
    address token2 = address(0x5);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy timelock
        timelock = new BriqTimelock(owner);
        
        // Deploy strategies
        strategyAave = new StrategyAave();
        strategyCompound = new StrategyCompoundComet();
        
        // Deploy coordinator
        coordinator = new StrategyCoordinator(
            address(strategyAave),
            address(strategyCompound),
            address(timelock)
        );
        
        // Configure coordinator
        coordinator.updateVaultAddress(vault);
        
        vm.stopPrank();
    }
    
    function testDeployment() public view {
        assertEq(address(coordinator.strategyAave()), address(strategyAave));
        assertEq(address(coordinator.strategyCompound()), address(strategyCompound));
        assertEq(coordinator.timelock(), address(timelock));
        assertEq(coordinator.vault(), vault);
    }
    
    function testSetRupertRevertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(Errors.InvalidAddress.selector);
        coordinator.setRupert(address(0));
    }
    
    function testSetRupert() public {
        vm.prank(owner);
        coordinator.setRupert(rupert);
        assertEq(coordinator.rupert(), rupert);
    }
    
    function testUpdateVaultAddressRevertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(Errors.InvalidAddress.selector);
        coordinator.updateVaultAddress(address(0));
    }
    
    function testUpdateVaultAddress() public {
        address newVault = address(0x999);
        vm.prank(owner);
        coordinator.updateVaultAddress(newVault);
        assertEq(coordinator.vault(), newVault);
    }
    
    // Fuzz Tests
    function testFuzzSetRupert(address _rupert) public {
        vm.assume(_rupert != address(0));
        
        vm.prank(owner);
        coordinator.setRupert(_rupert);
        assertEq(coordinator.rupert(), _rupert);
    }
    
    function testFuzzUpdateVaultAddress(address _vault) public {
        vm.assume(_vault != address(0));
        
        vm.prank(owner);
        coordinator.updateVaultAddress(_vault);
        assertEq(coordinator.vault(), _vault);
    }
    
    function testFuzzGetStrategyBalance(address _token) public view {
        // Should return 0 for unsupported tokens
        uint256 balance = coordinator.getStrategyBalance(_token);
        assertEq(balance, 0);
    }
    
    function testFuzzGetStrategyAPY(address _token) public view {
        // Should return 0 for unsupported tokens
        uint256 apy = coordinator.getStrategyAPY(_token);
        assertEq(apy, 0);
    }
    
    function testFuzzGetTotalTokenBalance(address _token) public view {
        // Should return 0 for tokens with no balance
        uint256 balance = coordinator.getTotalTokenBalance(_token);
        assertEq(balance, 0);
    }
    
    function testFuzzIsStrategyAvailable(uint8 _strategyType, address _token) public view {
        vm.assume(_strategyType <= 1);
        
        StrategyCoordinator.StrategyType strategyType = StrategyCoordinator.StrategyType(_strategyType);
        
        // Should return false for unsupported tokens or unavailable strategies
        bool available = coordinator.isStrategyAvailable(strategyType, _token);
        assertFalse(available);
    }
    
    function testFuzzGetAvailableLiquidity(address _token) public view {
        (uint256 total, uint256 aave, uint256 compound) = coordinator.getAvailableLiquidity(_token);
        
        // Should all be 0 for tokens with no liquidity
        assertEq(total, 0);
        assertEq(aave, 0);
        assertEq(compound, 0);
    }
    
    function testFuzzAccessControl(address _caller, address _token, uint256 _amount) public {
        vm.assume(_caller != owner);
        vm.assume(_caller != vault);
        vm.assume(_token != address(0));
        vm.assume(_amount > 0);
        
        // Non-owner should not be able to call owner functions
        vm.prank(_caller);
        vm.expectRevert();
        coordinator.setRupert(address(0x999));
        
        vm.prank(_caller);
        vm.expectRevert();
        coordinator.updateVaultAddress(address(0x999));
        
        vm.prank(_caller);
        vm.expectRevert();
        coordinator.emergencyWithdraw(_token);
        
        // Non-vault should not be able to call vault functions
        if (_caller != vault) {
            vm.prank(_caller);
            vm.expectRevert();
            coordinator.deposit(_token, _amount);
            
            vm.prank(_caller);
            vm.expectRevert();
            coordinator.withdraw(_token, _amount);
            
            vm.prank(_caller);
            vm.expectRevert();
            coordinator.emergencyWithdrawFromStrategy(_token, _amount, StrategyCoordinator.StrategyType.AAVE);
        }
    }
    
    function testFuzzUnsupportedTokenOperations(address _token, uint256 _amount) public {
        vm.assume(_token != address(0));
        vm.assume(_amount > 0);
        
        // Operations on unsupported tokens should revert
        vm.prank(vault);
        vm.expectRevert(Errors.UnsupportedToken.selector);
        coordinator.deposit(_token, _amount);
        
        vm.prank(vault);
        vm.expectRevert(Errors.UnsupportedToken.selector);
        coordinator.withdraw(_token, _amount);
        
        // Emergency withdraw from strategy doesn't check coordinator token support
        // It will attempt withdrawal but likely return 0 (no revert expected)
        vm.prank(vault);
        coordinator.emergencyWithdrawFromStrategy(_token, _amount, StrategyCoordinator.StrategyType.AAVE);
    }
    
    function testFuzzZeroAmountOperations(address _token) public {
        vm.assume(_token != address(0));
        
        // Zero amount operations should revert
        vm.prank(vault);
        vm.expectRevert();
        coordinator.deposit(_token, 0);
        
        vm.prank(vault);
        vm.expectRevert();
        coordinator.withdraw(_token, 0);
    }
    
    function testFuzzGetSupportedTokens() public view {
        // Initially should be empty
        address[] memory supportedTokens = coordinator.getSupportedTokens();
        assertEq(supportedTokens.length, 0);
    }
    
    function testFuzzOwnershipValidation(address _caller) public {
        vm.assume(_caller != owner);
        
        // Non-owner should not be able to call owner-only functions
        vm.prank(_caller);
        vm.expectRevert();
        coordinator.setRupert(address(0x999));
        
        vm.prank(_caller);
        vm.expectRevert();
        coordinator.updateVaultAddress(address(0x999));
        
        vm.prank(_caller);
        vm.expectRevert();
        coordinator.emergencyWithdraw(token1);
    }
    
    function testFuzzVaultValidation(address _caller, address _token, uint256 _amount) public {
        vm.assume(_caller != vault);
        vm.assume(_token != address(0));
        vm.assume(_amount > 0);
        
        // Non-vault should not be able to call vault-only functions
        vm.prank(_caller);
        vm.expectRevert();
        coordinator.deposit(_token, _amount);
        
        vm.prank(_caller);
        vm.expectRevert();
        coordinator.withdraw(_token, _amount);
        
        vm.prank(_caller);
        vm.expectRevert();
        coordinator.emergencyWithdrawFromStrategy(_token, _amount, StrategyCoordinator.StrategyType.AAVE);
    }
    
    function testFuzzStrategyTypeEnumValidation(uint8 _strategyType, address _token) public view {
        // Only test valid strategy types (0 and 1)
        if (_strategyType <= 1) {
            StrategyCoordinator.StrategyType strategyType = StrategyCoordinator.StrategyType(_strategyType);
            
            // Should not revert for valid strategy types
            bool available = coordinator.isStrategyAvailable(strategyType, _token);
            // Available will be false since token is not supported, but should not revert
            assertFalse(available);
        }
    }
    
    function testFuzzAddressValidation(address _address) public {
        if (_address == address(0)) {
            // Zero address should revert for critical functions
            vm.prank(owner);
            vm.expectRevert(Errors.InvalidAddress.selector);
            coordinator.setRupert(_address);
            
            vm.prank(owner);
            vm.expectRevert(Errors.InvalidAddress.selector);
            coordinator.updateVaultAddress(_address);
        } else {
            // Non-zero addresses should work
            vm.prank(owner);
            coordinator.setRupert(_address);
            assertEq(coordinator.rupert(), _address);
            
            vm.prank(owner);
            coordinator.updateVaultAddress(_address);
            assertEq(coordinator.vault(), _address);
        }
    }
    
    function testFuzzViewFunctionsSafety(address _token, address _priceFeedManager) public view {
        // View functions should never revert and always return safe values
        uint256 balance = coordinator.getStrategyBalance(_token);
        uint256 apy = coordinator.getStrategyAPY(_token);
        uint256 totalBalance = coordinator.getTotalTokenBalance(_token);
        
        // For unsupported tokens, these should be 0
        assertEq(balance, 0);
        assertEq(apy, 0);
        assertEq(totalBalance, 0);
        
        // Liquidity check should also be safe
        (uint256 total, uint256 aave, uint256 compound) = coordinator.getAvailableLiquidity(_token);
        assertEq(total, 0);
        assertEq(aave, 0);
        assertEq(compound, 0);
        
        // Strategy availability should be false for unsupported tokens
        bool aaveAvailable = coordinator.isStrategyAvailable(StrategyCoordinator.StrategyType.AAVE, _token);
        bool compoundAvailable = coordinator.isStrategyAvailable(StrategyCoordinator.StrategyType.COMPOUND, _token);
        assertFalse(aaveAvailable);
        assertFalse(compoundAvailable);
        
        // Supported tokens array should be consistent
        address[] memory supportedTokens = coordinator.getSupportedTokens();
        // Initially empty
        assertEq(supportedTokens.length, 0);
    }
    
    function testFuzzBoundaryConditions(uint256 _amount) public {
        address testToken = address(0x123);
        
        if (_amount == 0) {
            // Zero amounts should be rejected
            vm.prank(vault);
            vm.expectRevert();
            coordinator.deposit(testToken, _amount);
            
            vm.prank(vault);
            vm.expectRevert();
            coordinator.withdraw(testToken, _amount);
        } else if (_amount == type(uint256).max) {
            // Max uint256 should be handled gracefully (will revert due to unsupported token)
            vm.prank(vault);
            vm.expectRevert(Errors.UnsupportedToken.selector);
            coordinator.deposit(testToken, _amount);
            
            vm.prank(vault);
            vm.expectRevert(Errors.UnsupportedToken.selector);
            coordinator.withdraw(testToken, _amount);
        } else {
            // Normal amounts should revert due to unsupported token
            vm.prank(vault);
            vm.expectRevert(Errors.UnsupportedToken.selector);
            coordinator.deposit(testToken, _amount);
            
            vm.prank(vault);
            vm.expectRevert(Errors.UnsupportedToken.selector);
            coordinator.withdraw(testToken, _amount);
        }
    }
}
