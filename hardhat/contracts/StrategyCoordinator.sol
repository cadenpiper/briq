// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./StrategyBase.sol";
import "./strategies/StrategyAave.sol";
import "./strategies/StrategyCompoundComet.sol";
import { Errors } from "./libraries/Errors.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interface for PriceFeedManager
interface IPriceFeedManager {
    function hasPriceFeed(address token) external view returns (bool);
    function getTokenValueInUSD(address token, uint256 amount) external view returns (uint256);
}

/**
 * @title StrategyCoordinator
 * @author Briq Protocol
 * @notice Central coordinator that manages fund deployment across multiple DeFi yield strategies
 * @dev This contract acts as the intermediary between the BriqVault and various yield generation
 *      strategies (Aave, Compound, etc.). It handles strategy selection, fund allocation, and
 *      cross-strategy operations for optimal yield generation.
 * 
 * Key Features:
 * - Manages multiple yield generation strategies
 * - Handles token routing to appropriate strategies
 * - Supports cross-strategy withdrawals for liquidity optimization
 * - Provides unified balance tracking across all strategies
 * 
 * Architecture:
 * - Vault deposits/withdraws through this coordinator
 * - Coordinator routes funds to optimal strategies
 * - Strategies interact with underlying DeFi protocols
 * 
 * Security Features:
 * - Vault-only access for deposit/withdraw operations
 * - Owner-only administrative functions
 * - ReentrancyGuard protection
 * - Custom error handling for gas efficiency
 */
contract StrategyCoordinator is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /// @notice Address of the BriqVault contract authorized to call coordinator functions
    address public vault;
    
    /// @notice Address of Rupert (autonomous optimizer) authorized to change strategies
    address public rupert;
    
    /// @notice Aave V3 strategy implementation
    StrategyAave public immutable strategyAave;
    
    /// @notice Compound V3 (Comet) strategy implementation
    StrategyCompoundComet public immutable strategyCompound;

    /**
     * @notice Enumeration of available strategy types
     * @dev Used to identify and route funds to the appropriate strategy implementation
     */
    enum StrategyType {
        AAVE,      /// @dev Aave V3 lending protocol strategy
        COMPOUND   /// @dev Compound V3 (Comet) lending protocol strategy
    }

    /// @notice Maps token addresses to their assigned strategy type
    mapping(address => StrategyType) public tokenToStrategy;
    
    /// @notice Tracks which tokens are supported by the coordinator
    mapping(address => bool) public supportedTokens;
    
    /// @notice Array to track all supported token addresses
    address[] private supportedTokensList;
    
    /// @notice Mapping to track if token is in the array (for gas optimization)
    mapping(address => bool) private tokenInList;
    
    /// @notice Timelock controller for critical operations
    address public immutable timelock;

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
     * @notice Emitted when a token's strategy assignment is updated
     * @param token Address of the token whose strategy was updated
     * @param strategyType New strategy type assigned to the token
     */
    event StrategyUpdated(address indexed token, StrategyType strategyType);
    
    /**
     * @notice Emitted when tokens are deposited into a strategy
     * @param token Address of the deposited token
     * @param amount Amount of tokens deposited
     * @param strategyType Strategy that received the deposit
     */
    event Deposit(address indexed token, uint256 amount, StrategyType strategyType);
    
    /**
     * @notice Emitted when tokens are withdrawn from a strategy
     * @param token Address of the withdrawn token
     * @param amount Amount of tokens withdrawn
     * @param strategyType Strategy that provided the withdrawal
     */
    event Withdrawal(address indexed token, uint256 amount, StrategyType strategyType);

    /**
     * @notice Initializes the StrategyCoordinator with strategy implementations
     * @dev Sets up the coordinator with references to Aave and Compound strategy contracts
     * 
     * @param _strategyAave Address of the deployed StrategyAave contract
     * @param _strategyCompound Address of the deployed StrategyCompoundComet contract
     * 
     * Requirements:
     * - Neither strategy address can be zero address
     * - Strategy contracts must be properly deployed and initialized
     * 
     * Effects:
     * - Sets strategy contract references
     * - Establishes deployer as owner
     */
    constructor(
        address _strategyAave,
        address _strategyCompound,
        address _timelock
    ) Ownable(msg.sender) {
        if (_strategyAave == address(0) || _strategyCompound == address(0) || _timelock == address(0)) 
            revert Errors.InvalidAddress();
        
        strategyAave = StrategyAave(_strategyAave);
        strategyCompound = StrategyCompoundComet(_strategyCompound);
        timelock = _timelock;
    }

    /**
     * @notice Restricts function access to the BriqVault contract only
     * @dev Ensures that only the authorized vault can execute deposit/withdraw operations
     */
    modifier onlyVault() {
        if (msg.sender != vault) revert Errors.OnlyVault();
        _;
    }

    /**
     * @notice Restricts access to owner or Rupert only
     * @dev Allows both owner and Rupert to manage strategies
     */
    modifier onlyOwnerOrRupert() {
        if (msg.sender != owner() && msg.sender != rupert) revert Errors.UnauthorizedAccess();
        _;
    }

    /**
     * @notice Updates the vault address authorized to use this coordinator
     * @dev Should be called once during deployment to establish the vault relationship
     * 
     * @param _vault Address of the BriqVault contract
     * 
     * Requirements:
     * - Vault address cannot be zero address
     * - Can only be called by the contract owner
     * 
     * Effects:
     * - Updates the vault address
     * - Enables vault to call deposit/withdraw functions
     */
    function updateVaultAddress(address _vault) external onlyOwnerOrTimelock {
        if (_vault == address(0)) revert Errors.InvalidAddress();
        vault = _vault;
    }

    /**
     * @notice Sets Rupert's address for autonomous strategy management
     * @dev Allows Rupert to call setStrategyForToken alongside the owner
     * 
     * @param _rupert Address of Rupert's wallet
     */
    function setRupert(address _rupert) external onlyOwnerOrTimelock {
        if (_rupert == address(0)) revert Errors.InvalidAddress();
        rupert = _rupert;
    }

    /**
     * @notice Assigns a strategy type to a specific token
     * @dev Configures which strategy should be used for a given token. Validates that
     *      the selected strategy actually supports the token before assignment.
     * 
     * @param _token Address of the token to configure
     * @param _strategyType Strategy type to assign to the token
     * 
     * Requirements:
     * - Token address cannot be zero address
     * - Selected strategy must support the token
     * - Can only be called by the contract owner
     * 
     * Effects:
     * - Marks token as supported
     * - Assigns strategy type to token
     * - Emits StrategyUpdated event
     * 
     * Security:
     * - Validates strategy compatibility before assignment
     * - Owner-only access control
     */
    function setStrategyForToken(address _token, StrategyType _strategyType) external onlyOwnerOrRupert {
        if (_token == address(0)) revert Errors.InvalidAddress();
        
        // Check if the token is supported by the selected strategy
        if (_strategyType == StrategyType.AAVE) {
            if (!strategyAave.isTokenSupported(_token)) revert Errors.UnsupportedToken();
        } else if (_strategyType == StrategyType.COMPOUND) {
            if (!strategyCompound.supportedTokens(_token)) revert Errors.UnsupportedToken();
        }

        supportedTokens[_token] = true;
        
        // Add to list if not already present
        if (!tokenInList[_token]) {
            supportedTokensList.push(_token);
            tokenInList[_token] = true;
        }
        
        tokenToStrategy[_token] = _strategyType;
        emit StrategyUpdated(_token, _strategyType);
    }

    /**
     * @notice Deposits tokens into the assigned strategy for yield generation
     * @dev Routes tokens to the appropriate strategy based on the token's configuration.
     *      Handles token transfers and strategy interaction with failure handling.
     * 
     * @param _token Address of the token to deposit
     * @param _amount Amount of tokens to deposit
     * 
     * Requirements:
     * - Can only be called by the vault contract
     * - Token must be supported by the coordinator
     * - Amount must be greater than 0
     * - At least one strategy must be available for the token
     * 
     * Effects:
     * - Transfers tokens from vault to coordinator
     * - Attempts deposit to assigned strategy
     * - Falls back to alternative strategy if primary fails
     * - Emits Deposit event with actual strategy used
     * 
     * Security:
     * - Protected by onlyVault modifier
     * - Protected by nonReentrant modifier
     * - Strategy failure isolation prevents total deposit failure
     * - Validates token support and amount
     * 
     * Failure Handling:
     * - Primary strategy failure triggers fallback to alternative strategy
     * - Graceful degradation when strategies are paused or failing
     * - Ensures deposits succeed even if preferred strategy is unavailable
     */
    function deposit(address _token, uint256 _amount) external onlyVault nonReentrant {
        if (!supportedTokens[_token]) revert Errors.UnsupportedToken();
        if (_amount == 0) revert Errors.InvalidAmount();

        StrategyType strategyType = tokenToStrategy[_token];
        StrategyType actualStrategy = strategyType;
        bool depositSuccessful = false;
        
        // Transfer tokens from vault to coordinator
        IERC20(_token).safeTransferFrom(vault, address(this), _amount);

        // Attempt deposit to primary strategy with failure handling
        if (strategyType == StrategyType.AAVE) {
            depositSuccessful = _attemptDepositToAave(_token, _amount);
            
            // If primary strategy failed, try Compound as fallback
            if (!depositSuccessful && strategyCompound.supportedTokens(_token)) {
                depositSuccessful = _attemptDepositToCompound(_token, _amount);
                if (depositSuccessful) {
                    actualStrategy = StrategyType.COMPOUND;
                }
            }
        } else if (strategyType == StrategyType.COMPOUND) {
            depositSuccessful = _attemptDepositToCompound(_token, _amount);
            
            // If primary strategy failed, try Aave as fallback
            if (!depositSuccessful && strategyAave.isTokenSupported(_token)) {
                depositSuccessful = _attemptDepositToAave(_token, _amount);
                if (depositSuccessful) {
                    actualStrategy = StrategyType.AAVE;
                }
            }
        }

        // If all strategies failed, revert and return tokens to vault
        if (!depositSuccessful) {
            IERC20(_token).safeTransfer(vault, _amount);
            revert Errors.DepositFailed();
        }

        emit Deposit(_token, _amount, actualStrategy);
    }

    /**
     * @notice Attempts to deposit tokens to Aave strategy with failure handling
     * @dev Internal function that safely attempts deposit to Aave strategy
     * 
     * @param _token Address of the token to deposit
     * @param _amount Amount of tokens to deposit
     * @return success True if deposit succeeded, false if failed
     */
    function _attemptDepositToAave(address _token, uint256 _amount) internal returns (bool success) {
        try strategyAave.isTokenSupported(_token) returns (bool supported) {
            if (!supported) return false;
            
            IERC20(_token).safeIncreaseAllowance(address(strategyAave), _amount);
            
            try strategyAave.deposit(_token, _amount) {
                return true;
            } catch {
                // Reset approval on failure
                IERC20(_token).safeDecreaseAllowance(address(strategyAave), _amount);
                return false;
            }
        } catch {
            return false;
        }
    }

    /**
     * @notice Attempts to deposit tokens to Compound strategy with failure handling
     * @dev Internal function that safely attempts deposit to Compound strategy
     * 
     * @param _token Address of the token to deposit
     * @param _amount Amount of tokens to deposit
     * @return success True if deposit succeeded, false if failed
     */
    function _attemptDepositToCompound(address _token, uint256 _amount) internal returns (bool success) {
        try strategyCompound.supportedTokens(_token) returns (bool supported) {
            if (!supported) return false;
            
            IERC20(_token).safeIncreaseAllowance(address(strategyCompound), _amount);
            
            try strategyCompound.deposit(_token, _amount) {
                return true;
            } catch {
                // Reset approval on failure
                IERC20(_token).safeDecreaseAllowance(address(strategyCompound), _amount);
                return false;
            }
        } catch {
            return false;
        }
    }

    /**
     * @notice Withdraws tokens from strategies and returns them to the vault
     * @dev Implements intelligent withdrawal logic with failure handling that can source funds from multiple
     *      strategies if needed. Prioritizes the assigned strategy but falls back to other strategies for
     *      liquidity optimization. Includes strategy failure isolation to prevent total withdrawal failure.
     * 
     * @param _token Address of the token to withdraw
     * @param _amount Amount of tokens to withdraw
     * 
     * Requirements:
     * - Can only be called by the vault contract
     * - Token must be supported by the coordinator
     * - Amount must be greater than 0
     * - At least some liquidity must be available across strategies
     * 
     * Effects:
     * - Attempts withdrawal from assigned strategy first
     * - Falls back to other strategies if needed or if primary fails
     * - Transfers available tokens to vault (may be partial if insufficient liquidity)
     * - Emits Withdrawal event with actual amount withdrawn
     * 
     * Security:
     * - Protected by onlyVault modifier
     * - Protected by nonReentrant modifier
     * - Strategy failure isolation prevents total system failure
     * - Validates token support and amount
     * 
     * Failure Handling:
     * - Individual strategy failures don't block entire withdrawal
     * - Partial withdrawals supported when full amount unavailable
     * - Graceful degradation when strategies are paused or failing
     */
    function withdraw(address _token, uint256 _amount) external onlyVault nonReentrant {
        if (!supportedTokens[_token]) revert Errors.UnsupportedToken();
        if (_amount == 0) revert Errors.InvalidAmount();

        StrategyType strategyType = tokenToStrategy[_token];
        uint256 totalWithdrawn = 0;
        
        // Attempt withdrawal from primary strategy with failure handling
        if (strategyType == StrategyType.AAVE) {
            totalWithdrawn += _attemptWithdrawalFromAave(_token, _amount);
            
            // If we still need more tokens, try Compound strategy
            if (totalWithdrawn < _amount) {
                uint256 remaining = _amount - totalWithdrawn;
                totalWithdrawn += _attemptWithdrawalFromCompound(_token, remaining);
            }
        } else if (strategyType == StrategyType.COMPOUND) {
            totalWithdrawn += _attemptWithdrawalFromCompound(_token, _amount);
            
            // If we still need more tokens, try Aave strategy
            if (totalWithdrawn < _amount) {
                uint256 remaining = _amount - totalWithdrawn;
                totalWithdrawn += _attemptWithdrawalFromAave(_token, remaining);
            }
        }

        // Transfer whatever we managed to withdraw to vault
        if (totalWithdrawn > 0) {
            IERC20(_token).safeTransfer(vault, totalWithdrawn);
        }

        // Revert if we couldn't withdraw anything at all
        if (totalWithdrawn <= 0) {
            revert Errors.WithdrawalFailed();
        }

        emit Withdrawal(_token, totalWithdrawn, strategyType);
    }

    /**
     * @notice Attempts to withdraw tokens from Aave strategy with failure handling
     * @dev Internal function that safely attempts withdrawal from Aave strategy
     * 
     * @param _token Address of the token to withdraw
     * @param _amount Amount of tokens to attempt to withdraw
     * @return actualWithdrawn Amount actually withdrawn (0 if failed)
     */
    function _attemptWithdrawalFromAave(address _token, uint256 _amount) internal returns (uint256 actualWithdrawn) {
        try strategyAave.balanceOf(_token) returns (uint256 aaveBalance) {
            if (aaveBalance <= 0) return 0;
            
            uint256 withdrawAmount = aaveBalance >= _amount ? _amount : aaveBalance;
            
            try strategyAave.withdraw(_token, withdrawAmount) {
                return withdrawAmount;
            } catch {
                // Strategy withdrawal failed, return 0
                return 0;
            }
        } catch {
            // Balance check failed, strategy likely paused or failing
            return 0;
        }
    }

    /**
     * @notice Attempts to withdraw tokens from Compound strategy with failure handling
     * @dev Internal function that safely attempts withdrawal from Compound strategy
     * 
     * @param _token Address of the token to withdraw
     * @param _amount Amount of tokens to attempt to withdraw
     * @return actualWithdrawn Amount actually withdrawn (0 if failed)
     */
    function _attemptWithdrawalFromCompound(address _token, uint256 _amount) internal returns (uint256 actualWithdrawn) {
        try strategyCompound.balanceOf(_token) returns (uint256 compoundBalance) {
            if (compoundBalance <= 0) return 0;
            
            uint256 withdrawAmount = compoundBalance >= _amount ? _amount : compoundBalance;
            
            try strategyCompound.withdraw(_token, withdrawAmount) {
                return withdrawAmount;
            } catch {
                // Strategy withdrawal failed, return 0
                return 0;
            }
        } catch {
            // Balance check failed, strategy likely paused or failing
            return 0;
        }
    }

    /**
     * @notice Returns the balance of a token in its assigned strategy
     * @dev Queries the assigned strategy for the current balance of the specified token
     * 
     * @param _token Address of the token to check balance for
     * @return Current balance of the token in its assigned strategy
     * 
     * Returns:
     * - 0 if token is not supported
     * - Current balance from the assigned strategy
     */
    function getStrategyBalance(address _token) public view returns (uint256) {
        if (!supportedTokens[_token]) return 0;

        StrategyType strategyType = tokenToStrategy[_token];
        
        if (strategyType == StrategyType.AAVE) {
            return strategyAave.balanceOf(_token);
        } else if (strategyType == StrategyType.COMPOUND) {
            return strategyCompound.balanceOf(_token);
        }
        
        return 0;
    }

    /**
     * @notice Returns the total balance of a token across all strategies
     * @dev Used by the vault for share calculations and total value tracking.
     *      Aggregates balances from all strategies that support the token.
     * 
     * @param _token Address of the token to check total balance for
     * @return Total balance of the token across all strategies
     * 
     * Use Cases:
     * - Vault share minting calculations
     * - Total value locked (TVL) reporting
     * - Withdrawal feasibility checks
     */
    function getTotalTokenBalance(address _token) external view returns (uint256) {
        uint256 total = 0;
        if (strategyAave.isTokenSupported(_token)) {
            total += strategyAave.balanceOf(_token);
        }
        if (strategyCompound.supportedTokens(_token)) {
            total += strategyCompound.balanceOf(_token);
        }

        return total;
    }

    /**
     * @notice Gets the total USD value of all tokens across all strategies
     * @dev Uses PriceFeedManager to calculate USD values
     * @param _priceFeedManager Address of the PriceFeedManager contract
     * @param _supportedTokens Array of token addresses to check
     * @return totalUsdValue Total USD value with 18 decimals
     */
    function getTotalUsdValue(address _priceFeedManager, address[] memory _supportedTokens) external view returns (uint256 totalUsdValue) {
        IPriceFeedManager priceFeedManager = IPriceFeedManager(_priceFeedManager);
        
        for (uint256 i = 0; i < _supportedTokens.length; i++) {
            address token = _supportedTokens[i];
            if (priceFeedManager.hasPriceFeed(token)) {
                uint256 tokenBalance = this.getTotalTokenBalance(token);
                if (tokenBalance > 0) {
                    totalUsdValue += priceFeedManager.getTokenValueInUSD(token, tokenBalance);
                }
            }
        }
        
        return totalUsdValue;
    }

    /**
     * @notice Gets all supported tokens that have been configured
     * @dev Returns tokens that have been assigned to strategies via setStrategyForToken
     * @return Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }

    /**
     * @notice Emergency function to withdraw all tokens of a specific type
     * @dev Withdraws all tokens from the assigned strategy and sends them to the vault.
     *      Should only be used in emergency situations or for maintenance.
     * 
     * @param _token Address of the token to emergency withdraw
     * 
     * Requirements:
     * - Can only be called by the contract owner
     * - Token must have an assigned strategy
     * 
     * Effects:
     * - Withdraws entire balance from assigned strategy
     * - Transfers all tokens to vault
     * - Does not emit standard Withdrawal event (emergency context)
     * 
     * Security:
     * - Owner-only access control
     * - Should be used sparingly and only in emergencies
     * 
     * @dev This function bypasses normal withdrawal logic and should be used
     *      only when normal operations are not possible or safe.
     */
    function emergencyWithdraw(address _token) external onlyOwner nonReentrant {
        StrategyType strategyType = tokenToStrategy[_token];
        
        if (strategyType == StrategyType.AAVE) {
            uint256 balance = strategyAave.balanceOf(_token);
            strategyAave.withdraw(_token, balance);
        } else if (strategyType == StrategyType.COMPOUND) {
            uint256 balance = strategyCompound.balanceOf(_token);
            strategyCompound.withdraw(_token, balance);
        }
        
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        if (tokenBalance > 0) {
            IERC20(_token).safeTransfer(vault, tokenBalance);
        }
    }

    /**
     * @notice Emergency bypass function for direct strategy withdrawal
     * @dev Allows vault to withdraw directly from a specific strategy, bypassing coordinator logic.
     *      This is used when the coordinator's normal withdrawal logic fails or during emergencies.
     * 
     * @param _token Address of the token to withdraw
     * @param _amount Amount of tokens to withdraw
     * @param _strategyType Specific strategy to withdraw from (AAVE or COMPOUND)
     * 
     * Requirements:
     * - Can only be called by the vault contract
     * - Strategy must support the token
     * - Amount must be greater than 0
     * 
     * Effects:
     * - Withdraws tokens directly from specified strategy
     * - Transfers tokens to vault
     * - Bypasses normal coordinator withdrawal logic
     * 
     * Security:
     * - Vault-only access control
     * - Should be used when normal withdraw() function fails
     * 
     * @dev This function provides a fallback mechanism when the coordinator's
     *      intelligent withdrawal logic encounters failures across strategies.
     */
    function emergencyWithdrawFromStrategy(
        address _token, 
        uint256 _amount, 
        StrategyType _strategyType
    ) external onlyVault nonReentrant {
        if (_amount == 0) revert Errors.InvalidAmount();
        
        uint256 actualWithdrawn = 0;
        
        if (_strategyType == StrategyType.AAVE) {
            actualWithdrawn = _attemptWithdrawalFromAave(_token, _amount);
        } else if (_strategyType == StrategyType.COMPOUND) {
            actualWithdrawn = _attemptWithdrawalFromCompound(_token, _amount);
        }
        
        if (actualWithdrawn > 0) {
            IERC20(_token).safeTransfer(vault, actualWithdrawn);
        }
        
        // Don't revert if nothing withdrawn - let vault handle the response
        emit Withdrawal(_token, actualWithdrawn, _strategyType);
    }

    /**
     * @notice Returns the current APY for a token in its assigned strategy
     * @dev Delegates to the appropriate strategy contract to get real-time APY data
     * 
     * @param _token Address of the token to get APY for
     * @return apy Current annual percentage yield in basis points (e.g., 500 = 5.00%)
     */
    function getStrategyAPY(address _token) external view returns (uint256 apy) {
        if (!supportedTokens[_token]) return 0;
        
        StrategyType strategyType = tokenToStrategy[_token];
        
        if (strategyType == StrategyType.AAVE) {
            return strategyAave.getCurrentAPY(_token);
        } else if (strategyType == StrategyType.COMPOUND) {
            return strategyCompound.getCurrentAPY(_token);
        }
        
        return 0;
    }

    /**
     * @notice Checks if a strategy is currently available and operational
     * @dev Tests strategy availability by checking if it's paused and can respond to balance queries
     * 
     * @param _strategyType Strategy type to check (AAVE or COMPOUND)
     * @param _token Token to test strategy availability with
     * @return available True if strategy is available and operational
     */
    function isStrategyAvailable(StrategyType _strategyType, address _token) external view returns (bool available) {
        if (_strategyType == StrategyType.AAVE) {
            try strategyAave.paused() returns (bool paused) {
                if (paused) return false;
                
                try strategyAave.isTokenSupported(_token) returns (bool supported) {
                    return supported;
                } catch {
                    return false;
                }
            } catch {
                return false;
            }
        } else if (_strategyType == StrategyType.COMPOUND) {
            try strategyCompound.paused() returns (bool paused) {
                if (paused) return false;
                
                try strategyCompound.supportedTokens(_token) returns (bool supported) {
                    return supported;
                } catch {
                    return false;
                }
            } catch {
                return false;
            }
        }
        
        return false;
    }

    /**
     * @notice Gets available liquidity across all strategies for a token
     * @dev Returns total available liquidity that can be withdrawn, useful for withdrawal planning
     * 
     * @param _token Address of the token to check liquidity for
     * @return totalLiquidity Total available liquidity across all strategies
     * @return aaveLiquidity Available liquidity in Aave strategy
     * @return compoundLiquidity Available liquidity in Compound strategy
     */
    function getAvailableLiquidity(address _token) external view returns (
        uint256 totalLiquidity,
        uint256 aaveLiquidity,
        uint256 compoundLiquidity
    ) {
        // Check Aave liquidity
        try strategyAave.balanceOf(_token) returns (uint256 aaveBalance) {
            if (!strategyAave.paused()) {
                aaveLiquidity = aaveBalance;
            }
        } catch {
            aaveLiquidity = 0;
        }
        
        // Check Compound liquidity
        try strategyCompound.balanceOf(_token) returns (uint256 compoundBalance) {
            if (!strategyCompound.paused()) {
                compoundLiquidity = compoundBalance;
            }
        } catch {
            compoundLiquidity = 0;
        }
        
        totalLiquidity = aaveLiquidity + compoundLiquidity;
        
        return (totalLiquidity, aaveLiquidity, compoundLiquidity);
    }
}
