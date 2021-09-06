// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface ISettlementsLegacy {
    function tokenURI(uint256 tokenId) external view returns (string memory);

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external view returns (string memory);
}
