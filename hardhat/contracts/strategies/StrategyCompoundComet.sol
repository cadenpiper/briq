// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../StrategyBase.sol";
import "../interfaces/IComet.sol";
import { Errors } from "../libraries/Errors.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StrategyCompoundComet
 * @author Briq Protocol
 * @notice Strategy implementation for Compound V3 (Comet) lending protocol integration
 * @dev This contract implements the StrategyBase interface to provide yield generation
 *      through Compound V3 (Comet) lending markets. It handles token deposits, withdrawals,
 *      and balance tracking for supported base assets in Comet markets.
 * 
 * Key Features:
 * - Deposits base tokens into Compound V3 Comet markets to earn yield
 * - Supports multiple tokens through dynamic market configuration
 * - Handles withdrawals with automatic interest calculation
 * - Maps tokens to their corresponding Comet market contracts
 * 
 * Architecture:
 * - Integrates with Compound V3 Comet contracts for lending operations
 * - Maintains mapping of supported tokens to their Comet markets
 * - Implements StrategyBase interface for coordinator compatibility
 * 
 * Security Features:
 * - Coordinator-only access for deposit/withdraw operations
 * - Owner-only administrative functions
 * - ReentrancyGuard protection on state-changing functions
 * - SafeERC20 for secure token transfers
 * - Custom error handling for gas efficiency
 */
contract StrategyCompoundComet is StrategyBase, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Mapping to check if a token is supported by this strategy
    mapping(address => bool) public supportedTokens;
    
    /// @notice Mapping to check if a Comet market is supported
    mapping(address => bool) public supportedMarkets;
    
    /// @notice Mapping from token address to its corresponding Comet market contract
    mapping(address => IComet) public tokenToComet;

    /**
     * @notice Emitted when a token's support status is updated
     * @param token Address of the token whose support was updated
     * @param status New support status (true = supported, false = not supported)
     */
    event TokenSupportUpdated(address indexed token, bool status);
    
    /**
     * @notice Emitted when a Comet market's support status is updated
     * @param market Address of the Comet market whose support was updated
     * @param status New support status (true = supported, false = not supported)
     * @param token Address of the base token for this market
     */
    event MarketSupportUpdated(address indexed market, bool status, address indexed token);
    
    /**
     * @notice Emitted when the coordinator address is updated
     * @param coordinator New coordinator address
     */
    event CoordinatorUpdated(address indexed coordinator);

    /**
     * @notice Initializes the StrategyCompoundComet contract
     * @dev Sets up the strategy with owner permissions. Coordinator address
     *      must be set separately after deployment.
     * 
     * Effects:
     * - Inherits from StrategyBase, ReentrancyGuard, and Ownable
     * - Sets deployer as owner
     */
    constructor() StrategyBase() Ownable(msg.sender) {}

    /**
     * @notice Sets the coordinator address for this strategy
     * @dev Implements the StrategyBase interface requirement. Only the owner
     *      can set the coordinator, and it cannot be the same as current.
     * 
     * @param _coordinator Address of the StrategyCoordinator contract
     * 
     * Requirements:
     * - Coordinator address cannot be zero address
     * - Coordinator address cannot be the same as current
     * - Can only be called by the contract owner
     * 
     * Effects:
     * - Updates the coordinator address
     * - Emits CoordinatorUpdated event
     */
    function setCoordinator(address _coordinator) external override onlyOwner {
        if (_coordinator == address(0)) revert Errors.InvalidAddress();
        if (_coordinator == coordinator) revert Errors.SameCoordinator();

        coordinator = _coordinator;

        emit CoordinatorUpdated(_coordinator);
    }

    /**
     * @notice Updates support status for a specific token
     * @dev Enables or disables support for a token. When disabling, also clears
     *      the token-to-comet mapping. When enabling, requires that a Comet market
     *      has already been configured for the token.
     * 
     * @param _token Address of the token to update support for
     * @param _status New support status (true = supported, false = not supported)
     * 
     * Requirements:
     * - Token address cannot be zero address
     * - Status must be different from current status
     * - If enabling support, token must have a configured Comet market
     * - Can only be called by the contract owner
     * 
     * Effects:
     * - Updates supportedTokens mapping
     * - If disabling, clears tokenToComet mapping
     * - Emits TokenSupportUpdated event
     */
    function updateTokenSupport(address _token, bool _status) external onlyOwner {
        if (_token == address(0)) revert Errors.InvalidAddress();
        if (supportedTokens[_token] == _status) revert Errors.TokenSupportUnchanged();
        if (_status && address(tokenToComet[_token]) == address(0)) revert Errors.NoPoolForToken();

        supportedTokens[_token] = _status;

        if (!_status) {
            delete tokenToComet[_token];
        }

        emit TokenSupportUpdated(_token, _status);
    }

    /**
     * @notice Updates support status for a Comet market and associates it with a token
     * @dev Enables or disables support for a Comet market. When enabling, validates
     *      that the market's base token matches the specified token. When disabling,
     *      clears the token-to-comet mapping.
     * 
     * @param _market Address of the Comet market contract
     * @param _token Address of the base token for this market
     * @param _status New support status (true = supported, false = not supported)
     * 
     * Requirements:
     * - Market and token addresses cannot be zero address
     * - Status must be different from current status
     * - If enabling, market's base token must match the specified token
     * - Can only be called by the contract owner
     * 
     * Effects:
     * - Updates supportedMarkets mapping
     * - If enabling, sets tokenToComet mapping
     * - If disabling, clears tokenToComet mapping
     * - Emits MarketSupportUpdated event
     * 
     * Security:
     * - Validates market-token compatibility before enabling
     * - Prevents misconfiguration of market-token relationships
     */
    function updateMarketSupport(address _market, address _token, bool _status) external onlyOwner {
        if (_market == address(0) || _token == address(0)) revert Errors.InvalidAddress();
        if (supportedMarkets[_market] == _status) revert Errors.PoolSupportUnchanged();

        supportedMarkets[_market] = _status;

        if (_status) {
            IComet comet = IComet(_market);
            address base = comet.baseToken();
            if (base != _token) revert Errors.UnsupportedTokenForPool();

            tokenToComet[_token] = comet;
        } else {
            delete tokenToComet[_token];
        }

        emit MarketSupportUpdated(_market, _status, _token);
    }

    /**
     * @notice Deposits tokens into Compound V3 Comet market
     * @dev Implements the StrategyBase deposit interface. Transfers tokens from
     *      coordinator, approves Comet market, and supplies tokens to earn yield.
     *      The supplied tokens start earning interest immediately.
     * 
     * @param _token Address of the token to deposit (must be a base token)
     * @param _amount Amount of tokens to deposit
     * 
     * Requirements:
     * - Can only be called by the coordinator
     * - Token must be supported by this strategy
     * - Amount must be greater than 0
     * - Token must have a configured Comet market
     * 
     * Effects:
     * - Transfers tokens from coordinator to this contract
     * - Approves Comet market to spend tokens
     * - Supplies tokens to Comet market
     * - Tokens start earning interest in the Comet market
     * 
     * Security:
     * - Protected by onlyCoordinator modifier
     * - Protected by nonReentrant modifier
     * - Uses SafeERC20 for secure token transfers
     * - Validates all parameters before execution
     */
    function deposit(address _token, uint256 _amount) external override onlyCoordinator nonReentrant {
        if (!supportedTokens[_token]) revert Errors.UnsupportedToken();
        if (_amount == 0) revert Errors.InvalidAmount();
        IComet comet = tokenToComet[_token];
        if (address(comet) == address(0)) revert Errors.NoPoolForToken();

        IERC20(_token).safeTransferFrom(coordinator, address(this), _amount);
        IERC20(_token).approve(address(comet), _amount);
        comet.supply(_token, _amount); // supply base token
    }

    /**
     * @notice Withdraws tokens from Compound V3 Comet market
     * @dev Implements the StrategyBase withdraw interface. Withdraws tokens from
     *      Comet market and sends them to the coordinator. The withdrawal amount
     *      includes any accrued interest. Uses before/after balance tracking to
     *      handle potential rounding differences.
     * 
     * @param _token Address of the token to withdraw
     * @param _amount Amount of tokens to withdraw
     * 
     * Requirements:
     * - Can only be called by the coordinator
     * - Token must be supported by this strategy
     * - Amount must be greater than 0
     * - Token must have a configured Comet market
     * - Strategy must have sufficient balance in Comet
     * 
     * Effects:
     * - Withdraws tokens from Comet market
     * - Transfers actual received tokens to coordinator
     * - Handles any rounding differences in withdrawal amounts
     * 
     * Security:
     * - Protected by onlyCoordinator modifier
     * - Protected by nonReentrant modifier
     * - Uses SafeERC20 for secure token transfers
     * - Tracks actual received amount to handle rounding
     */
    function withdraw(address _token, uint256 _amount) external override onlyCoordinator nonReentrant {
        if (!supportedTokens[_token]) revert Errors.UnsupportedToken();
        if (_amount == 0) revert Errors.InvalidAmount();
        IComet comet = tokenToComet[_token];
        if (address(comet) == address(0)) revert Errors.NoPoolForToken();

        // Track before/after balances
        uint256 before = IERC20(_token).balanceOf(address(this));
        comet.withdraw(_token, _amount);
        uint256 afterBal = IERC20(_token).balanceOf(address(this));
        uint256 received = afterBal - before;

        IERC20(_token).safeTransfer(coordinator, received);
    }

    /**
     * @notice Returns the current balance of a token in Compound V3 Comet
     * @dev Implements the StrategyBase balanceOf interface. Returns the current
     *      balance in the Comet market which represents the original deposit plus
     *      accrued interest.
     * 
     * @param _token Address of the token to check balance for
     * @return Current balance of the token in Comet (including accrued interest)
     * 
     * Returns:
     * - Current Comet balance representing deposit + interest
     * - 0 if token has no configured Comet market
     * 
     * Note:
     * - Comet balances automatically increase over time due to interest accrual
     * - This balance represents the amount that can be withdrawn
     */
    function balanceOf(address _token) external view override returns (uint256) {
        IComet comet = tokenToComet[_token];
        return comet.balanceOf(address(this));
    }
}
