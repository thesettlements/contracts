// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ERC20Mintable.sol";
import "base64-sol/base64.sol";
import "./Ships.sol";
import "./SettlementsV2.sol";
import "./Islands.sol";
import "hardhat/console.sol";

contract ShipsHelper is Ownable {
    uint256 constant ONE = 10**18;

    Ships public shipsContract;

    uint8[] public climateMultipliers;
    uint8[] public terrainMultipliers;

    uint256[] public nameToMaxRouteLength = [2, 3, 4, 5, 6];
    SettlementsV2 public settlementsContract;
    Islands public islandsContract;

    enum Status {
        Resting,
        Sailing,
        Harvesting
    }

    function setShipsContract(Ships shipsContract_) public {
        shipsContract = shipsContract_;
    }

    function setSettlementsContract(SettlementsV2 settlementsContract_) public {
        settlementsContract = settlementsContract_;
    }

    function setIslandsContract(Islands islandsContract_) public {
        islandsContract = islandsContract_;
    }

    function addMaxRouteLength(uint256 maxRouteLength) public onlyOwner {
        nameToMaxRouteLength.push(maxRouteLength);
    }

    // breh the level of modulo math in the next few functions is insane nocap

    function getStatus(uint256 tokenId) public view returns (Status) {
        Ships.Ship memory shipInfo = shipsContract.getShipInfo(tokenId);

        uint256 lastRouteUpdate = shipsContract.tokenIdToLastRouteUpdate(tokenId);
        uint256 blockDelta = block.number - lastRouteUpdate;

        // uint256 sailingDuration = (15 * 300) / shipInfo.speed;
        // uint256 harvestDuration = 120;

        uint256 sailingDuration = 3;
        uint256 harvestDuration = 5;

        uint256 progressIntoCurrentPath = blockDelta % (sailingDuration + harvestDuration);
        uint256 currentTargetIndex = getCurrentTargetIndex(tokenId);
        Status status = progressIntoCurrentPath >= sailingDuration
            ? currentTargetIndex == 0 ? Status.Resting : Status.Harvesting
            : Status.Sailing;

        return status;
    }

    function getCurrentTargetIndex(uint256 tokenId) public view returns (uint256) {
        Ships.Ship memory shipInfo = shipsContract.getShipInfo(tokenId);

        uint256 lastRouteUpdate = shipsContract.tokenIdToLastRouteUpdate(tokenId);
        uint256 blockDelta = block.number - lastRouteUpdate;

        uint256 sailingDuration = 3;
        uint256 harvestDuration = 5;

        uint256 singlePathDuration = sailingDuration + harvestDuration;

        uint256 index = (blockDelta % (singlePathDuration * shipInfo.route.length)) /
            singlePathDuration;
        uint256 currentTargetIndex = (index + 1) % shipInfo.route.length;

        return currentTargetIndex;
    }

    function getCurrentTarget(uint256 tokenId) public view returns (Ships.Path memory) {
        uint256 currentTargetIndex = getCurrentTargetIndex(tokenId);
        Ships.Ship memory shipInfo = shipsContract.getShipInfo(tokenId);
        return shipInfo.route[currentTargetIndex];
    }

    function getBlocksUntilNextPhase(uint256 tokenId) public view returns (uint256) {
        uint256 lastRouteUpdate = shipsContract.tokenIdToLastRouteUpdate(tokenId);
        uint256 blockDelta = block.number - lastRouteUpdate;

        uint256 sailingDuration = 3;
        uint256 harvestDuration = 5;

        uint256 singlePathDuration = sailingDuration + harvestDuration;
        uint256 progressIntoCurrentPath = blockDelta % singlePathDuration;

        uint256 blocksUntilNextPhase = progressIntoCurrentPath < sailingDuration
            ? sailingDuration - progressIntoCurrentPath
            : singlePathDuration - progressIntoCurrentPath;

        return blocksUntilNextPhase;
    }

    function getInitialRoute(uint256 tokenId, uint8 name)
        public
        view
        returns (Ships.Path[] memory)
    {
        uint256 routeLength = nameToMaxRouteLength[name];
        Ships.Path[] memory routes = new Ships.Path[](routeLength);

        uint256 settlementId = getRandomNumber(abi.encodePacked("s", tokenId), 10_000);
        routes[0] = Ships.Path({
            tokenId: settlementId,
            tokenContract: address(settlementsContract)
        });

        for (uint256 i = 1; i < routes.length; i++) {
            uint256 islandId = getRandomNumber(abi.encodePacked(i, tokenId), 10_000);
            routes[i] = Ships.Path({tokenId: islandId, tokenContract: address(islandsContract)});
        }

        return routes;
    }

    function getRandomNumber(bytes memory seed, uint256 maxValue) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(seed))) % maxValue;
    }

    function isValidRoute(Ships.Path[] memory route, uint256 tokenId) public view returns (bool) {
        return true;
    }

    function getImageOutput(Ships.Ship memory shipInfo) public view returns (string memory) {
        string memory imageOutput = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.txt { fill: black; font-family: monospace; font-size: 12px;}</style><rect width="100%" height="100%" fill="white" /><text x="10" y="20" class="txt">',
                shipInfo.name,
                '</text><text x="10" y="40" class="txt">',
                shipInfo.profession,
                '</text><text x="10" y="60" class="txt">',
                string(abi.encodePacked(Strings.toString(uint256(shipInfo.length)), " ft")),
                '</text><text x="10" y="80" class="txt">',
                string(abi.encodePacked(Strings.toString(uint256(shipInfo.speed)), " km/h")),
                '</text><text x="10" y="100" class="txt">'
            )
        );

        string memory routeStr = "";
        for (uint256 i = 0; i < shipInfo.route.length; i++) {
            string memory symbol = shipInfo.route[i].tokenContract == address(settlementsContract)
                ? "S"
                : "I";

            string memory suffix = i == shipInfo.route.length - 1 ? "" : ",";

            routeStr = string(
                abi.encodePacked(
                    routeStr,
                    " ",
                    symbol,
                    Strings.toString(shipInfo.route[i].tokenId),
                    suffix
                )
            );
        }

        Status shipStatus = getStatus(shipInfo.tokenId);
        Ships.Path memory currentTarget = getCurrentTarget(shipInfo.tokenId);

        imageOutput = string(
            abi.encodePacked(
                imageOutput,
                "------------",
                '</text><text x="10" y="120" class="txt">',
                "Status: ",
                shipStatus == Status.Harvesting ? "Harvesting " : shipStatus == Status.Resting
                    ? "Resting at "
                    : "Sailing to ",
                currentTarget.tokenContract == address(settlementsContract) ? "S" : "I",
                Strings.toString(currentTarget.tokenId),
                '</text><text x="10" y="140" class="txt">',
                abi.encodePacked(
                    "ETA: ",
                    Strings.toString(getBlocksUntilNextPhase(shipInfo.tokenId)),
                    " blocks"
                ),
                '</text><text x="10" y="160" class="txt">',
                "Route: ",
                routeStr,
                '</text><text x="10" y="180" class="txt">',
                "------------",
                '</text><text x="10" y="200" class="txt">',
                "0.29 $WOOL, 5098.12 $GOLD, 0.87 $SETL",
                "</text></svg>"
            )
        );

        return imageOutput;
    }

    function getAttrOutput(Ships.Ship memory shipInfo) public view returns (string memory) {
        string memory routeStr = "";
        for (uint256 i = 0; i < shipInfo.route.length; i++) {
            string memory symbol = shipInfo.route[i].tokenContract == address(settlementsContract)
                ? "S"
                : "I";

            string memory suffix = i == shipInfo.route.length - 1 ? "" : ",";

            routeStr = string(
                abi.encodePacked(
                    routeStr,
                    '"',
                    symbol,
                    Strings.toString(shipInfo.route[i].tokenId),
                    '"',
                    suffix
                )
            );
        }

        string memory attrOutput = string(
            abi.encodePacked(
                '[{ "trait_type": "Name", "value": "',
                shipInfo.name,
                '" }, { "trait_type": "Profession", "value": "',
                shipInfo.profession,
                '" }, { "trait_type": "Length (ft)", "display_type": "number", "value": "',
                Strings.toString(uint256(shipInfo.length)),
                '" }, { "trait_type": "Speed (km/h)", "display_type": "number", "value": "',
                Strings.toString(uint256(shipInfo.speed)),
                '" }, { "trait_type": "Trade Route", "value": [',
                routeStr,
                "]"
            )
        );

        attrOutput = string(abi.encodePacked(attrOutput, " }]"));

        return attrOutput;
    }

    // function getTaxIncome(uint256 tokenId) public view returns (ERC20Mintable, uint256) {
    //     Ships.Attributes memory islandInfo = shipsContract.getTokenIdToAttributes(tokenId);
    //     ERC20Mintable resourceTokenContract = shipsContract.resourcesToTokenContracts(
    //         islandInfo.resource
    //     );

    //     uint256 lastHarvest = shipsContract.tokenIdToLastHarvest(tokenId);
    //     uint256 blockDelta = block.number - lastHarvest;

    //     uint256 tokenAmount = (blockDelta *
    //         climateMultipliers[islandInfo.climate] *
    //         terrainMultipliers[islandInfo.terrain] *
    //         islandInfo.taxRate *
    //         islandInfo.population *
    //         ONE) / 5_000_000_000;

    //     return (resourceTokenContract, tokenAmount);
    // }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        Ships.Ship memory shipInfo = shipsContract.getShipInfo(tokenId);

        string memory imageOutput = getImageOutput(shipInfo);
        string memory attrOutput = getAttrOutput(shipInfo);

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Ship #',
                        Strings.toString(tokenId),
                        '", "description": "Ships can sail around the Settlements world to trade, discover and attack. All data is onchain.", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(imageOutput)),
                        '", "attributes": ',
                        attrOutput,
                        "}"
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}
