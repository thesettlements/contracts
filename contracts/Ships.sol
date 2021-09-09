// ships can sail to islands and collect resources there
// once you've been away from a settlement for too long you have to sail back
// you can only sail to an island if there is enough population room
// each time you go back to a settlement you have to recharge for 15 blocks
// you can buy a ship for 3000 $WOOD or 10000 $GOLD
// every x blocks of sailing you discover SETL tokens
// When you sail away from an island you send % of the tokens you minted depending on the island's tax rate

// Canoe, Longship, Clipper, Galleon, Man-of-war
// Trader, Explorer, Pirate, Military, Diplomat
// strength multiplier: 1,2,3,8,10
// capacity multiplier: 1,2,3,8,8

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC20Mintable.sol";
import "./ShipsHelper.sol";

// The ships
// Sweet dreams are made of this
// Who am I to disagree
// I travel the world and the seven seas :pepe jamming:
// @author 1929

contract Ships is ERC721, ERC721Enumerable, Ownable {
    struct Attributes {
        uint8 name;
        uint8 profession;
        uint32 length;
        uint32 speed;
    }

    struct Path {
        address tokenContract;
        uint256 tokenId;
    }

    struct Ship {
        uint256 tokenId;
        string name;
        string profession;
        uint32 length;
        uint32 speed;
        Path[] route;
    }

    string[] public names = ["Canoe", "Longship", "Clipper", "Galleon", "Man-of-war"];
    string[] public professions = ["Trader", "Explorer", "Pirate", "Military", "Diplomat"];

    uint32[] public speedMultipliers = [10, 15, 35, 25, 25];
    uint32[] public lengthMultipliers = [10, 20, 20, 50, 60];

    ShipsHelper public helperContract;

    mapping(uint256 => Attributes) public tokenIdToAttributes;
    mapping(uint256 => uint256) public tokenIdToLastHarvest;
    mapping(uint256 => Path[]) public tokenIdToRoute;
    mapping(uint256 => uint256) public tokenIdToLastRouteUpdate;

    constructor() ERC721("Ships", "SHIP") {}

    function mint(uint256 tokenId) public {
        require(!_exists(tokenId), "Ship with that id already exists");
        require(tokenId <= 3000, "Ship id is invalid");

        Attributes memory attr;

        uint256 value = getRandomNumber(abi.encode(tokenId, "n", block.timestamp), 1000);
        attr.name = uint8(value < 900 ? value % 3 : value < 950 ? value % 4 : value % 5);

        value = getRandomNumber(abi.encode(tokenId, "c", block.timestamp), 1000);
        attr.profession = uint8(value % 5);

        value = getRandomNumber(abi.encode(tokenId, "l", block.timestamp), 50);
        attr.length = uint32((value + 1) * uint256(lengthMultipliers[attr.name])) / 10 + 1;

        value = getRandomNumber(abi.encode(tokenId, "s", block.timestamp), 100);
        attr.speed = uint32((value + 1) * uint256(speedMultipliers[attr.name])) / 100 + 1;

        tokenIdToAttributes[tokenId] = attr;
        tokenIdToLastHarvest[tokenId] = block.number;

        _updateRoute(helperContract.getInitialRoute(tokenId, attr.name), tokenId);
        tokenIdToLastRouteUpdate[tokenId] = block.number;

        _safeMint(msg.sender, tokenId);
    }

    function getShipInfo(uint256 tokenId) public view returns (Ship memory) {
        require(_exists(tokenId), "Island with that tokenId doesn't exist");

        Attributes memory attr = tokenIdToAttributes[tokenId];

        return
            Ship({
                tokenId: tokenId,
                name: names[attr.name],
                profession: professions[attr.profession],
                length: attr.length,
                speed: attr.speed,
                route: tokenIdToRoute[tokenId]
            });
    }

    function updateRoute(Path[] memory route, uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        _updateRoute(route, tokenId);
    }

    function _updateRoute(Path[] memory route, uint256 tokenId) internal {
        require(helperContract.isValidRoute(route, tokenId), "Invalid route");

        delete tokenIdToRoute[tokenId];
        for (uint256 i = 0; i < route.length; i++) {
            tokenIdToRoute[tokenId].push(route[i]);
        }

        tokenIdToLastRouteUpdate[tokenId] = block.number;
    }

    function setHelperContract(ShipsHelper helperContract_) public {
        helperContract = helperContract_;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return helperContract.tokenURI(tokenId);
    }

    function getTokenIdToAttributes(uint256 tokenId) public view returns (Attributes memory) {
        return tokenIdToAttributes[tokenId];
    }

    function getRandomNumber(bytes memory seed, uint256 maxValue) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(seed))) % maxValue;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
