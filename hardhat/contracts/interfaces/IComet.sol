// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IComet {
    function supply(address asset, uint amount) external;
    function withdraw(address asset, uint amount) external;
    function balanceOf(address account) external view returns (uint256);
    function baseToken() external view returns (address);
}
