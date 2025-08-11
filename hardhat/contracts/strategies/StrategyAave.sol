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
    
    // Rewards tracking for analytics
    mapping(address => uint256) public totalDeposited;
    mapping(address => uint256) public totalWithdrawn;

    event AavePoolUpdated(address indexed pool);
    event TokenSupportUpdated(address indexed token, bool status);
    event CoordinatorUpdated(address indexed coordinator);
    event Deposited(address indexed token, uint256 amount, uint256 totalDeposited);
    event Withdrawn(address indexed token, uint256 amount, uint256 totalWithdrawn);

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
        
        // Track total deposited for rewards calculation
        totalDeposited[_token] += _amount;
        
        emit Deposited(_token, _amount, totalDeposited[_token]);
    }

    function withdraw(address _token, uint256 _amount) external override onlyCoordinator nonReentrant {
        if (!isTokenSupported[_token]) revert Errors.UnsupportedToken();
        if (_amount == 0) revert Errors.InvalidAmount();
        if (aavePool == address(0)) revert Errors.NoPoolForToken();

        uint256 withdrawn = IPool(aavePool).withdraw(_token, _amount, coordinator); // Sends tokens back to coordinator
        if (withdrawn < _amount) revert("Insufficient withdrawal");
        
        // Track total withdrawn for rewards calculation
        totalWithdrawn[_token] += withdrawn;
        
        emit Withdrawn(_token, withdrawn, totalWithdrawn[_token]);
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

    /**
     * @notice Returns the total accrued rewards for a token
     * @dev Calculates rewards as: current aToken balance - (total deposited - total withdrawn)
     * 
     * @param _token Address of the token to get rewards for
     * @return rewards Total accrued rewards in token units
     */
    function getAccruedRewards(address _token) external view returns (uint256 rewards) {
        if (!isTokenSupported[_token]) return 0;
        
        uint256 currentBalance = this.balanceOf(_token);
        uint256 netDeposits = totalDeposited[_token] - totalWithdrawn[_token];
        
        return currentBalance > netDeposits ? currentBalance - netDeposits : 0;
    }

    /**
     * @notice Returns detailed analytics for a token
     * @dev Provides comprehensive data for frontend display
     * 
     * @param _token Address of the token to get analytics for
     * @return currentBalance Current aToken balance (principal + rewards)
     * @return totalDeposits Total amount ever deposited
     * @return totalWithdrawals Total amount ever withdrawn
     * @return netDeposits Current net deposits (deposits - withdrawals)
     * @return accruedRewards Total rewards earned
     * @return currentAPY Current APY in basis points
     */
    function getTokenAnalytics(address _token) external view returns (
        uint256 currentBalance,
        uint256 totalDeposits,
        uint256 totalWithdrawals,
        uint256 netDeposits,
        uint256 accruedRewards,
        uint256 currentAPY
    ) {
        if (!isTokenSupported[_token]) {
            return (0, 0, 0, 0, 0, 0);
        }
        
        currentBalance = this.balanceOf(_token);
        totalDeposits = totalDeposited[_token];
        totalWithdrawals = totalWithdrawn[_token];
        netDeposits = totalDeposits - totalWithdrawals;
        accruedRewards = currentBalance > netDeposits ? currentBalance - netDeposits : 0;
        currentAPY = this.getCurrentAPY(_token);
        
        return (currentBalance, totalDeposits, totalWithdrawals, netDeposits, accruedRewards, currentAPY);
    }

    /**
     * @notice Returns analytics for all supported tokens
     * @dev Batch function to get analytics for all tokens at once
     * 
     * @return tokens Array of supported token addresses
     * @return analytics Array of analytics data for each token
     */
    function getAllTokenAnalytics() external view returns (
        address[] memory tokens,
        uint256[6][] memory analytics
    ) {
        tokens = supportedTokens;
        analytics = new uint256[6][](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            (
                analytics[i][0], // currentBalance
                analytics[i][1], // totalDeposits
                analytics[i][2], // totalWithdrawals
                analytics[i][3], // netDeposits
                analytics[i][4], // accruedRewards
                analytics[i][5]  // currentAPY
            ) = this.getTokenAnalytics(tokens[i]);
        }
        
        return (tokens, analytics);
    }
}
