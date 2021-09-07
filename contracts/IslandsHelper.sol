// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Islands.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ERC20Mintable.sol";
import "base64-sol/base64.sol";

contract IslandsHelper is Ownable {
    Islands public islandContract;

    function setIslandsContract(Islands islandContract_) public {
        islandContract = islandContract_;
    }

    function getImageOutput(Islands.Island memory islandInfo) public view returns (string memory) {
        string memory imageOutput = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.txt { fill: black; font-family: monospace; font-size: 12px;}</style><rect width="100%" height="100%" fill="white" /><text x="10" y="20" class="txt">',
                islandInfo.climate,
                '</text><text x="10" y="40" class="txt">',
                islandInfo.terrain,
                '</text><text x="10" y="60" class="txt">',
                islandInfo.resource,
                '</text><text x="10" y="80" class="txt">',
                string(abi.encodePacked(Strings.toString(islandInfo.area), " sq mi")),
                '</text><text x="10" y="100" class="txt">'
            )
        );

        (ERC20Mintable resourceTokenContract, uint256 taxIncome) = getTaxIncome(islandInfo.tokenId);

        imageOutput = string(
            abi.encodePacked(
                imageOutput,
                string(
                    abi.encodePacked(
                        "Pop. ",
                        Strings.toString(islandInfo.basePopulation),
                        "/",
                        Strings.toString(islandInfo.maxPopulation)
                    )
                ),
                '</text><text x="10" y="120" class="txt">',
                string(abi.encodePacked("Base Pop. ", Strings.toString(islandInfo.basePopulation))),
                '</text><text x="10" y="140" class="txt">',
                "------------",
                '</text><text x="10" y="160" class="txt">',
                string(abi.encodePacked("Tax Rate: ", Strings.toString(islandInfo.taxRate), "%")),
                '</text><text x="10" y="180" class="txt">',
                string(
                    abi.encodePacked(
                        "Tax Income: ",
                        Strings.toString(taxIncome / 10**18),
                        " $",
                        resourceTokenContract.symbol()
                    )
                ),
                '</text><text x="10" y="200" class="txt">',
                "</text></svg>"
            )
        );

        return imageOutput;
    }

    function getAttrOutput(Islands.Island memory islandInfo) public view returns (memory string) {
        return "hello";
    }

    function getTaxIncome(uint256 tokenId) public view returns (ERC20Mintable, uint256) {
        Islands.Island memory islandInfo = islandContract.getIslandInfo(tokenId);
        return (islandInfo.resourceTokenContract, 500 * 10**18);
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        Islands.Island memory islandInfo = islandContract.getIslandInfo(tokenId);

        string memory imageOutput = getImageOutput(islandInfo);
        string memory attrOutput = getAttrOutput(islandInfo);

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Settlement #',
                        Strings.toString(tokenId),
                        '", "description": "Settlements are a turn based civilisation simulator stored entirely on chain, go forth and conquer.", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(imageOutput)),
                        '", "attributes":',
                        attrOutput,
                        "}"
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}
