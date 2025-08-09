// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import { Errors } from "./libraries/Errors.sol";

/**
 * @title PriceFeedManager
 * @notice Simple price feed manager for USDC and WETH using Chainlink
 */
contract PriceFeedManager is Ownable {
    
    mapping(address => AggregatorV3Interface) public priceFeeds;
    mapping(address => uint8) public tokenDecimals;

    event PriceFeedUpdated(address indexed token, address indexed priceFeed, uint8 decimals);

    constructor() Ownable(msg.sender) {}

    function setPriceFeed(address _token, address _priceFeed, uint8 _decimals) external onlyOwner {
        if (_token == address(0) || _priceFeed == address(0)) revert Errors.InvalidAddress();
        
        priceFeeds[_token] = AggregatorV3Interface(_priceFeed);
        tokenDecimals[_token] = _decimals;
        
        emit PriceFeedUpdated(_token, _priceFeed, _decimals);
    }

    function getTokenPrice(address _token) public view returns (uint256 price) {
        AggregatorV3Interface priceFeed = priceFeeds[_token];
        if (address(priceFeed) == address(0)) revert Errors.PriceFeedNotFound();

        (, int256 answer, , uint256 updatedAt, ) = priceFeed.latestRoundData();

        if (answer <= 0) revert Errors.InvalidPrice();
        if (updatedAt == 0 || block.timestamp - updatedAt > 24 hours) {
            revert Errors.StalePrice();
        }

        return uint256(answer);
    }

    function getTokenValueInUSD(address _token, uint256 _amount) external view returns (uint256 usdValue) {
        uint256 price = getTokenPrice(_token); // Price with 8 decimals
        uint8 decimals = tokenDecimals[_token];
        
        // Convert to USD with 18 decimal places
        usdValue = (_amount * price * 1e10) / (10 ** decimals);
        
        return usdValue;
    }

    function hasPriceFeed(address _token) external view returns (bool) {
        return address(priceFeeds[_token]) != address(0);
    }
}
