// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./StrategyCoordinator.sol";
import "./BriqShares.sol";
import "./PriceFeedManager.sol";
import "./BriqTimelock.sol";
import { Errors } from "./libraries/Errors.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BriqVault
 * @author Briq Protocol
 * @notice Main vault contract with USD-normalized share distribution using Chainlink price feeds
 * @dev This contract serves as the primary entry point for users to deposit tokens and receive
 *      yield-bearing shares. Uses Chainlink price feeds to ensure fair share distribution
 *      regardless of which supported token (USDC/WETH) is deposited.
 * 
 * Key Features:
 * - Accepts user deposits in supported tokens (USDC, WETH)
 * - Issues USD-normalized shares using Chainlink price feeds
 * - Handles withdrawals by burning shares and returning underlying tokens
 * - Integrates with StrategyCoordinator for automated yield optimization
 * 
 * Security Features:
 * - ReentrancyGuard protection on deposit/withdraw functions
 * - Pausable functionality for emergency situations
 * - Owner/timelock administrative functions
 * - USD-normalized share calculations prevent token-specific advantages
 * - Slippage protection for withdrawals
 */
contract BriqVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    /// @notice Strategy coordinator contract that manages fund deployment
    StrategyCoordinator public immutable strategyCoordinator;
    
    /// @notice Shares token contract representing vault ownership
    BriqShares public immutable briqShares;
    
    /// @notice Price feed manager for USD conversions
    PriceFeedManager public immutable priceFeedManager;
    
    /// @notice Timelock controller for critical operations
    address public immutable timelock;
    
    /// @notice Maximum slippage tolerance in basis points (default: 0.2% = 20 bp for lending)
    uint256 public maxSlippageBps = 20;
    
    /// @notice Basis points denominator (10000 = 100%)
    uint256 public constant BPS_DENOMINATOR = 10000;

    /**
     * @notice Modifier to allow only owner or timelock to call critical functions
     */
    modifier onlyOwnerOrTimelock() {
        if (msg.sender != owner() && msg.sender != timelock) {
            revert Errors.UnauthorizedAccess();
        }
        _;
    }

    /**
     * @notice Emitted when a user deposits tokens into the vault
     * @param user Address of the depositing user
     * @param token Address of the deposited token
     * @param amount Amount of tokens deposited
     * @param usdValue USD value of the deposit
     * @param sharesMinted Amount of shares minted to the user
     */
    event UserDeposited(address indexed user, address indexed token, uint256 amount, uint256 usdValue, uint256 sharesMinted);
    
    /**
     * @notice Emitted when a user withdraws tokens from the vault
     * @param user Address of the withdrawing user
     * @param token Address of the withdrawn token
     * @param amount Amount of tokens withdrawn
     * @param sharesBurned Amount of shares burned from the user
     */
    event UserWithdrew(address indexed user, address indexed token, uint256 amount, uint256 sharesBurned);
    
    /**
     * @notice Emitted when slippage tolerance is updated
     * @param oldSlippage Previous slippage tolerance in basis points
     * @param newSlippage New slippage tolerance in basis points
     */
    event SlippageUpdated(uint256 oldSlippage, uint256 newSlippage);
    


    /**
     * @notice Initializes the BriqVault contract
     * @param _coordinator Address of the StrategyCoordinator contract
     * @param _briqShares Address of the BriqShares token contract
     * @param _priceFeedManager Address of the PriceFeedManager contract
     * @param _timelock Address of the BriqTimelock contract
     */
    constructor(
        address _coordinator, 
        address _briqShares, 
        address _priceFeedManager,
        address _timelock
    ) Ownable(msg.sender) {
        if (_coordinator == address(0) || _briqShares == address(0) || 
            _priceFeedManager == address(0) || _timelock == address(0)) {
            revert Errors.InvalidAddress();
        }

        strategyCoordinator = StrategyCoordinator(_coordinator);
        briqShares = BriqShares(_briqShares);
        priceFeedManager = PriceFeedManager(_priceFeedManager);
        timelock = _timelock;
    }

    /**
     * @notice Deposits tokens into the vault and mints USD-normalized shares
     * @dev Calculates shares based on USD value of deposit using Chainlink price feeds.
     *      This ensures fair share distribution regardless of which token is deposited.
     * 
     * @param _token Address of the token to deposit (must have price feed configured)
     * @param _amount Amount of tokens to deposit
     * 
     * Requirements:
     * - Amount must be greater than 0
     * - Token must have a configured price feed
     * - User must have approved the vault to spend the tokens
     * - Token must be supported by the strategy coordinator
     * - Contract must not be paused
     */
    function deposit(address _token, uint256 _amount) external nonReentrant whenNotPaused {
        if (_amount == 0) revert Errors.InvalidAmount();
        if (!priceFeedManager.hasPriceFeed(_token)) revert Errors.PriceFeedNotFound();

        // Transfer tokens from user to vault
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // Get USD value of deposit using Chainlink price feeds
        uint256 depositUsdValue = priceFeedManager.getTokenValueInUSD(_token, _amount);
        
        // Get total vault value in USD before this deposit
        uint256 totalVaultUsdValue = getTotalVaultValueInUSD();
        uint256 totalShares = briqShares.totalSupply();

        // Approve and deposit tokens to StrategyCoordinator
        IERC20(_token).safeIncreaseAllowance(address(strategyCoordinator), _amount);
        strategyCoordinator.deposit(_token, _amount);

        // Calculate shares based on USD value
        uint256 sharesToMint;
        if (totalShares == 0 || totalVaultUsdValue == 0) {
            // First deposit: 1 USD = 1e18 shares
            sharesToMint = depositUsdValue;
        } else {
            // Subsequent deposits: maintain proportional ownership
            sharesToMint = (depositUsdValue * totalShares) / totalVaultUsdValue;
        }

        // Mint shares to user
        briqShares.mint(msg.sender, sharesToMint);

        emit UserDeposited(msg.sender, _token, _amount, depositUsdValue, sharesToMint);
    }

    /**
     * @notice Withdraws tokens from the vault by burning user shares
     * @dev Calculates the user's proportional share of the specific token
     *      and withdraws the corresponding amount with slippage protection.
     * 
     * @param _token Address of the token to withdraw
     * @param _shares Amount of shares to burn for withdrawal
     * @param _minAmountOut Minimum amount of tokens to receive (slippage protection)
     */
    function withdraw(address _token, uint256 _shares, uint256 _minAmountOut) external nonReentrant whenNotPaused {
        if (_shares == 0) revert Errors.InvalidAmount();

        // Validate user has sufficient shares
        uint256 userShares = briqShares.balanceOf(msg.sender);
        if (_shares > userShares) revert Errors.InvalidShares();

        // Calculate user's USD share of the vault
        uint256 totalShares = briqShares.totalSupply();
        uint256 totalVaultUsdValue = getTotalVaultValueInUSD();
        if (totalVaultUsdValue == 0) revert Errors.InsufficientLiquidity();
        
        uint256 userUsdValue = (_shares * totalVaultUsdValue) / totalShares;

        // Convert USD value to token amount using current Chainlink price
        uint256 idealAmount = priceFeedManager.convertUsdToToken(_token, userUsdValue);
        
        // Check available balance and handle graceful partial withdrawal
        uint256 availableBalance = strategyCoordinator.getTotalTokenBalance(_token);
        uint256 actualAmount = idealAmount;
        uint256 actualShares = _shares;
        
        if (idealAmount > availableBalance) {
            // Graceful partial withdrawal: give user what's available
            actualAmount = availableBalance;
            // Calculate proportional shares to burn based on actual amount
            uint256 actualUsdValue = priceFeedManager.getTokenValueInUSD(_token, actualAmount);
            actualShares = (actualUsdValue * totalShares) / totalVaultUsdValue;
            
            // Ensure we don't burn more shares than user requested
            if (actualShares > _shares) {
                actualShares = _shares;
                actualAmount = idealAmount; // This should not happen, but safety check
            }
        }

        // Slippage protection
        if (actualAmount < _minAmountOut) {
            revert Errors.SlippageExceeded();
        }

        // Burn the actual shares (might be less than requested)
        briqShares.burn(msg.sender, actualShares);

        // Withdraw from StrategyCoordinator
        strategyCoordinator.withdraw(_token, actualAmount);

        // Transfer tokens to user
        IERC20(_token).safeTransfer(msg.sender, actualAmount);

        emit UserWithdrew(msg.sender, _token, actualAmount, actualShares);
    }

    /**
     * @notice Withdraws tokens without slippage protection (for backward compatibility)
     * @param _token Address of the token to withdraw
     * @param _shares Amount of shares to burn for withdrawal
     */
    /**
     * @notice Emergency withdrawal function (owner/timelock only)
     * @param _token Address of the token to withdraw
     * @param _amount Amount of tokens to withdraw
     * @param _recipient Address to receive the tokens
     */
    function emergencyWithdraw(address _token, uint256 _amount, address _recipient) external onlyOwnerOrTimelock {
        if (_recipient == address(0)) revert Errors.InvalidAddress();
        if (_amount == 0) revert Errors.InvalidAmount();
        
        // Withdraw from strategies if needed
        uint256 vaultBalance = IERC20(_token).balanceOf(address(this));
        if (vaultBalance < _amount) {
            uint256 needed = _amount - vaultBalance;
            strategyCoordinator.withdraw(_token, needed);
        }
        
        IERC20(_token).safeTransfer(_recipient, _amount);
    }

    /**
     * @notice Check withdrawal availability for a specific token
     * @param _token Address of the token to check
     * @param _shares Amount of shares to potentially withdraw
     * @return canWithdrawFull Whether full withdrawal is possible
     * @return availableAmount Maximum token amount available for withdrawal
     * @return idealAmount Ideal token amount for the shares
     */
    function checkWithdrawalAvailability(address _token, uint256 _shares) 
        external 
        view 
        returns (bool canWithdrawFull, uint256 availableAmount, uint256 idealAmount) 
    {
        if (_shares == 0) return (false, 0, 0);
        
        uint256 totalShares = briqShares.totalSupply();
        uint256 totalVaultUsdValue = getTotalVaultValueInUSD();
        
        if (totalShares == 0 || totalVaultUsdValue == 0) {
            return (false, 0, 0);
        }
        
        uint256 userUsdValue = (_shares * totalVaultUsdValue) / totalShares;
        idealAmount = priceFeedManager.convertUsdToToken(_token, userUsdValue);
        availableAmount = strategyCoordinator.getTotalTokenBalance(_token);
        canWithdrawFull = availableAmount >= idealAmount;
    }

    /**
     * @notice Gets the total vault value in USD across all supported tokens
     * @dev Sums up the USD value of all token balances in the vault
     * @return totalUsdValue Total vault value in USD with 18 decimals
     */
    function getTotalVaultValueInUSD() public view returns (uint256 totalUsdValue) {
        // Use StrategyCoordinator to get USD value across all strategies
        address[] memory supportedTokens = getSupportedTokens();
        return strategyCoordinator.getTotalUsdValue(address(priceFeedManager), supportedTokens);
    }

    /**
     * @notice Returns array of supported token addresses
     * @dev Delegates to StrategyCoordinator which maintains the authoritative list
     */
    function getSupportedTokens() public view returns (address[] memory) {
        return strategyCoordinator.getSupportedTokens();
    }

    /**
     * @notice Updates the maximum slippage tolerance (owner or timelock only)
     * @param _newSlippageBps New slippage tolerance in basis points (max 300 = 3%)
     */
    function updateMaxSlippage(uint256 _newSlippageBps) external onlyOwnerOrTimelock {
        if (_newSlippageBps > 300) revert Errors.InvalidAmount(); // Max 3% slippage for volatility
        
        uint256 oldSlippage = maxSlippageBps;
        maxSlippageBps = _newSlippageBps;
        
        emit SlippageUpdated(oldSlippage, _newSlippageBps);
    }

    /**
     * @notice Pauses the contract (owner or timelock only)
     */
    function pause() external onlyOwnerOrTimelock {
        _pause();
    }

    /**
     * @notice Unpauses the contract (owner or timelock only)
     */
    function unpause() external onlyOwnerOrTimelock {
        _unpause();
    }
}
