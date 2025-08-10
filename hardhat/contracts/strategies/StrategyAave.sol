// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../StrategyBase.sol";
import { Errors } from "../libraries/Errors.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/protocol/libraries/types/DataTypes.sol";

contract StrategyAave is StrategyBase, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    address public aavePool;
    address[] public supportedTokens;
    mapping(address => bool) public isTokenSupported;
    mapping(address => address) public tokenToAToken; // token => aToken

    event AavePoolUpdated(address indexed pool);
    event TokenSupportUpdated(address indexed token, bool status);
    event CoordinatorUpdated(address indexed coordinator);

    constructor() StrategyBase() Ownable(msg.sender) {}

    function setCoordinator(address _coordinator) external override onlyOwner {
        if (_coordinator == address(0)) revert Errors.InvalidAddress();
        if (_coordinator == coordinator) revert Errors.SameCoordinator();

        coordinator = _coordinator;

        emit CoordinatorUpdated(_coordinator);
    }

    function setAavePool(address _pool) external onlyOwner {
        if (_pool == address(0)) revert Errors.InvalidAddress();
        aavePool = _pool;
        emit AavePoolUpdated(_pool);
    }

    function addSupportedToken(address _token) external onlyOwner {
        if (_token == address(0)) revert Errors.InvalidAddress();
        if (aavePool == address(0)) revert Errors.NoPoolForToken();
        if (isTokenSupported[_token]) revert Errors.TokenSupportUnchanged();

        // Get aToken address from Aave pool
        DataTypes.ReserveData memory data = IPool(aavePool).getReserveData(_token);
        if (data.aTokenAddress == address(0)) revert Errors.UnsupportedTokenForPool();

        supportedTokens.push(_token);
        isTokenSupported[_token] = true;
        tokenToAToken[_token] = data.aTokenAddress;

        emit TokenSupportUpdated(_token, true);
    }

    function removeSupportedToken(address _token) external onlyOwner {
        if (_token == address(0)) revert Errors.InvalidAddress();
        if (!isTokenSupported[_token]) revert Errors.TokenSupportUnchanged();

        // Remove from supportedTokens array
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == _token) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }

        isTokenSupported[_token] = false;
        delete tokenToAToken[_token];

        emit TokenSupportUpdated(_token, false);
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    function deposit(address _token, uint256 _amount) external override onlyCoordinator nonReentrant {
        if (!isTokenSupported[_token]) revert Errors.UnsupportedToken();
        if (_amount == 0) revert Errors.InvalidAmount();
        if (aavePool == address(0)) revert Errors.NoPoolForToken();

        IERC20(_token).safeTransferFrom(coordinator, address(this), _amount);
        IERC20(_token).approve(aavePool, _amount);
        IPool(aavePool).supply(_token, _amount, address(this), 0); // aTokens go to StrategyAave
    }

    function withdraw(address _token, uint256 _amount) external override onlyCoordinator nonReentrant {
        if (!isTokenSupported[_token]) revert Errors.UnsupportedToken();
        if (_amount == 0) revert Errors.InvalidAmount();
        if (aavePool == address(0)) revert Errors.NoPoolForToken();

        uint256 withdrawn = IPool(aavePool).withdraw(_token, _amount, coordinator); // Sends tokens back to coordinator
        if (withdrawn < _amount) revert("Insufficient withdrawal");
    }

    function balanceOf(address _token) external view override returns (uint256) {
        address aToken = tokenToAToken[_token];
        if (aToken == address(0)) return 0;
        return IERC20(aToken).balanceOf(address(this));
    }

    /**
     * @notice Returns the current APY for a supported token
     * @dev Fetches the current liquidity rate from Aave and converts to basis points
     * 
     * @param _token Address of the token to get APY for
     * @return apy Current annual percentage yield in basis points (e.g., 500 = 5.00%)
     */
    function getCurrentAPY(address _token) external view override returns (uint256 apy) {
        if (!isTokenSupported[_token] || aavePool == address(0)) return 0;
        
        // Get current liquidity rate from Aave
        DataTypes.ReserveData memory reserveData = IPool(aavePool).getReserveData(_token);
        
        // Convert from ray (1e27) to basis points (1e4)
        // Aave rate is already annualized
        uint256 liquidityRate = uint256(reserveData.currentLiquidityRate);
        apy = liquidityRate / 1e23;
        
        return apy;
    }
}
