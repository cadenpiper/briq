// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./StrategyCoordinator.sol";
import "./BriqShares.sol";
import { Errors } from "./libraries/Errors.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BriqVault
 * @author Briq Protocol
 * @notice Main vault contract that handles user deposits and withdrawals for yield optimization
 * @dev This contract serves as the primary entry point for users to deposit tokens and receive
 *      yield-bearing shares. It coordinates with StrategyCoordinator to deploy funds across
 *      different DeFi protocols for optimal yield generation.
 * 
 * Key Features:
 * - Accepts user deposits in supported tokens
 * - Issues proportional shares (BriqShares) representing vault ownership
 * - Handles withdrawals by burning shares and returning underlying tokens
 * - Integrates with StrategyCoordinator for automated yield optimization
 * 
 * Security Features:
 * - ReentrancyGuard protection on deposit/withdraw functions
 * - Owner-only administrative functions
 * - Custom error handling for gas efficiency
 */
contract BriqVault is Ownable, ReentrancyGuard {
    
    /// @notice Strategy coordinator contract that manages fund deployment
    StrategyCoordinator public strategyCoordinator;
    
    /// @notice Shares token contract representing vault ownership
    BriqShares public briqShares;

    /**
     * @notice Emitted when a user deposits tokens into the vault
     * @param user Address of the depositing user
     * @param token Address of the deposited token
     * @param amount Amount of tokens deposited
     * @param sharesMinted Amount of shares minted to the user
     */
    event UserDeposited(address indexed user, address indexed token, uint256 amount, uint256 sharesMinted);
    
    /**
     * @notice Emitted when a user withdraws tokens from the vault
     * @param user Address of the withdrawing user
     * @param token Address of the withdrawn token
     * @param amount Amount of tokens withdrawn
     * @param sharesBurned Amount of shares burned from the user
     */
    event UserWithdrew(address indexed user, address indexed token, uint256 amount, uint256 sharesBurned);

    /**
     * @notice Initializes the BriqVault contract
     * @dev Sets up the vault with strategy coordinator and shares token contracts
     * @param _coordinator Address of the StrategyCoordinator contract
     * @param _briqShares Address of the BriqShares token contract
     * 
     * Requirements:
     * - Neither address can be zero address
     * - Caller becomes the owner of the contract
     */
    constructor(address _coordinator, address _briqShares) Ownable(msg.sender) {
        if (_coordinator == address(0) || _briqShares == address(0)) revert Errors.InvalidAddress();

        strategyCoordinator = StrategyCoordinator(_coordinator);
        briqShares = BriqShares(_briqShares);
    }

    /**
     * @notice Deposits tokens into the vault and mints shares to the user
     * @dev Calculates shares based on the user's proportion of the total vault value.
     *      For the first deposit, uses a fixed ratio. For subsequent deposits, uses
     *      the pre-deposit balance to prevent share dilution attacks.
     * 
     * @param _token Address of the token to deposit
     * @param _amount Amount of tokens to deposit
     * 
     * Requirements:
     * - Amount must be greater than 0
     * - User must have approved the vault to spend the tokens
     * - Token must be supported by the strategy coordinator
     * 
     * Effects:
     * - Transfers tokens from user to vault
     * - Deposits tokens to strategy coordinator for yield generation
     * - Mints proportional shares to the user
     * - Emits UserDeposited event
     * 
     * Security:
     * - Protected by nonReentrant modifier
     * - Uses pre-deposit balance for share calculation to prevent manipulation
     */
    function deposit(address _token, uint256 _amount) external nonReentrant {
        if (_amount == 0) revert Errors.InvalidAmount();

        // Transfer tokens from user to vault
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        // Get balance BEFORE depositing to strategy
        uint256 totalBalanceBefore = strategyCoordinator.getTotalTokenBalance(_token);
        uint256 totalShares = briqShares.totalSupply();

        // Approve and deposit tokens to StrategyCoordinator.sol
        IERC20(_token).approve(address(strategyCoordinator), _amount);
        strategyCoordinator.deposit(_token, _amount);

        // Calculate shares to mint based on pre-deposit state
        uint256 sharesToMint = (totalShares == 0 || totalBalanceBefore == 0)
            ? _amount * 1e12  // First deposit gets fixed ratio
            : (_amount * totalShares) / totalBalanceBefore;  // Subsequent deposits use pre-deposit balance

        // Mint shares to user
        briqShares.mint(msg.sender, sharesToMint);

        emit UserDeposited(msg.sender, _token, _amount, sharesToMint);
    }

    /**
     * @notice Withdraws tokens from the vault by burning user shares
     * @dev Calculates the user's proportional share of the vault and withdraws
     *      the corresponding amount of tokens from the strategy coordinator.
     * 
     * @param _token Address of the token to withdraw
     * @param _shares Amount of shares to burn for withdrawal
     * 
     * Requirements:
     * - Shares amount must be greater than 0
     * - User must have sufficient shares to burn
     * - Vault must have sufficient liquidity in the requested token
     * 
     * Effects:
     * - Burns the specified shares from the user
     * - Withdraws proportional tokens from strategy coordinator
     * - Transfers tokens to the user
     * - Emits UserWithdrew event
     * 
     * Security:
     * - Protected by nonReentrant modifier
     * - Validates user has sufficient shares before proceeding
     */
    function withdraw(address _token, uint256 _shares) external nonReentrant {
        if (_shares == 0) revert Errors.InvalidAmount();

        // Calculate msg.sender shares
        uint256 userShares = briqShares.balanceOf(msg.sender);
        if (_shares > userShares) revert Errors.InvalidShares();

        // Calculate proportion to withdraw
        uint256 totalShares = briqShares.totalSupply();
        uint256 totalBalance = strategyCoordinator.getTotalTokenBalance(_token);
        uint256 amountToWithdraw = (_shares * totalBalance) / totalShares;

        briqShares.burn(msg.sender, _shares);

        // Withdraw from StrategyCoordinator
        strategyCoordinator.withdraw(_token, amountToWithdraw);

        // Transfer tokens to user
        IERC20(_token).transfer(msg.sender, amountToWithdraw);

        emit UserWithdrew(msg.sender, _token, amountToWithdraw, _shares);
    }
}
