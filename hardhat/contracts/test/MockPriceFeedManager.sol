// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockPriceFeedManager {
    mapping(address => uint256) public mockPrices;
    mapping(address => uint8) public tokenDecimals;
    
    function setPriceFeed(address _token, address, uint8 _decimals) external {
        tokenDecimals[_token] = _decimals;
    }
    
    function setPythPriceId(address, bytes32) external {}
    
    function setMockPrice(address _token, uint256 _price) external {
        mockPrices[_token] = _price;
    }
    
    function getTokenPrice(address _token) external view returns (uint256) {
        uint256 price = mockPrices[_token];
        require(price > 0, "No mock price set");
        return price;
    }
    
    function getTokenValueInUSD(address _token, uint256 _amount) external view returns (uint256) {
        uint256 price = mockPrices[_token];
        require(price > 0, "No mock price set");
        uint8 decimals = tokenDecimals[_token];
        return (_amount * price * 1e18) / (10 ** (decimals + 8));
    }
    
    function convertUsdToToken(address _token, uint256 _usdValue) external view returns (uint256) {
        uint256 price = mockPrices[_token];
        require(price > 0, "No mock price set");
        uint8 decimals = tokenDecimals[_token];
        return (_usdValue * (10 ** (decimals + 8))) / (price * 1e18);
    }
    
    function hasPriceFeed(address _token) external view returns (bool) {
        return mockPrices[_token] > 0;
    }
}
